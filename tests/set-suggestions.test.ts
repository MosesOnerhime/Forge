import { expect, it } from 'vitest'
import { isDipExercise, suggestNextSet } from '../src/lib/set-suggestions'
import type { WorkoutSet } from '../src/lib/data'

function set(setNumber: number, weightKg: number, reps: number): WorkoutSet {
  return { id: `set-${setNumber}`, session_exercise_id: 'exercise-a', set_number: setNumber, weight_kg: weightKg, reps, rir: 2, completed: true, completed_at: null }
}

it('suggests the latest set in this workout before last-workout values', () => {
  expect(suggestNextSet([set(1, 62.5, 9), set(2, 60, 8)], [set(1, 55, 10)])).toMatchObject({ set: { weight_kg: 60, reps: 8 }, source: 'Set 2' })
})

it('uses the first set from the prior workout when this exercise has no logged set', () => {
  expect(suggestNextSet([], [set(1, 50, 12), set(2, 55, 10)])).toMatchObject({ set: { weight_kg: 50, reps: 12 }, source: 'Last workout' })
})

it('recognizes dips while preserving zero as a valid body-weight load', () => {
  expect(isDipExercise('Dips')).toBe(true)
  expect(isDipExercise('Upright Dips')).toBe(true)
  expect(isDipExercise('Dip Machine')).toBe(false)
  expect(isDipExercise('Dumbbell Press')).toBe(false)
  expect(suggestNextSet([set(1, 0, 8)], []).set?.weight_kg).toBe(0)
})
