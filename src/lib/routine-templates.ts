export type RoutineTemplateDay = {
  day_of_week: number
  name: string
  is_rest_day: boolean
  estimated_minutes_min: number | null
  estimated_minutes_max: number | null
  exercises: { name: string }[]
}

export type RoutineTemplate = {
  id: string
  user_id: string | null
  publisher_id?: string | null
  is_shared?: boolean
  name: string
  description: string | null
  days: RoutineTemplateDay[]
  created_at: string
}

export const routineWeekdays = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function isScratchTemplate(template: RoutineTemplate) {
  return template.days.length === 7 && template.days.every(day => day.is_rest_day && day.exercises.length === 0)
}

export function templateSummary(days: RoutineTemplateDay[]) {
  const training = days.filter(day => !day.is_rest_day).length
  const exerciseCount = days.reduce((count, day) => count + day.exercises.length, 0)
  return `${training} training ${training === 1 ? 'day' : 'days'} · ${exerciseCount} planned exercises`
}
