'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ArrowLeft, Plus, Trash, Timer, PencilSimple, Trophy } from '@phosphor-icons/react'
import { useAuth } from '@/components/auth-provider'
import { RestTimer } from '@/components/rest-timer'
import { supabase } from '@/lib/supabase'
import { errorMessage, type Session, type SessionExercise, type WorkoutSet, type Exercise } from '@/lib/data'
import { sessionDurationMinutes,sessionSummary,setVolume } from '@/lib/metrics'
import { displayValue,storageValue,unitLabel,type Units } from '@/lib/units'
import { useUnits } from '@/hooks/use-units'
import { cacheOfflineWorkout } from '@/lib/offline-workout'
import { PENDING_SETS_CHANGE, PENDING_SETS_KEY, mergePendingSets, queuePendingSet, readPendingSets, removePendingSet, syncPendingSets, type PendingSet } from '@/lib/pending-sets'

type Previous = Record<string, WorkoutSet[]>

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const units = useUnits()
  const [session, setSession] = useState<Session | null>(null)
  const [items, setItems] = useState<SessionExercise[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [previous, setPrevious] = useState<Previous>({})
  const [historicalBests, setHistoricalBests] = useState<Record<string,number>>({})
  const [timer, setTimer] = useState<number | null>(null)
  const [timerRun, setTimerRun] = useState(0)
  const [notifyRest, setNotifyRest] = useState(false)
  const [error, setError] = useState('')
  const [syncError, setSyncError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<PendingSet[]>([])
  const [online, setOnline] = useState(true)

  const load = useCallback(async () => {
    try {
      const client = supabase()
      const [sessionResult, exerciseResult, catalogResult] = await Promise.all([
        client.from('workout_sessions').select('id,workout_day_id,started_at,completed_at,status,notes,workout_days(name)').eq('id', id).single(),
        client.from('session_exercises').select('id,session_id,exercise_id,sort_order,target_sets,min_reps,max_reps,rest_seconds,notes,skipped,exercises(id,name),workout_sets(id,session_exercise_id,set_number,weight_kg,reps,rir,completed,completed_at)').eq('session_id', id).order('sort_order'),
        client.from('exercises').select('id,name').order('name'),
      ])
      if (sessionResult.error) throw sessionResult.error
      if (exerciseResult.error) throw exerciseResult.error
      if (catalogResult.error) throw catalogResult.error
      const nextItems = (exerciseResult.data ?? []) as unknown as SessionExercise[]
      nextItems.forEach(item => item.workout_sets.sort((a, b) => a.set_number - b.set_number))
      const nextSession = sessionResult.data as unknown as Session
      setSession(nextSession)
      setItems(nextItems)
      setExercises(catalogResult.data ?? [])
      const { data: history, error: historyError } = await client.rpc('forge_previous_sets', { p_session_id: id })
      if (historyError) throw historyError
      const map: Previous = {}
      const bests: Record<string,number> = {}
      for (const row of history ?? []) {
        if (!map[row.exercise_id]) map[row.exercise_id] = []
        map[row.exercise_id].push({ id: `previous-${row.exercise_id}-${row.set_number}`, session_exercise_id: '', set_number: row.set_number, weight_kg: row.weight_kg, reps: row.reps, rir: row.rir, completed: true, completed_at: null })
        bests[row.exercise_id] = Number(row.best_volume_kg)
      }
      setPrevious(map)
      setHistoricalBests(bests)
    } catch (caught) { setError(errorMessage(caught)) } finally { setLoading(false) }
  }, [id])
  useEffect(() => { if (user) queueMicrotask(() => { void load() }) }, [user, load])
  useEffect(() => { const update = () => setOnline(navigator.onLine); update(); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) } }, [])
  useEffect(() => { if (!user) return; let live = true; void supabase().from('profiles').select('timer_notifications').eq('user_id', user.id).maybeSingle().then(({ data, error:profileError }) => { if (!live) return; if (profileError) setError(profileError.message); else setNotifyRest(data?.timer_notifications ?? false) }); return () => { live = false } }, [user])
  useEffect(() => {
    if (!user) return
    const refresh = (event?: Event) => {
      if (event instanceof StorageEvent && event.key !== PENDING_SETS_KEY) return
      setPending(readPendingSets(user.id))
      if (event instanceof CustomEvent && event.detail?.synced) { setSyncError(''); void load() }
    }
    refresh()
    window.addEventListener(PENDING_SETS_CHANGE, refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(PENDING_SETS_CHANGE, refresh); window.removeEventListener('storage', refresh) }
  }, [user, load])
  const displayItems = useMemo(() => mergePendingSets(items, pending), [items, pending])
  const sessionPending = pending.filter(set => set.sessionId === id)
  useEffect(() => { if (user && session) cacheOfflineWorkout(user.id, session, displayItems, units) }, [user, session, displayItems, units])

  async function saveSet(item: SessionExercise, setNumber: number, weight: string, reps: string, rir: string): Promise<boolean> {
    if (!user) return false
    setBusy(true); setError(''); setSyncError('')
    try {
      const w = storageValue(Number(weight),'weight',units), r = Number(reps), reserve = rir === '' ? null : Number(rir)
      if (!Number.isFinite(w) || w < 0 || w > 99999.99 || !Number.isInteger(r) || r < 0 || !Number.isInteger(setNumber) || setNumber < 1 || setNumber > 50 || (reserve !== null && (!Number.isFinite(reserve) || reserve < 0 || reserve > 10 || Math.round(reserve * 10) !== reserve * 10))) throw new Error('Enter a valid weight, whole number of reps, set number up to 50, and RIR from 0 to 10.')
      const queued = queuePendingSet({ userId: user.id, sessionId: id, sessionExerciseId: item.id, setNumber, weightKg: w, reps: r, rir: reserve, completedAt: new Date().toISOString() })
      if (!queued) throw new Error('This set could not be saved on this device. Check browser storage and try again.')
      setPending(readPendingSets(user.id))
      if (item.rest_seconds > 0) { setTimer(item.rest_seconds); setTimerRun(value => value + 1) }
      if (navigator.onLine) {
        void syncPendingSets(user.id).then(result => {
          if (result.error) setSyncError(`Set saved on this device. Sync failed: ${result.error}`)
        }).catch(caught => setSyncError(`Set saved on this device. Sync failed: ${errorMessage(caught)}`))
      }
      return true
    } catch (caught) { setError(errorMessage(caught)); return false } finally { setBusy(false) }
  }
  async function deleteSet(set: WorkoutSet) {
    if (busy) return
    if (set.pending) {
      if (!user || !window.confirm('Discard this unsynced change?')) return
      const row = pending.find(value => `pending:${value.revision}` === set.id)
      if (row && !removePendingSet(user.id, row.sessionExerciseId, row.setNumber, row.revision)) setError('Could not discard this pending set. Check browser storage and try again.')
      setPending(readPendingSets(user.id))
      return
    }
    if (!window.confirm('Delete this set?')) return
    setBusy(true); setError('')
    try {
      const { error } = await supabase().from('workout_sets').delete().eq('id', set.id)
      if (error) throw error
      await load()
    } catch (caught) { setError(`Set could not be deleted: ${errorMessage(caught)}`) }
    finally { setBusy(false) }
  }
  async function skip(item: SessionExercise) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { error } = await supabase().from('session_exercises').update({ skipped: !item.skipped }).eq('id', item.id)
      if (error) throw error
      await load()
    } catch (caught) { setError(`Exercise could not be ${item.skipped ? 'restored' : 'skipped'}: ${errorMessage(caught)}`) }
    finally { setBusy(false) }
  }
  async function substitute(item: SessionExercise, exerciseId: string) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { error } = await supabase().from('session_exercises').update({ exercise_id: exerciseId }).eq('id', item.id)
      if (error) throw error
      await load()
    } catch (caught) { setError(`Exercise could not be replaced: ${errorMessage(caught)}`) }
    finally { setBusy(false) }
  }
  async function saveNotes(notes: string) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { error } = await supabase().from('workout_sessions').update({ notes: notes.trim() || null }).eq('id', id)
      if (error) throw error
      await load()
    } catch (caught) { setError(`Session notes could not be saved: ${errorMessage(caught)}`) }
    finally { setBusy(false) }
  }
  async function finish(status: 'completed' | 'cancelled') {
    if (busy) return
    if (sessionPending.length) { setError('Sync or discard the waiting sets before ending this workout.'); return }
    if (!window.confirm(status === 'completed' ? 'Finish this workout?' : 'Cancel this workout?')) return
    setBusy(true); setError('')
    try {
      const { error } = await supabase().from('workout_sessions').update({ status, completed_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      setTimer(null)
      await load()
      if (status === 'cancelled') router.push('/workouts')
    } catch (caught) { setError(`Workout could not be ${status === 'completed' ? 'finished' : 'cancelled'}: ${errorMessage(caught)}`) }
    finally { setBusy(false) }
  }
  const { exercises:completedExercises,sets:completed,volume,prCount:prs } = sessionSummary(items,historicalBests)
  const duration = session ? sessionDurationMinutes(session.started_at,session.completed_at) : null
  async function retrySync() {
    if (!user || busy) return
    if (!navigator.onLine) { setSyncError('Reconnect before retrying. Your pending sets are saved on this device.'); return }
    setBusy(true); setSyncError('')
    try {
      const result = await syncPendingSets(user.id)
      setPending(readPendingSets(user.id))
      if (result.error) setSyncError(`Still waiting to sync: ${result.error}`)
    } catch (caught) { setSyncError(`Still waiting to sync: ${errorMessage(caught)}`) }
    finally { setBusy(false) }
  }
  return <>
    <Link href="/workouts" className="muted small row" style={{ justifyContent: 'flex-start', marginBottom: 16 }}><ArrowLeft size={16} /> Training</Link>
    <div className="page-head"><div className="eyebrow">{session?.status === 'active' ? 'Session in progress' : session?.status === 'completed' ? 'Session complete' : 'Session'}</div><h1>{session?.workout_days?.name ?? 'Your workout'}</h1><p>{completed} sets logged · {Math.round(displayValue(volume,'weight',units)??0).toLocaleString()} {unitLabel('weight',units)} volume {prs > 0 ? `· ${prs} volume PR${prs > 1 ? 's' : ''}` : ''}</p></div>
    {error && <div className="notice" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
    {syncError && <div className="notice" role="alert" style={{ marginBottom: 16 }}>{syncError}</div>}
    {sessionPending.length > 0 && <div className="notice" role="status" style={{ marginBottom: 16 }}><strong>Waiting to sync.</strong> {sessionPending.length} set{sessionPending.length === 1 ? '' : 's'} saved on this device. Do not clear site data before they upload.<button className="btn small" type="button" disabled={busy || !online} onClick={retrySync} style={{ marginLeft: 12 }}>Retry now</button></div>}
    {loading ? <div className="empty">Loading session…</div> : !session ? <div className="empty">Session not found.</div> : <>
      <div className="stack">{displayItems.map((item, index) => <ExerciseCard key={item.id} item={item} position={index + 1} previous={previous[item.exercise_id] ?? []} bestVolume={historicalBests[item.exercise_id] ?? 0} exercises={exercises} units={units} editable={session.status === 'active'} busy={busy} onSave={saveSet} onDelete={deleteSet} onSkip={skip} onSubstitute={substitute} />)}</div>
      <SessionNotes initial={session.notes ?? ''} editable={session.status === 'active'} busy={busy} onSave={saveNotes} />
      {session.status === 'active' && <div className="row wrap" style={{ marginTop: 24 }}><button className="btn primary" disabled={busy || sessionPending.length > 0} onClick={() => finish('completed')}><Check size={18} /> Finish workout</button><button className="btn danger" disabled={busy || sessionPending.length > 0} onClick={() => finish('cancelled')}>Cancel session</button></div>}
      {session.status === 'completed' && <div className="card strong" style={{ marginTop: 24 }}>
        <h2>Workout complete.</h2>
        <p>{duration === null ? 'Duration unavailable' : `${duration} min`} · {completedExercises} exercises · {completed} sets</p>
        <p>{Math.round(displayValue(volume,'weight',units)??0).toLocaleString()} {unitLabel('weight',units)} volume{prs > 0 ? ` · ${prs} volume PR${prs > 1 ? 's' : ''}` : ''}</p>
        <p className="muted">The next session will show today’s numbers as your previous performance.</p>
        <Link href="/today" className="btn primary">Back to Today</Link>
      </div>}
    </>}
    {timer !== null && <RestTimer key={timerRun} duration={timer} notify={notifyRest} onDismiss={() => setTimer(null)} />}
  </>
}

function SessionNotes({ initial, editable, busy, onSave }: { initial: string; editable: boolean; busy: boolean; onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState(initial)
  return <section className="card" style={{ marginTop: 16 }}><h3>Session notes</h3>{editable ? <><textarea aria-label="Session notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ marginTop: 12 }} placeholder="Energy, form, equipment, or anything to remember…" /><button className="btn small" disabled={busy} style={{ marginTop: 10 }} onClick={() => onSave(notes)}>Save notes</button></> : <p className="muted">{initial || 'No notes recorded.'}</p>}</section>
}

function ExerciseCard({ item, position, previous, bestVolume, exercises, units, editable, busy, onSave, onDelete, onSkip, onSubstitute }: { item: SessionExercise; position: number; previous: WorkoutSet[]; bestVolume: number; exercises: Exercise[]; units:Units; editable: boolean; busy: boolean; onSave: (item: SessionExercise, setNumber: number, weight: string, reps: string, rir: string) => Promise<boolean>; onDelete: (set: WorkoutSet) => void; onSkip: (item: SessionExercise) => void; onSubstitute: (item: SessionExercise, exerciseId: string) => void }) {
  const [weight, setWeight] = useState(''), [reps, setReps] = useState(''), [rir, setRir] = useState('2')
  const [editing, setEditing] = useState<number | null>(null), [showSubstitute, setShowSubstitute] = useState(false)
  const next = Math.max(0, ...item.workout_sets.map(set => set.set_number)) + 1
  const setNumber = editing ?? next
  const last = previous.find(set => set.set_number === setNumber) ?? previous[previous.length - 1]
  const pr = bestVolume > 0 && item.workout_sets.some(set => set.completed && !set.pending && setVolume(set) > bestVolume)
  function edit(set: WorkoutSet) { setEditing(set.set_number); setWeight(String(displayValue(set.weight_kg,'weight',units) ?? '')); setReps(String(set.reps ?? '')); setRir(set.rir === null ? '' : String(set.rir)) }
  async function submit(e: FormEvent) { e.preventDefault(); if (await onSave(item, setNumber, weight, reps, rir)) { setEditing(null); setWeight(''); setReps('') } }
  return <section className="card" style={{ opacity: item.skipped ? .6 : 1 }}>
    <div className="row wrap"><div className="row" style={{ justifyContent: 'flex-start' }}><span className="pill orange">{String(position).padStart(2, '0')}</span><h2>{item.exercises.name}</h2></div>{editable && <button className="btn ghost small" disabled={busy} onClick={() => onSkip(item)}>{item.skipped ? 'Undo skip' : 'Skip'}</button>}</div>
    <div className="row wrap" style={{ justifyContent: 'flex-start', marginTop: 12 }}><span className="pill">{item.target_sets} × {item.min_reps}–{item.max_reps} reps</span><span className="pill"><Timer size={13} /> {Math.round(item.rest_seconds / 60)} min rest</span>{pr && <span className="pill green"><Trophy size={13} /> New volume PR</span>}</div>
    {previous.length > 0 && <p className="muted small">Last time: {previous.map(set => `${displayValue(set.weight_kg,'weight',units)} ${unitLabel('weight',units)} × ${set.reps}`).join(' · ')}</p>}
    <Link href={`/workouts/exercise/${item.exercise_id}`} className="muted small" style={{ display: 'inline-block', marginTop: 8, textDecoration: 'underline', textUnderlineOffset: 3 }}>View exercise history</Link>
    {editable && <><button className="btn ghost small" disabled={busy} style={{ marginTop: 10 }} onClick={() => setShowSubstitute(!showSubstitute)}>{showSubstitute ? 'Close replacement' : 'Replace exercise'}</button>{showSubstitute && <div style={{ marginTop: 10 }}><label htmlFor={`sub-${item.id}`}>Use a different exercise this session</label><select id={`sub-${item.id}`} value={item.exercise_id} disabled={busy} onChange={e => { onSubstitute(item, e.target.value); setShowSubstitute(false) }}>{exercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></div>}</>}
    {item.workout_sets.length > 0 && <div style={{ marginTop: 18 }}>{item.workout_sets.map(set => <div className="item row wrap" key={set.id}><span className="muted small">Set {set.set_number}{set.pending && <span className="pill orange" style={{ marginLeft: 8 }}>Waiting to sync</span>}</span><strong>{displayValue(set.weight_kg,'weight',units)} {unitLabel('weight',units)} × {set.reps} <span className="muted small">· {set.rir ?? '—'} RIR</span></strong>{editable && <div className="row"><button className="btn ghost small" aria-label={`Edit set ${set.set_number}`} disabled={busy} onClick={() => edit(set)}><PencilSimple size={16} /></button><button className="btn ghost small danger" aria-label={set.pending ? `Discard pending set ${set.set_number}` : `Delete set ${set.set_number}`} disabled={busy} onClick={() => onDelete(set)}><Trash size={16} /></button></div>}</div>)}</div>}
    {editable && !item.skipped && <form onSubmit={submit} style={{ marginTop: 18 }}><div className="fields cols-3"><div><label htmlFor={`w-${item.id}`}>Set {setNumber} · Weight {unitLabel('weight',units)}</label><input id={`w-${item.id}`} type="number" inputMode="decimal" min="0" step="0.1" placeholder={String(displayValue(last?.weight_kg??null,'weight',units)??0)} required value={weight} onChange={e => setWeight(e.target.value)} /></div><div><label htmlFor={`r-${item.id}`}>Reps</label><input id={`r-${item.id}`} type="number" inputMode="numeric" min="0" step="1" placeholder={last?.reps?.toString() ?? `${item.min_reps}`} required value={reps} onChange={e => setReps(e.target.value)} /></div><div><label htmlFor={`rir-${item.id}`}>RIR</label><input id={`rir-${item.id}`} type="number" inputMode="decimal" min="0" max="10" step="0.5" value={rir} onChange={e => setRir(e.target.value)} /></div></div><div className="row wrap" style={{ justifyContent: 'flex-start', marginTop: 12 }}><button className="btn primary" type="submit" disabled={busy}><Plus size={17} /> {editing ? 'Update set' : 'Log set'}</button>{editing && <button className="btn ghost" type="button" onClick={() => { setEditing(null); setWeight(''); setReps('') }}>Cancel edit</button>}</div></form>}
  </section>
}
