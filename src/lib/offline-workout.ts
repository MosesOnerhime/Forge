import type { Session, SessionExercise } from './data'
import type { Units } from './units'

export const OFFLINE_WORKOUT_KEY = 'forge:offline-workout:v1'

export type OfflineWorkout = {
  version: 1
  userId: string
  sessionId: string
  name: string
  status: string
  units: Units
  savedAt: string
  exercises: {
    name: string
    targetSets: number
    minReps: number
    maxReps: number
    restSeconds: number
    sets: { setNumber: number; weightKg: number; reps: number; rir: number | null; pending?: boolean }[]
  }[]
}

export function cacheOfflineWorkout(userId: string, session: Session, items: SessionExercise[], units: Units) {
  if (typeof window === 'undefined') return
  const snapshot: OfflineWorkout = {
    version: 1,
    userId,
    sessionId: session.id,
    name: session.workout_days?.name ?? 'Workout',
    status: session.status,
    units,
    savedAt: new Date().toISOString(),
    exercises: items.map(item => ({
      name: item.exercises.name,
      targetSets: item.target_sets,
      minReps: item.min_reps,
      maxReps: item.max_reps,
      restSeconds: item.rest_seconds,
      sets: item.workout_sets.filter(set => set.completed && set.weight_kg !== null && set.reps !== null).map(set => ({
        setNumber: set.set_number,
        weightKg: Number(set.weight_kg),
        reps: Number(set.reps),
        rir: set.rir,
        pending: set.pending,
      })),
    })),
  }
  try { window.localStorage.setItem(OFFLINE_WORKOUT_KEY, JSON.stringify(snapshot)) } catch { /* Private mode or full storage must not block workout logging. */ }
}

export function clearOfflineWorkout() {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(OFFLINE_WORKOUT_KEY) } catch { /* Nothing to clear if storage is unavailable. */ }
}

export function clearOfflineWorkoutForOtherUser(userId: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(OFFLINE_WORKOUT_KEY)
    if (raw && (JSON.parse(raw) as OfflineWorkout).userId !== userId) clearOfflineWorkout()
  } catch { clearOfflineWorkout() }
}
