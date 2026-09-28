'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/data'
import { localDate } from '@/lib/utils'
import { storageValue, type Units } from '@/lib/units'

type TrainingDay = { day_of_week: number; name: string; is_rest_day: boolean }
const weekday = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function OnboardingPage() {
  return <AuthProvider required><SetupForm /></AuthProvider>
}

function SetupForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  const [days, setDays] = useState<TrainingDay[]>([])
  const [name, setName] = useState('')
  const [units, setUnits] = useState<Units>('metric')
  const [goalId, setGoalId] = useState<string | null>(null)
  const [goal, setGoal] = useState('')
  const [calories, setCalories] = useState('2900')
  const [protein, setProtein] = useState('170')
  const [carbs, setCarbs] = useState('375')
  const [fat, setFat] = useState('80')
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoView, setPhotoView] = useState('front')

  useEffect(() => {
    if (!user) return
    let live = true
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const client = supabase()
        const { error: setupError } = await client.rpc('forge_ensure_user_setup')
        if (setupError) throw setupError
        const [profile, savedGoal, target, program] = await Promise.all([
          client.from('profiles').select('display_name,units,onboarding_completed_at').eq('user_id', user.id).single(),
          client.from('goals').select('id,name').eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          client.from('nutrition_targets').select('calories,protein_g,carbs_g,fat_g').lte('effective_from', localDate()).order('effective_from', { ascending: false }).limit(1).maybeSingle(),
          client.from('workout_programs').select('id').eq('active', true).maybeSingle(),
        ])
        if (profile.error) throw profile.error
        if (savedGoal.error) throw savedGoal.error
        if (target.error) throw target.error
        if (program.error) throw program.error
        if (profile.data.onboarding_completed_at) { router.replace('/today'); return }
        if (!program.data) throw new Error('Your training plan is missing. Try again.')
        const plan = await client.from('workout_days').select('day_of_week,name,is_rest_day').eq('program_id', program.data.id).order('day_of_week')
        if (plan.error) throw plan.error
        if (!live) return
        setName(profile.data.display_name ?? '')
        setUnits(profile.data.units === 'imperial' ? 'imperial' : 'metric')
        setGoalId(savedGoal.data?.id ?? null)
        setGoal(savedGoal.data?.name ?? '')
        if (target.data) {
          setCalories(String(target.data.calories))
          setProtein(String(target.data.protein_g))
          setCarbs(String(target.data.carbs_g))
          setFat(String(target.data.fat_g))
        }
        setDays(plan.data ?? [])
      } catch (caught) {
        if (live) setError(errorMessage(caught))
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => { live = false }
  }, [user, router, retry])

  async function finish(event: FormEvent) {
    event.preventDefault()
    if (!user || busy) return
    setError('')
    const targets = { calories: Number(calories), protein_g: Number(protein), carbs_g: Number(carbs), fat_g: Number(fat) }
    if (!goal.trim()) { setError('Add a fitness goal to continue.'); return }
    if (Object.values(targets).some(value => !Number.isFinite(value) || value < 0)) { setError('Enter non-negative nutrition targets.'); return }
    if ([weight, waist].some(value => value !== '' && (!Number.isFinite(Number(value)) || Number(value) <= 0))) { setError('Starting measurements must be greater than zero.'); return }
    if (photo && (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 10 * 1024 * 1024)) { setError('Use a JPG, PNG, or WebP photo under 10 MB.'); return }
    setBusy(true)
    try {
      const client = supabase()
      const { error: profileError } = await client.from('profiles').update({ display_name: name.trim() || null, units }).eq('user_id', user.id)
      if (profileError) throw profileError
      const goalValues = { name: goal.trim(), active: true }
      const goalResult = goalId
        ? await client.from('goals').update(goalValues).eq('id', goalId)
        : await client.from('goals').insert({ user_id: user.id, ...goalValues }).select('id').single()
      if (goalResult.error) throw goalResult.error
      if (!goalId && goalResult.data) setGoalId(goalResult.data.id)
      const today = localDate()
      const { error: targetError } = await client.from('nutrition_targets').upsert({ user_id: user.id, effective_from: today, ...targets }, { onConflict: 'user_id,effective_from' })
      if (targetError) throw targetError
      if (weight || waist) {
        const existing = await client.from('body_measurements').select('id').eq('measured_at', today).maybeSingle()
        if (existing.error) throw existing.error
        const values = {
          ...(weight ? { weight_kg: storageValue(Number(weight), 'weight', units) } : {}),
          ...(waist ? { waist_cm: storageValue(Number(waist), 'length', units) } : {}),
        }
        const { error: measurementError } = existing.data
          ? await client.from('body_measurements').update(values).eq('id', existing.data.id)
          : await client.from('body_measurements').insert({ user_id: user.id, measured_at: today, ...values })
        if (measurementError) throw measurementError
      }
      if (photo) {
        const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await client.storage.from('progress-photos').upload(path, photo, { contentType: photo.type })
        if (uploadError) throw uploadError
        const { error: rowError } = await client.from('progress_photos').insert({ user_id: user.id, photo_date: today, view_type: photoView, storage_path: path })
        if (rowError) { await client.storage.from('progress-photos').remove([path]); throw rowError }
        setPhoto(null)
        const input = document.getElementById('starting-photo') as HTMLInputElement | null
        if (input) input.value = ''
      }
      const { error: completeError } = await client.from('profiles').update({ onboarding_completed_at: new Date().toISOString() }).eq('user_id', user.id)
      if (completeError) throw completeError
      router.replace('/today')
      router.refresh()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return <main className="main" style={{ maxWidth: 760 }}>
    <div className="page-head"><h1>Set up your training.</h1><p>Make Forge yours, then start logging.</p></div>
    {error && <div className="notice" role="alert" style={{ marginBottom: 16 }}>{error} {days.length === 0 && <button className="btn small" type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}</div>}
    {loading ? <div className="empty">Loading your plan…</div> : <form className="stack" onSubmit={finish}>
      <section className="card stack"><h2>1. Your profile</h2><div className="field-row"><div><label htmlFor="setup-name">Display name</label><input id="setup-name" maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Optional" /></div><div><label htmlFor="setup-units">Units</label><select id="setup-units" value={units} onChange={event => setUnits(event.target.value as Units)}><option value="metric">Kilograms and centimeters</option><option value="imperial">Pounds and inches</option></select></div></div></section>
      <section className="card stack"><h2>2. Your goal</h2><div><label htmlFor="setup-goal">What are you training toward?</label><input id="setup-goal" required maxLength={100} value={goal} onChange={event => setGoal(event.target.value)} placeholder="For example, build strength" /></div></section>
      <section className="card stack"><h2>3. Your routine</h2><p className="muted" style={{ margin: 0 }}>Your weekly plan is ready. You can edit exercises and prescriptions later.</p>{days.length === 7 ? <div>{days.map(day => <div className="item row" key={day.day_of_week}><strong>{weekday[day.day_of_week]}</strong><span className="muted small">{day.is_rest_day ? 'Rest' : day.name}</span></div>)}</div> : <div className="notice" role="alert">The weekly plan did not load. Try again before finishing setup.</div>}</section>
      <section className="card stack"><h2>4. Daily nutrition targets</h2><div className="fields cols-3">{([['Calories', calories, setCalories], ['Protein g', protein, setProtein], ['Carbs g', carbs, setCarbs], ['Fat g', fat, setFat]] as const).map(([label, value, setter]) => <div key={label}><label htmlFor={`setup-${label}`}>{label}</label><input id={`setup-${label}`} type="number" min="0" step="1" required value={value} onChange={event => setter(event.target.value)} /></div>)}</div></section>
      <section className="card stack"><h2>5. Starting progress <span className="muted small">(optional)</span></h2><div className="field-row"><div><label htmlFor="setup-weight">Body weight ({units === 'metric' ? 'kg' : 'lb'})</label><input id="setup-weight" type="number" inputMode="decimal" min="0.01" step="0.01" value={weight} onChange={event => setWeight(event.target.value)} /></div><div><label htmlFor="setup-waist">Waist ({units === 'metric' ? 'cm' : 'in'})</label><input id="setup-waist" type="number" inputMode="decimal" min="0.01" step="0.01" value={waist} onChange={event => setWaist(event.target.value)} /></div></div><div className="field-row"><div><label htmlFor="starting-photo">Progress photo</label><input id="starting-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setPhoto(event.target.files?.[0] ?? null)} /></div><div><label htmlFor="starting-view">Photo view</label><select id="starting-view" value={photoView} onChange={event => setPhotoView(event.target.value)}><option value="front">Front</option><option value="side">Side</option><option value="back">Back</option><option value="custom">Custom</option></select></div></div><p className="muted small" style={{ margin: 0 }}>You can add measurements and photos later.</p></section>
      <button className="btn primary" disabled={busy || days.length !== 7} style={{ justifySelf: 'start' }}>{busy ? 'Saving setup…' : 'Open Today'}</button>
    </form>}
  </main>
}
