'use client'

import type { RoutineTemplate } from '@/lib/routine-templates'
import { routineWeekdays, templateSummary } from '@/lib/routine-templates'

type Props = {
  templates: RoutineTemplate[]
  selected: string
  onSelect: (id: string) => void
  disabled?: boolean
}

export function RoutineTemplateChoice({ templates, selected, onSelect, disabled = false }: Props) {
  return <div className="stack" role="radiogroup" aria-label="Workout routine template">
    {templates.map(template => <label className="item" key={template.id} style={{ cursor: disabled ? 'default' : 'pointer' }}>
      <span className="row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
        <input type="radio" name="routine-template" value={template.id} checked={selected === template.id}
          disabled={disabled} onChange={() => onSelect(template.id)} style={{ width: 20, flex: 'none', marginTop: 4 }} />
        <span className="stack" style={{ gap: 7 }}>
          <strong>{template.name}</strong>
          <span className="muted small">{template.description}</span>
          <span className="muted small">{templateSummary(template.days)}</span>
        </span>
      </span>
      {selected === template.id && <div className="stack" style={{ gap: 4, marginTop: 12, paddingLeft: 32 }}>
        {template.days.map(day => <div className="row small" key={day.day_of_week}>
          <span>{routineWeekdays[day.day_of_week]}</span>
          <span className="muted" style={{ textAlign: 'right' }}>{day.name}{!day.is_rest_day ? ` · ${day.exercises.length} exercises` : ''}</span>
        </div>)}
      </div>}
    </label>)}
  </div>
}
