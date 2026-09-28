'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ArrowLeft, Plus, Trash, Timer, PencilSimple, Trophy } from '@phosphor-icons/react'
import { useAuth } from '@/components/auth-provider'
import { RestTimer } from '@/components/rest-timer'
import { supabase } from '@/lib/supabase'
import { errorMessage, type Session, type SessionExercise, type WorkoutSet, type Exercise } from '@/lib/data'
import { sessionSummary,setVolume } from '@/lib/metrics'
import { displayValue,storageValue,unitLabel,type Units } from '@/lib/units'
import { useUnits } from '@/hooks/use-units'

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
  const [timer, setTimer] = useState<number | null>(null)
  const [timerRun, setTimerRun] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

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
      setSession(sessionResult.data as unknown as Session)
      setItems(nextItems)
      setExercises(catalogResult.data ?? [])
      const { data: history, error: historyError } = await client.rpc('forge_previous_sets', { p_session_id: id })
      if (historyError) throw historyError
      const map: Previous = {}
      for (const row of history ?? []) {
        if (!map[row.exercise_id]) map[row.exercise_id] = []
        map[row.exercise_id].push({ id: `previous-${row.exercise_id}-${row.set_number}`, session_exercise_id: '', set_number: row.set_number, weight_kg: row.weight_kg, reps: row.reps, rir: row.rir, completed: true, completed_at: null })
      }
      setPrevious(map)
    } catch (caught) { setError(errorMessage(caught)) } finally { setLoading(false) }
  }, [id])
  useEffect(() => { if (user) queueMicrotask(() => { void load() }) }, [user, load])

  async function saveSet(item: SessionExercise, setNumber: number, weight: string, reps: string, rir: string): Promise<boolean> {
    if (!user) return false
    setBusy(true); setError('')
    try {
      const w = storageValue(Number(weight),'weight',units), r = Number(reps), reserve = rir === '' ? null : Number(rir)
      if (!Number.isFinite(w) || w < 0 || !Number.isInteger(r) || r < 0 || (reserve !== null && (!Number.isFinite(reserve) || reserve < 0 || reserve > 10))) throw new Error('Enter a valid weight, whole number of reps, and RIR from 0 to 10.')
      const { error } = await supabase().from('workout_sets').upsert({ user_id: user.id, session_exercise_id: item.id, set_number: setNumber, weight_kg: w, reps: r, rir: reserve, completed: true, completed_at: new Date().toISOString() }, { onConflict: 'session_exercise_id,set_number' })
      if (error) throw error
      setTimer(item.rest_seconds)
      setTimerRun(value => value + 1)
      await load()
      return true
    } catch (caught) { setError(errorMessage(caught)); return false } finally { setBusy(false) }
  }
  async function deleteSet(set: WorkoutSet) {
    if (!window.confirm('Delete this set?')) return
    setBusy(true)
    const { error } = await supabase().from('workout_sets').delete().eq('id', set.id)
    if (error) setError(error.message); else await load()
    setBusy(false)
  }
  async function skip(item: SessionExercise) {
    const { error } = await supabase().from('session_exercises').update({ skipped: !item.skipped }).eq('id', item.id)
    if (error) setError(error.message); else await load()
  }
  async function substitute(item: SessionExercise, exerciseId: string) {
    const { error } = await supabase().from('session_exercises').update({ exercise_id: exerciseId }).eq('id', item.id)
    if (error) setError(error.message); else await load()
  }
  async function saveNotes(notes: string) {
    const { error } = await supabase().from('workout_sessions').update({ notes: notes.trim() || null }).eq('id', id)
    if (error) setError(error.message); else await load()
  }
  async function finish(status: 'completed' | 'cancelled') {
    if (!window.confirm(status === 'completed' ? 'Finish this workout?' : 'Cancel this workout?')) return
    setBusy(true)
    const { error } = await supabase().from('workout_sessions').update({ status, completed_at: new Date().toISOString() }).eq('id', id)
    if (error) setError(error.message)
    else { setTimer(null); await load(); if (status === 'cancelled') router.push('/workouts') }
    setBusy(false)
  }
  const { sets:completed,volume,prCount:prs } = sessionSummary(items,previous)
  return <>
    <Link href="/workouts" className="muted small row" style={{ justifyContent: 'flex-start', marginBottom: 16 }}><ArrowLeft size={16} /> Training</Link>
    <div className="page-head"><div className="eyebrow">{session?.status === 'active' ? 'Session in progress' : session?.status === 'completed' ? 'Session complete' : 'Session'}</div><h1>{session?.workout_days?.name ?? 'Your workout'}</h1><p>{completed} sets logged · {Math.round(displayValue(volume,'weight',units)??0).toLocaleString()} {unitLabel('weight',units)} volume {prs > 0 ? `· ${prs} volume PR${prs > 1 ? 's' : ''}` : ''}</p></div>
    {error && <div className="notice" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
    {loading ? <div className="empty">Loading session…</div> : !session ? <div className="empty">Session not found.</div> : <>
      <div className="stack">{items.map((item, index) => <ExerciseCard key={item.id} item={item} position={index + 1} previous={previous[item.exercise_id] ?? []} exercises={exercises} units={units} editable={session.status === 'active'} busy={busy} onSave={saveSet} onDelete={deleteSet} onSkip={skip} onSubstitute={substitute} />)}</div>
      <SessionNotes initial={session.notes ?? ''} editable={session.status === 'active'} onSave={saveNotes} />
      {session.status === 'active' && <div className="row wrap" style={{ marginTop: 24 }}><button className="btn primary" disabled={busy} onClick={() => finish('completed')}><Check size={18} /> Finish workout</button><button className="btn danger" disabled={busy} onClick={() => finish('cancelled')}>Cancel session</button></div>}
      {session.status === 'completed' && <div className="card strong" style={{ marginTop: 24 }}><div className="eyebrow">Work logged</div><h2 style={{ marginTop: 10 }}>{completed} sets. {Math.round(displayValue(volume,'weight',units)??0).toLocaleString()} {unitLabel('weight',units)} volume.</h2>{prs > 0 && <p className="pill green"><Trophy size={14} /> {prs} volume PR{prs > 1 ? 's' : ''}</p>}<p className="muted">The next session will show today’s numbers as your previous performance.</p><Link href="/today" className="btn primary">Back to Today</Link></div>}
    </>}
    {timer !== null && <RestTimer key={timerRun} duration={timer} onDismiss={() => setTimer(null)} />}
  </>
}

function SessionNotes({ initial, editable, onSave }: { initial: string; editable: boolean; onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState(initial)
  return <section className="card" style={{ marginTop: 16 }}><h3>Session notes</h3>{editable ? <><textarea aria-label="Session notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ marginTop: 12 }} placeholder="Energy, form, equipment, or anything to remember…" /><button className="btn small" style={{ marginTop: 10 }} onClick={() => onSave(notes)}>Save notes</button></> : <p className="muted">{initial || 'No notes recorded.'}</p>}</section>
}

function ExerciseCard({ item, position, previous, exercises, units, editable, busy, onSave, onDelete, onSkip, onSubstitute }: { item: SessionExercise; position: number; previous: WorkoutSet[]; exercises: Exercise[]; units:Units; editable: boolean; busy: boolean; onSave: (item: SessionExercise, setNumber: number, weight: string, reps: string, rir: string) => Promise<boolean>; onDelete: (set: WorkoutSet) => void; onSkip: (item: SessionExercise) => void; onSubstitute: (item: SessionExercise, exerciseId: string) => void }) {
  const [weight, setWeight] = useState(''), [reps, setReps] = useState(''), [rir, setRir] = useState('2')
  const [editing, setEditing] = useState<number | null>(null), [showSubstitute, setShowSubstitute] = useState(false)
  const next = Math.max(0, ...item.workout_sets.map(set => set.set_number)) + 1
  const setNumber = editing ?? next
  const last = previous.find(set => set.set_number === setNumber) ?? previous[previous.length - 1]
  const best = Math.max(0, ...previous.map(setVolume))
  const pr = best > 0 && item.workout_sets.some(set => set.completed && setVolume(set) > best)
  function edit(set: WorkoutSet) { setEditing(set.set_number); setWeight(String(displayValue(set.weight_kg,'weight',units) ?? '')); setReps(String(set.reps ?? '')); setRir(set.rir === null ? '' : String(set.rir)) }
  async function submit(e: FormEvent) { e.preventDefault(); if (await onSave(item, setNumber, weight, reps, rir)) { setEditing(null); setWeight(''); setReps('') } }
  return <section className="card" style={{ opacity: item.skipped ? .6 : 1 }}>
    <div className="row wrap"><div className="row" style={{ justifyContent: 'flex-start' }}><span className="pill orange">{String(position).padStart(2, '0')}</span><h2>{item.exercises.name}</h2></div>{editable && <button className="btn ghost small" onClick={() => onSkip(item)}>{item.skipped ? 'Undo skip' : 'Skip'}</button>}</div>
    <div className="row wrap" style={{ justifyContent: 'flex-start', marginTop: 12 }}><span className="pill">{item.target_sets} × {item.min_reps}–{item.max_reps} reps</span><span className="pill"><Timer size={13} /> {Math.round(item.rest_seconds / 60)} min rest</span>{pr && <span className="pill green"><Trophy size={13} /> New volume PR</span>}</div>
    {previous.length > 0 && <p className="muted small">Last time: {previous.map(set => `${displayValue(set.weight_kg,'weight',units)} ${unitLabel('weight',units)} × ${set.reps}`).join(' · ')}</p>}
    {editable && <><button className="btn ghost small" style={{ marginTop: 10 }} onClick={() => setShowSubstitute(!showSubstitute)}>{showSubstitute ? 'Close replacement' : 'Replace exercise'}</button>{showSubstitute && <div style={{ marginTop: 10 }}><label htmlFor={`sub-${item.id}`}>Use a different exercise this session</label><select id={`sub-${item.id}`} value={item.exercise_id} onChange={e => { onSubstitute(item, e.target.value); setShowSubstitute(false) }}>{exercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></div>}</>}
    {item.workout_sets.length > 0 && <div style={{ marginTop: 18 }}>{item.workout_sets.map(set => <div className="item row" key={set.id}><span className="muted small">Set {set.set_number}</span><strong>{displayValue(set.weight_kg,'weight',units)} {unitLabel('weight',units)} × {set.reps} <span className="muted small">· {set.rir ?? '—'} RIR</span></strong>{editable && <div className="row"><button className="btn ghost small" aria-label={`Edit set ${set.set_number}`} disabled={busy} onClick={() => edit(set)}><PencilSimple size={16} /></button><button className="btn ghost small danger" aria-label={`Delete set ${set.set_number}`} disabled={busy} onClick={() => onDelete(set)}><Trash size={16} /></button></div>}</div>)}</div>}
    {editable && !item.skipped && <form onSubmit={submit} style={{ marginTop: 18 }}><div className="fields cols-3"><div><label htmlFor={`w-${item.id}`}>Set {setNumber} · Weight {unitLabel('weight',units)}</label><input id={`w-${item.id}`} type="number" inputMode="decimal" min="0" step="0.1" placeholder={String(displayValue(last?.weight_kg??null,'weight',units)??0)} required value={weight} onChange={e => setWeight(e.target.value)} /></div><div><label htmlFor={`r-${item.id}`}>Reps</label><input id={`r-${item.id}`} type="number" inputMode="numeric" min="0" step="1" placeholder={last?.reps?.toString() ?? `${item.min_reps}`} required value={reps} onChange={e => setReps(e.target.value)} /></div><div><label htmlFor={`rir-${item.id}`}>RIR</label><input id={`rir-${item.id}`} type="number" inputMode="decimal" min="0" max="10" step="0.5" value={rir} onChange={e => setRir(e.target.value)} /></div></div><div className="row wrap" style={{ justifyContent: 'flex-start', marginTop: 12 }}><button className="btn primary" type="submit" disabled={busy}><Plus size={17} /> {editing ? 'Update set' : 'Log set'}</button>{editing && <button className="btn ghost" type="button" onClick={() => { setEditing(null); setWeight(''); setReps('') }}>Cancel edit</button>}</div></form>}
  </section>
}
