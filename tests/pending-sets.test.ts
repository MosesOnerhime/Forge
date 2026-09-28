// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { clearPendingSets, clearPendingSetsForOtherUser, flushPendingSets, mergePendingSets, queuePendingSet, readPendingSets, removePendingSet } from '../src/lib/pending-sets'
import type { PendingSet } from '../src/lib/pending-sets'
import type { SessionExercise } from '../src/lib/data'

const base = { userId: 'user-a', sessionId: 'session-a', sessionExerciseId: 'exercise-a', setNumber: 1, weightKg: 80, reps: 8, rir: 2, completedAt: '2026-09-29T10:00:00Z' }
const item: SessionExercise = { id: 'exercise-a', session_id: 'session-a', exercise_id: 'catalog-a', sort_order: 1, target_sets: 3, min_reps: 6, max_reps: 10, rest_seconds: 120, notes: null, skipped: false, exercises: { id: 'catalog-a', name: 'Squat' }, workout_sets: [{ id: 'server-1', session_exercise_id: 'exercise-a', set_number: 1, weight_kg: 75, reps: 7, rir: 2, completed: true, completed_at: base.completedAt }] }

describe('pending workout sets', () => {
  beforeEach(() => localStorage.clear())

  it('replaces a pending edit and overlays the server set without changing it', () => {
    queuePendingSet(base)
    const latest = queuePendingSet({ ...base, reps: 9 })
    expect(readPendingSets('user-a')).toHaveLength(1)
    expect(readPendingSets('user-a')[0].reps).toBe(9)
    const displayed = mergePendingSets([item], readPendingSets('user-a'))[0].workout_sets
    expect(displayed).toHaveLength(1)
    expect(displayed[0]).toMatchObject({ reps: 9, pending: true })
    expect(item.workout_sets[0].reps).toBe(7)
    expect(removePendingSet('user-a', 'exercise-a', 1, latest!.revision)).toBe(true)
    expect(mergePendingSets([item], readPendingSets('user-a'))[0].workout_sets[0].reps).toBe(7)
  })

  it('retains failed writes and retries them with the original completion time', async () => {
    queuePendingSet(base)
    const first = await flushPendingSets('user-a', async () => { throw new Error('network unavailable') })
    expect(first).toMatchObject({ synced: 0, remaining: 1, error: 'network unavailable' })
    const persisted: PendingSet[] = []
    const second = await flushPendingSets('user-a', async set => { persisted.push(set) })
    expect(second).toMatchObject({ synced: 1, remaining: 0, error: null })
    expect(persisted[0].completedAt).toBe(base.completedAt)
  })

  it('keeps a newer edit when an older upload completes', async () => {
    queuePendingSet(base)
    const result = await flushPendingSets('user-a', async set => {
      if (set.reps === 8) queuePendingSet({ ...base, reps: 10 })
    })
    expect(result).toMatchObject({ synced: 1, remaining: 0, error: null })
    expect(readPendingSets('user-a')).toHaveLength(0)
  })

  it('never exposes one account queue to another account', () => {
    queuePendingSet(base)
    expect(readPendingSets('user-b')).toEqual([])
    expect(queuePendingSet({ ...base, userId: 'user-b' })).toBeNull()
    clearPendingSetsForOtherUser('user-b')
    expect(readPendingSets('user-a')).toEqual([])
    queuePendingSet({ ...base, userId: 'user-b' })
    expect(readPendingSets('user-b')).toHaveLength(1)
    clearPendingSets()
    expect(readPendingSets('user-b')).toEqual([])
  })
})
