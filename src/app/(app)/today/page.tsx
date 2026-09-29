'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Barbell, ForkKnife, TrendUp } from '@phosphor-icons/react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { dayNumber, localDate, niceDate } from '@/lib/utils'
import { nutritionTotals } from '@/lib/metrics'
import { displayValue, unitLabel } from '@/lib/units'
import { useUnits } from '@/hooks/use-units'
import { errorMessage, type WorkoutDay, type NutritionTarget, type FoodEntry, type Measurement, type Session } from '@/lib/data'

type PlannedExercise = { id: string; sort_order: number; exercises: { name: string } }
type WeightCheckIn = Pick<Measurement, 'id' | 'measured_at' | 'weight_kg'>

export default function Today() {
  const { user } = useAuth()
  const router = useRouter()
  const units = useUnits()
  const [day, setDay] = useState<WorkoutDay | null>(null)
  const [planned, setPlanned] = useState<PlannedExercise[]>([])
  const [active, setActive] = useState<Session | null>(null)
  const [targets, setTargets] = useState<NutritionTarget | null>(null)
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [weights, setWeights] = useState<WeightCheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    let live = true
    const load = async () => {
      try {
        const client = supabase()
        const { error: setupError } = await client.rpc('forge_ensure_user_setup')
        if (setupError) throw setupError
        const todayDate = localDate()
        const [sessions, nutrition, foods, measurements, programResult] = await Promise.all([
          client.from('workout_sessions').select('id,workout_day_id,started_at,completed_at,status,notes').eq('status', 'active').maybeSingle(),
          client.from('nutrition_targets').select('id,calories,protein_g,carbs_g,fat_g,effective_from').lte('effective_from', todayDate).order('effective_from', { ascending: false }).limit(1).maybeSingle(),
          client.from('food_entries').select('id,food_id,logged_date,meal_type,quantity,calories,protein_g,carbs_g,fat_g').eq('logged_date', todayDate),
          client.from('body_measurements').select('id,measured_at,weight_kg').not('weight_kg', 'is', null).order('measured_at', { ascending: false }).limit(2),
          client.from('workout_programs').select('id').eq('active', true).maybeSingle(),
        ])
        for (const result of [sessions, nutrition, foods, measurements, programResult]) {
          if (result.error) throw result.error
        }
        if (!programResult.data) throw new Error('No active training plan found. Open your routine to set one up.')

        const dayResult = await client.from('workout_days')
          .select('id,day_of_week,name,is_rest_day,estimated_minutes_min,estimated_minutes_max')
          .eq('program_id', programResult.data.id)
          .eq('day_of_week', dayNumber())
          .maybeSingle()
        if (dayResult.error) throw dayResult.error
        const today = dayResult.data as WorkoutDay | null
        if (!today) throw new Error('Today is missing from your training plan. Open Edit routine to check the schedule.')

        let plan: PlannedExercise[] = []
        if (!today.is_rest_day) {
          const planResult = await client.from('program_exercises')
            .select('id,sort_order,exercises(name)')
            .eq('workout_day_id', today.id)
            .order('sort_order')
          if (planResult.error) throw planResult.error
          plan = (planResult.data ?? []) as unknown as PlannedExercise[]
        }
        if (live) {
          setDay(today)
          setPlanned(plan)
          setActive(sessions.data as Session | null)
          setTargets(nutrition.data)
          setEntries((foods.data ?? []) as FoodEntry[])
          setWeights((measurements.data ?? []) as WeightCheckIn[])
        }
      } catch (caught) {
        if (live) setError(errorMessage(caught))
      } finally {
        if (live) setLoading(false)
      }
    }
    void load()
    return () => { live = false }
  }, [user])

  async function start() {
    if (!user || !day || day.is_rest_day || planned.length === 0) return
    setBusy(true)
    setError('')
    try {
      if (active) {
        router.push(`/workouts/session/${active.id}`)
        return
      }
      const { data: sessionId, error: startError } = await supabase().rpc('forge_start_workout', { p_day_id: day.id })
      if (startError) throw startError
      if (!sessionId) throw new Error('Workout could not be started. Please try again.')
      router.push(`/workouts/session/${sessionId}`)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const totals = nutritionTotals(entries)
  const latestWeight = weights[0]
  const previousWeight = weights[1]
  const weightChange = latestWeight?.weight_kg != null && previousWeight?.weight_kg != null
    ? displayValue(Number(latestWeight.weight_kg) - Number(previousWeight.weight_kg), 'weight', units)
    : null
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return <>
    <div className="page-head today-head"><div className="eyebrow">{date}</div><h1>Today starts here.</h1><p>One clear view of the work ahead.</p></div>
    {error && <div className="notice" role="alert">{error}</div>}
    <div className="grid-2">
      <section className="card strong">
        <div className="row"><div className="eyebrow">Training plan</div><Barbell size={24} color="var(--accent)" /></div>
        <h2 style={{ fontSize: 30, marginTop: 24 }}>{day?.is_rest_day ? 'Recovery day' : day?.name ?? (loading ? 'Loading your plan…' : 'Plan unavailable')}</h2>
        <p className="muted">{day?.is_rest_day ? 'Rest, eat well, and come back stronger.' : day ? `${planned.length} exercises · ${day.estimated_minutes_min}–${day.estimated_minutes_max} min` : 'Open your routine to check the schedule.'}</p>
        <div className="row wrap" style={{ marginTop: 20 }}>
          {active
            ? <button className="btn primary" onClick={() => router.push(`/workouts/session/${active.id}`)}>Resume workout <ArrowRight size={18} /></button>
            : day && !day.is_rest_day && planned.length > 0
              ? <button className="btn primary" disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Start workout'} <ArrowRight size={18} /></button>
              : <Link className="btn" href="/workouts/routine">View routine <ArrowRight size={18} /></Link>}
          <Link href="/workouts" className="muted small">Weekly plan →</Link>
        </div>
        {day && !day.is_rest_day && planned.length === 0 && <p className="muted small" style={{ marginBottom: 0 }}>No exercises are scheduled yet. Add them in Edit routine.</p>}
      </section>
      <section className="card">
        <div className="row"><div className="eyebrow">Fuel today</div><ForkKnife size={24} color="var(--amber)" /></div>
        <div style={{ marginTop: 20 }}><div className="metric">{Math.round(totals.calories)} <small>{targets ? `/ ${targets.calories} kcal` : 'kcal logged'}</small></div>{targets && targets.calories > 0 && <div className="progress-track" style={{ marginTop: 14 }}><div className="progress-fill" style={{ width: `${Math.min(100, totals.calories / targets.calories * 100)}%` }} /></div>}</div>
        <div className="row" style={{ marginTop: 22 }}><span className="muted small">Protein</span><strong>{Math.round(totals.protein)}{targets ? ` / ${targets.protein_g}` : ''} g</strong></div>
        <div className="row" style={{ marginTop: 10 }}><span className="muted small">Carbs</span><strong>{Math.round(totals.carbs)}{targets ? ` / ${targets.carbs_g}` : ''} g</strong></div>
        <div className="row" style={{ marginTop: 10 }}><span className="muted small">Fat</span><strong>{Math.round(totals.fat)}{targets ? ` / ${targets.fat_g}` : ''} g</strong></div>
        {!loading && !targets && <Link href="/settings" className="muted small" style={{ marginTop: 12, display: 'inline-block', textDecoration: 'underline', textUnderlineOffset: 3 }}>Set your daily targets</Link>}
        <Link href="/nutrition" className="btn full" style={{ marginTop: 12 }}>Log food <ArrowRight size={18} /></Link>
      </section>
    </div>
    {day && !day.is_rest_day && planned.length > 0 && <section className="card today-exercises"><h2>Exercises today</h2><ol>{planned.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span>{item.exercises.name}</li>)}</ol></section>}
    <div className="section-head"><h2>Keep the streak moving</h2></div>
    <div className="grid-2">
      <Link href="/progress" className="card row"><div><div className="eyebrow">Body weight</div><div className="metric" style={{ marginTop: 14 }}>{displayValue(latestWeight?.weight_kg ?? null, 'weight', units) ?? '—'} <small>{unitLabel('weight', units)}</small></div><p className="muted small" style={{ marginBottom: 0 }}>{latestWeight ? `Last logged ${niceDate(latestWeight.measured_at)}` : 'Log your first weigh-in'}</p>{weightChange !== null && <p className="muted small" style={{ margin: '6px 0 0' }}>{weightChange > 0 ? '+' : ''}{weightChange} {unitLabel('weight', units)} since {niceDate(previousWeight.measured_at)}</p>}</div><TrendUp size={27} color="var(--accent)" /></Link>
      <Link href="/journal" className="card row"><div><div className="eyebrow">Training notes</div><h2 style={{ marginTop: 14 }}>What did you notice?</h2><p className="muted small" style={{ marginBottom: 0 }}>Keep the details that numbers miss.</p></div><ArrowRight size={22} color="var(--muted)" /></Link>
    </div>
  </>
}
