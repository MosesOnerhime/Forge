// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SessionPage from '../src/app/(app)/workouts/session/[id]/page'

const authUser = vi.hoisted(() => ({ id: 'user-a' }))
const workoutSet = { id: 'set-a', session_exercise_id: 'item-a', set_number: 1, weight_kg: 60, reps: 8, rir: 2, completed: true, completed_at: null }
const store = {
  session: { id: 'session-a', workout_day_id: 'day-a', started_at: '2026-09-29T10:00:00Z', completed_at: null as string | null, status: 'active', notes: null as string | null, workout_days: { name: 'Back day' } },
  item: { id: 'item-a', session_id: 'session-a', exercise_id: 'exercise-a', sort_order: 1, target_sets: 3, min_reps: 8, max_reps: 12, rest_seconds: 0, notes: null, skipped: false, exercises: { id: 'exercise-a', name: 'Row' }, workout_sets: [workoutSet] as typeof workoutSet[] },
  failFinish: false,
  failSkip: false,
  failDelete: false,
}

class Query {
  private payload: Record<string, unknown> | null = null
  private action: 'read' | 'update' | 'delete' = 'read'
  constructor(private table: string) {}
  select() { return this }
  eq() { return this }
  order() { return this }
  single() { return this.execute() }
  maybeSingle() { return this.execute() }
  update(payload: Record<string, unknown>) { this.action = 'update'; this.payload = payload; return this }
  delete() { this.action = 'delete'; return this }
  private execute(): Promise<{ data: unknown; error: null }> {
    if (this.action === 'update') {
      if (this.table === 'workout_sessions') {
        if (store.failFinish) return Promise.reject(new Error('Network unavailable'))
        Object.assign(store.session, this.payload)
      } else if (this.table === 'session_exercises') {
        if (store.failSkip) return Promise.reject(new Error('Network unavailable'))
        Object.assign(store.item, this.payload)
      } else throw new Error(`Unexpected update of ${this.table}`)
      return Promise.resolve({ data: null, error: null })
    }
    if (this.action === 'delete') {
      if (this.table !== 'workout_sets') throw new Error(`Unexpected delete from ${this.table}`)
      if (store.failDelete) return Promise.reject(new Error('Network unavailable'))
      store.item.workout_sets = []
      return Promise.resolve({ data: null, error: null })
    }
    if (this.table === 'workout_sessions') return Promise.resolve({ data: { ...store.session }, error: null })
    if (this.table === 'session_exercises') return Promise.resolve({ data: [{ ...store.item, workout_sets: [...store.item.workout_sets] }], error: null })
    if (this.table === 'exercises') return Promise.resolve({ data: [{ id: 'exercise-a', name: 'Row' }], error: null })
    if (this.table === 'exercise_reference_media') return Promise.resolve({ data: [], error: null })
    if (this.table === 'workout_reference_videos') return Promise.resolve({ data: null, error: null })
    if (this.table === 'profiles') return Promise.resolve({ data: { timer_notifications: false }, error: null })
    throw new Error(`No fixture for ${this.table}`)
  }
  then(resolve: (value: unknown) => void, reject?: (error: unknown) => void) { return this.execute().then(resolve, reject) }
}

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'session-a' }), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }))
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ user: authUser }) }))
vi.mock('@/components/rest-timer-provider', () => ({ useRestTimer: () => ({ startRest: vi.fn(), dismissRest: vi.fn() }) }))
vi.mock('@/hooks/use-units', () => ({ useUnits: () => 'metric' }))
vi.mock('@/lib/supabase', () => ({ supabase: () => ({ from: (table: string) => new Query(table), rpc: async () => ({ data: [], error: null }) }) }))
vi.mock('@/lib/offline-workout', () => ({ cacheOfflineWorkout: vi.fn() }))
vi.mock('@/lib/pending-sets', () => ({
  PENDING_SETS_CHANGE: 'forge-pending-sets-change',
  PENDING_SETS_KEY: 'forge-pending-sets',
  mergePendingSets: (items: unknown[]) => items,
  readPendingSets: () => [],
  queuePendingSet: vi.fn(),
  removePendingSet: vi.fn(),
  syncPendingSets: vi.fn(),
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderSession() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(<SessionPage />) })
  await act(async () => { await Promise.resolve() })
  return container
}

async function clickButton(page: HTMLDivElement, name: string) {
  const button = [...page.querySelectorAll('button')].find(value => value.textContent?.includes(name) || value.getAttribute('aria-label') === name)
  expect(button, `Button ${name} exists`).toBeTruthy()
  await act(async () => { button!.click() })
  return button as HTMLButtonElement
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  Object.assign(store.session, { status: 'active', completed_at: null, notes: null })
  store.item.skipped = false
  store.item.exercises.name = 'Row'
  store.item.workout_sets = [workoutSet]
  store.failFinish = false
  store.failSkip = false
  store.failDelete = false
})

afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('Workout session request recovery', () => {
  it('keeps Finish available after a rejected request and completes on retry', async () => {
    store.failFinish = true
    const page = await renderSession()
    const finish = await clickButton(page, 'Finish workout')
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Workout could not be finished: Network unavailable')
    expect(finish.disabled).toBe(false)
    expect(store.session.status).toBe('active')
    store.failFinish = false
    await clickButton(page, 'Finish workout')
    expect(store.session.status).toBe('completed')
    expect(page.textContent).toContain('Workout complete.')
  })

  it('preserves a set after failed deletion and removes it on retry', async () => {
    store.failDelete = true
    const page = await renderSession()
    const remove = await clickButton(page, 'Delete set 1')
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Set could not be deleted: Network unavailable')
    expect(remove.disabled).toBe(false)
    expect(store.item.workout_sets).toHaveLength(1)
    store.failDelete = false
    await clickButton(page, 'Delete set 1')
    expect(store.item.workout_sets).toHaveLength(0)
    expect(page.querySelector('[aria-label="Delete set 1"]')).toBeNull()
  })

  it('keeps Skip available after a rejected request and skips on retry', async () => {
    store.failSkip = true
    const page = await renderSession()
    const skip = await clickButton(page, 'Skip')
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Exercise could not be skipped: Network unavailable')
    expect(skip.disabled).toBe(false)
    expect(store.item.skipped).toBe(false)
    store.failSkip = false
    await clickButton(page, 'Skip')
    expect(store.item.skipped).toBe(true)
    expect(page.textContent).toContain('Undo skip')
  })
})

describe('Workout set defaults and exercise references', () => {
  it('prefills the next set from the previous set and exposes upload in the session', async () => {
    const page = await renderSession()
    expect(page.querySelector<HTMLInputElement>('#w-item-a')?.value).toBe('60')
    expect(page.querySelector<HTMLInputElement>('#r-item-a')?.value).toBe('8')
    expect(page.textContent).toContain('Suggested from set 1')
    await clickButton(page, 'Add image or video')
    expect(page.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('shows zero-load dips as body weight and a positive load as weighted dips', async () => {
    store.item.exercises.name = 'Dips'
    store.item.workout_sets = [{ ...workoutSet, weight_kg: 0 }]
    const page = await renderSession()
    expect(page.querySelector<HTMLInputElement>('#w-item-a')?.value).toBe('0')
    expect(page.textContent).toContain('Body weight × 8')
    await act(async () => { root!.unmount() })
    container?.remove()
    root = null
    container = null
    store.item.workout_sets = [{ ...workoutSet, weight_kg: 15 }]
    const weighted = await renderSession()
    expect(weighted.querySelector<HTMLInputElement>('#w-item-a')?.value).toBe('15')
    expect(weighted.textContent).toContain('Weighted dips · +15 kg × 8')
  })
})
