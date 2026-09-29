'use client'

import { useState, type FormEvent } from 'react'
import { errorMessage, type WorkoutDay } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { routineWeekdays } from '@/lib/routine-templates'

export function RoutineDaySettings({ day, exerciseCount, onSaved, onError }: {
  day: WorkoutDay
  exerciseCount: number
  onSaved: () => Promise<void>
  onError: (message: string) => void
}) {
  const [name, setName] = useState(day.name)
  const [isRest, setIsRest] = useState(day.is_rest_day)
  const [min, setMin] = useState(day.estimated_minutes_min?.toString() ?? '')
  const [max, setMax] = useState(day.estimated_minutes_max?.toString() ?? '')
  const [busy, setBusy] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    onError('')
    if (!name.trim()) { onError('Give this day a name.'); return }
    if (isRest && exerciseCount > 0) { onError('Move or remove the exercises before making this a recovery day.'); return }
    const low = min === '' ? null : Number(min)
    const high = max === '' ? null : Number(max)
    if (!isRest && (low === null || high === null || !Number.isInteger(low) || !Number.isInteger(high) || low < 0 || high < low)) {
      onError('Enter a valid minimum and maximum duration.'); return
    }
    setBusy(true)
    try {
      const { error } = await supabase().from('workout_days').update({
        name: name.trim(), is_rest_day: isRest,
        estimated_minutes_min: isRest ? null : low,
        estimated_minutes_max: isRest ? null : high,
      }).eq('id', day.id)
      if (error) throw error
      await onSaved()
    } catch (caught) { onError(errorMessage(caught)) }
    finally { setBusy(false) }
  }

  return <details style={{ marginTop: 16 }}>
    <summary className="btn small" style={{ cursor: 'pointer', display: 'inline-flex' }}>Edit {routineWeekdays[day.day_of_week]} details</summary>
    <form className="card stack" onSubmit={save} style={{ marginTop: 12 }}>
      <div><label htmlFor={`day-name-${day.id}`}>Day name</label><input id={`day-name-${day.id}`} maxLength={150} required value={name} onChange={event => setName(event.target.value)} /></div>
      <label className="row" style={{ justifyContent: 'flex-start' }}><input type="checkbox" checked={isRest} onChange={event => setIsRest(event.target.checked)} style={{ width: 20 }} /> Recovery day</label>
      {!isRest && <div className="field-row">
        <div><label htmlFor={`day-min-${day.id}`}>Minimum minutes</label><input id={`day-min-${day.id}`} type="number" min="0" required value={min} onChange={event => setMin(event.target.value)} /></div>
        <div><label htmlFor={`day-max-${day.id}`}>Maximum minutes</label><input id={`day-max-${day.id}`} type="number" min="0" required value={max} onChange={event => setMax(event.target.value)} /></div>
      </div>}
      <button className="btn" disabled={busy} style={{ justifySelf: 'start' }}>{busy ? 'Saving…' : 'Save day'}</button>
    </form>
  </details>
}
