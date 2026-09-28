'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
import { useAuth } from '@/components/auth-provider'
import { useUnits } from '@/hooks/use-units'
import { supabase } from '@/lib/supabase'
import { errorMessage, type WorkoutSet } from '@/lib/data'
import { setVolume } from '@/lib/metrics'
import { displayValue, unitLabel } from '@/lib/units'
import { niceDate } from '@/lib/utils'

type ExerciseSession = {
  id: string
  workout_sessions: {
    id: string
    started_at: string
    status: string
    workout_days: { name: string } | null
  } | null
  workout_sets: WorkoutSet[]
}

export default function ExerciseHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const units = useUnits()
  const [name, setName] = useState('')
  const [rows, setRows] = useState<ExerciseSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let live = true
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const client = supabase()
        const [exercise, history] = await Promise.all([
          client.from('exercises').select('name').eq('id', id).single(),
          client.from('session_exercises')
            .select('id,workout_sessions(id,started_at,status,workout_days(name)),workout_sets(id,session_exercise_id,set_number,weight_kg,reps,rir,completed,completed_at)')
            .eq('exercise_id', id),
        ])
        if (exercise.error) throw exercise.error
        if (history.error) throw history.error
        if (!live) return
        setName(exercise.data.name)
        const next = (history.data ?? []) as unknown as ExerciseSession[]
        next.forEach(row => row.workout_sets.sort((a, b) => a.set_number - b.set_number))
        next.sort((a, b) => Date.parse(b.workout_sessions?.started_at ?? '') - Date.parse(a.workout_sessions?.started_at ?? ''))
        setRows(next)
      } catch (caught) {
        if (live) setError(errorMessage(caught))
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => { live = false }
  }, [id, user])

  const logged = rows.filter(row => row.workout_sets.some(set => set.completed))
  const best = Math.max(0, ...logged.flatMap(row => row.workout_sets.filter(set => set.completed).map(setVolume)))

  return <>
    <Link href="/workouts" className="muted small row" style={{ justifyContent: 'flex-start', marginBottom: 16 }}><ArrowLeft size={16} /> Training</Link>
    <div className="page-head"><h1>{name || 'Exercise history'}</h1><p>See every logged session for this exercise.</p></div>
    {error && <div className="notice" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
    {loading ? <div className="empty">Loading exercise history…</div> : !name ? <div className="empty">Exercise not found.</div> : <>
      <div className="grid-2">
        <div className="card"><h2>{logged.length} sessions</h2><p className="muted small">With completed sets</p></div>
        <div className="card"><h2>{Math.round(displayValue(best, 'weight', units) ?? 0).toLocaleString()} {unitLabel('weight', units)} volume</h2><p className="muted small">Best single set</p></div>
      </div>
      <div className="section-head"><h2>Session history</h2></div>
      {logged.length === 0 ? <div className="empty">Complete a set to begin this exercise’s history.</div> : <div className="stack">{logged.map(row => {
        const session = row.workout_sessions
        const sets = row.workout_sets.filter(set => set.completed)
        return <section className="card" key={row.id}>
          <div className="row wrap"><div><h3>{session ? niceDate(session.started_at) : 'Session'}</h3><p className="muted small" style={{ margin: '5px 0 0' }}>{session?.workout_days?.name ?? 'Workout'} · {sets.length} sets</p></div>{session && <Link className="btn small" href={`/workouts/session/${session.id}`}>View session</Link>}</div>
          <div style={{ marginTop: 14 }}>{sets.map(set => <div className="item row" key={set.id}><span className="muted small">Set {set.set_number}</span><strong>{displayValue(set.weight_kg, 'weight', units)} {unitLabel('weight', units)} × {set.reps} <span className="muted small">· {set.rir ?? '—'} RIR</span></strong></div>)}</div>
        </section>
      })}</div>}
    </>}
  </>
}
