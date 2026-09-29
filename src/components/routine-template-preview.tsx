'use client'

import { useState } from 'react'
import { RoutineTemplateChoice } from '@/components/routine-template-choice'
import type { RoutineTemplate } from '@/lib/routine-templates'

const weekdays = ['Back + Biceps + Forearms', 'Recovery', 'Chest + Shoulders + Triceps', 'Recovery', 'Legs + Abs', 'Back + Biceps + Forearms', 'Chest + Shoulders + Triceps']
const templates: RoutineTemplate[] = [
  {
    id: 'runo', user_id: null, name: "Runo's Workout Routine",
    description: 'Five training days and two recovery days. Sets, reps, and rests are provisional until the original workout prescription is supplied.',
    created_at: '', days: weekdays.map((name, index) => ({ day_of_week: index + 1, name, is_rest_day: name === 'Recovery', estimated_minutes_min: null, estimated_minutes_max: null, exercises: name === 'Recovery' ? [] : Array.from({ length: 7 }, () => ({ name: 'Exercise' })) })),
  },
  {
    id: 'mom', user_id: null, name: "Mom's Starter Routine",
    description: 'An editable beginner gym plan: three moderate full-body strength days, with optional easy walking on recovery days. Build activity gradually; this cannot promise fat loss in a particular body area.',
    created_at: '', days: Array.from({ length: 7 }, (_, index) => ({ day_of_week: index + 1, name: index % 2 === 0 && index < 5 ? 'Full body' : 'Easy walk or recovery', is_rest_day: index % 2 !== 0 || index > 4, estimated_minutes_min: null, estimated_minutes_max: null, exercises: index % 2 === 0 && index < 5 ? Array.from({ length: index === 4 ? 5 : 4 }, () => ({ name: 'Exercise' })) : [] })),
  },
  {
    id: 'blank', user_id: null, name: 'Build from scratch',
    description: 'Start with seven recovery days, then name training days and add your exercises.',
    created_at: '', days: Array.from({ length: 7 }, (_, index) => ({ day_of_week: index + 1, name: 'Recovery', is_rest_day: true, estimated_minutes_min: null, estimated_minutes_max: null, exercises: [] })),
  },
]

export function RoutineTemplatePreview() {
  const [selected, setSelected] = useState('runo')
  return <>
    <div className="page-head"><h1>Routine templates.</h1><p>Load a complete week, or keep a private copy of the routine you built.</p></div>
    <div className="notice success" style={{ marginBottom: 16 }}>Sample data for layout review.</div>
    <section className="card stack"><h2>Choose a routine</h2><RoutineTemplateChoice templates={templates} selected={selected} onSelect={setSelected} /><button className="btn primary" style={{ justifySelf: 'start' }}>Load selected routine</button></section>
    <section className="card stack" style={{ marginTop: 20 }}><h2>Save your current routine</h2><div><label htmlFor="preview-template-name">Template name</label><input id="preview-template-name" placeholder="My workout routine" /></div><button className="btn" style={{ justifySelf: 'start' }}>Save as template</button></section>
  </>
}
