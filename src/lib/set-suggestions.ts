import type { WorkoutSet } from './data'

export function isDipExercise(name: string) {
  return /^(?:(?:upright|weighted)\s+)?dips$/i.test(name.trim())
}

export function suggestNextSet(current: WorkoutSet[], previous: WorkoutSet[]) {
  const latest = current.filter(set => set.completed && set.weight_kg !== null && set.reps !== null)
    .reduce<WorkoutSet | null>((best, set) => !best || set.set_number > best.set_number ? set : best, null)
  if (latest) return { set: latest, source: `Set ${latest.set_number}` }
  const firstPrevious = previous.find(set => set.set_number === 1) ?? previous[0]
  return { set: firstPrevious ?? null, source: firstPrevious ? 'Last workout' : null }
}
