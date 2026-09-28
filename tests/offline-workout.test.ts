// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { cacheOfflineWorkout, clearOfflineWorkout, clearOfflineWorkoutForOtherUser, OFFLINE_WORKOUT_KEY, type OfflineWorkout } from '../src/lib/offline-workout'
import type { Session, SessionExercise } from '../src/lib/data'

const session: Session = { id: 'session-1', workout_day_id: 'day-1', started_at: '2026-09-28T10:00:00Z', completed_at: null, status: 'active', notes: null, workout_days: { name: 'Back day' } }
const exercise: SessionExercise = {
  id: 'session-exercise-1', session_id: 'session-1', exercise_id: 'exercise-1', sort_order: 1,
  target_sets: 3, min_reps: 6, max_reps: 10, rest_seconds: 180, notes: null, skipped: false,
  exercises: { id: 'exercise-1', name: 'Weighted Pull-ups' },
  workout_sets: [{ id: 'set-1', session_exercise_id: 'session-exercise-1', set_number: 1, weight_kg: 10, reps: 8, rir: 2, completed: true, completed_at: '2026-09-28T10:10:00Z' }],
}

describe('offline workout snapshot', () => {
  beforeEach(() => localStorage.clear())
  it('keeps only the last loaded workout and clears it across account changes', () => {
    cacheOfflineWorkout('user-a', session, [exercise], 'metric')
    const saved = JSON.parse(localStorage.getItem(OFFLINE_WORKOUT_KEY) ?? '') as OfflineWorkout
    expect(saved.userId).toBe('user-a')
    expect(saved.exercises[0].sets[0]).toMatchObject({ weightKg: 10, reps: 8 })
    clearOfflineWorkoutForOtherUser('user-a')
    expect(localStorage.getItem(OFFLINE_WORKOUT_KEY)).not.toBeNull()
    clearOfflineWorkoutForOtherUser('user-b')
    expect(localStorage.getItem(OFFLINE_WORKOUT_KEY)).toBeNull()
    cacheOfflineWorkout('user-b', session, [exercise], 'imperial')
    clearOfflineWorkout()
    expect(localStorage.getItem(OFFLINE_WORKOUT_KEY)).toBeNull()
  })
})
