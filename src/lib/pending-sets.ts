import type { SessionExercise, WorkoutSet } from './data'
import { supabase } from './supabase'

export const PENDING_SETS_KEY = 'forge:pending-sets:v1'
export const PENDING_SETS_CHANGE = 'forge:pending-sets-change'

export type PendingSet = {
  userId: string
  sessionId: string
  sessionExerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  rir: number | null
  completedAt: string
  revision: string
}

type Queue = { version: 1; userId: string; sets: PendingSet[] }
type SyncResult = { synced: number; remaining: number; error: string | null }

function announce(synced = false) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PENDING_SETS_CHANGE, { detail: { synced } }))
}

function validSet(value: unknown): value is PendingSet {
  if (!value || typeof value !== 'object') return false
  const set = value as PendingSet
  return typeof set.userId === 'string' && typeof set.sessionId === 'string' && typeof set.sessionExerciseId === 'string'
    && Number.isInteger(set.setNumber) && set.setNumber >= 1 && set.setNumber <= 50
    && Number.isFinite(set.weightKg) && set.weightKg >= 0 && set.weightKg <= 99999.99
    && Number.isInteger(set.reps) && set.reps >= 0
    && (set.rir === null || (Number.isFinite(set.rir) && set.rir >= 0 && set.rir <= 10))
    && typeof set.completedAt === 'string' && typeof set.revision === 'string'
}

function readQueue(): Queue | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PENDING_SETS_KEY)
    if (!raw) return null
    const queue = JSON.parse(raw) as Queue
    if (queue.version !== 1 || typeof queue.userId !== 'string' || !Array.isArray(queue.sets) || !queue.sets.every(validSet)) return null
    return queue
  } catch { return null }
}

export function readPendingSets(userId: string): PendingSet[] {
  const queue = readQueue()
  return queue?.userId === userId ? queue.sets.filter(set => set.userId === userId) : []
}

function writePendingSets(userId: string, sets: PendingSet[], synced = false): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(PENDING_SETS_KEY, JSON.stringify({ version: 1, userId, sets } satisfies Queue))
    announce(synced)
    return true
  } catch { return false }
}

export function queuePendingSet(input: Omit<PendingSet, 'revision'>): PendingSet | null {
  const existing = readQueue()
  if (existing && existing.userId !== input.userId) return null
  const set = { ...input, revision: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}` }
  if (!validSet(set)) return null
  const rest = (existing?.sets ?? []).filter(row => row.sessionExerciseId !== set.sessionExerciseId || row.setNumber !== set.setNumber)
  return writePendingSets(input.userId, [...rest, set]) ? set : null
}

export function removePendingSet(userId: string, sessionExerciseId: string, setNumber: number, revision: string, synced = false): boolean {
  const sets = readPendingSets(userId)
  const next = sets.filter(set => set.sessionExerciseId !== sessionExerciseId || set.setNumber !== setNumber || set.revision !== revision)
  return next.length < sets.length && writePendingSets(userId, next, synced)
}

export function clearPendingSets() {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(PENDING_SETS_KEY); announce() } catch { /* Storage may be unavailable. */ }
}

export function clearPendingSetsForOtherUser(userId: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(PENDING_SETS_KEY)
    if (raw && readQueue()?.userId !== userId) clearPendingSets()
  } catch { clearPendingSets() }
}

export function mergePendingSets(items: SessionExercise[], pending: PendingSet[]): SessionExercise[] {
  return items.map(item => {
    const queued = pending.filter(set => set.sessionId === item.session_id && set.sessionExerciseId === item.id)
    if (!queued.length) return item
    const byNumber = new Map<number, WorkoutSet>(item.workout_sets.map(set => [set.set_number, set]))
    for (const set of queued) byNumber.set(set.setNumber, {
      id: `pending:${set.revision}`,
      session_exercise_id: item.id,
      set_number: set.setNumber,
      weight_kg: set.weightKg,
      reps: set.reps,
      rir: set.rir,
      completed: true,
      completed_at: set.completedAt,
      pending: true,
    })
    return { ...item, workout_sets: [...byNumber.values()].sort((a, b) => a.set_number - b.set_number) }
  })
}

function message(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Could not reach the server.'
}

export async function flushPendingSets(userId: string, persist: (set: PendingSet) => Promise<void>): Promise<SyncResult> {
  let synced = 0
  for (let attempt = 0; attempt < 1000; attempt++) {
    const current = readPendingSets(userId)[0]
    if (!current) return { synced, remaining: 0, error: null }
    try { await persist(current) } catch (error) { return { synced, remaining: readPendingSets(userId).length, error: message(error) } }
    if (removePendingSet(userId, current.sessionExerciseId, current.setNumber, current.revision, true)) synced++
    else if (readPendingSets(userId).some(set => set.revision === current.revision)) return { synced, remaining: readPendingSets(userId).length, error: 'The synced set could not be cleared from browser storage.' }
  }
  return { synced, remaining: readPendingSets(userId).length, error: 'Too many pending sets to sync in one pass.' }
}

const running = new Map<string, Promise<SyncResult>>()
export function syncPendingSets(userId: string): Promise<SyncResult> {
  const active = running.get(userId)
  if (active) return active
  const task = flushPendingSets(userId, async set => {
    const { error } = await supabase().from('workout_sets').upsert({
      user_id: userId,
      session_exercise_id: set.sessionExerciseId,
      set_number: set.setNumber,
      weight_kg: set.weightKg,
      reps: set.reps,
      rir: set.rir,
      completed: true,
      completed_at: set.completedAt,
    }, { onConflict: 'session_exercise_id,set_number' })
    if (error) throw error
  }).finally(() => running.delete(userId))
  running.set(userId, task)
  return task
}
