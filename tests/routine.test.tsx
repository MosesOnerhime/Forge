// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RoutineEditor from '../src/app/(app)/workouts/routine/page'

const authUser = vi.hoisted(() => ({ id: 'user-a' }))
const day = { id: 'day-a', day_of_week: 1, name: 'Back day', is_rest_day: false, estimated_minutes_min: 85, estimated_minutes_max: 110 }
type PlanItem = { id: string; workout_day_id: string; exercise_id: string; sort_order: number; target_sets: number; min_reps: number; max_reps: number; rest_seconds_min: number; notes: null; exercises: { id: string; name: string } }
const plans: PlanItem[] = [
  { id: 'item-a', workout_day_id: day.id, exercise_id: 'exercise-a', sort_order: 1, target_sets: 3, min_reps: 8, max_reps: 12, rest_seconds_min: 120, notes: null, exercises: { id: 'exercise-a', name: 'Pull-up' } },
  { id: 'item-b', workout_day_id: day.id, exercise_id: 'exercise-b', sort_order: 2, target_sets: 3, min_reps: 8, max_reps: 12, rest_seconds_min: 120, notes: null, exercises: { id: 'exercise-b', name: 'Row' } },
]
const store = { failReorder: false, rpcCalls: [] as { name: string; args: Record<string, unknown> }[] }

class Query {
  constructor(private table: string) {}
  select() { return this }
  eq() { return this }
  order() { return this }
  in() { return this }
  maybeSingle() { return this.execute() }
  private execute() {
    if (this.table === 'workout_programs') return Promise.resolve({ data: { id: 'program-a' }, error: null })
    if (this.table === 'workout_days') return Promise.resolve({ data: [day], error: null })
    if (this.table === 'exercises') return Promise.resolve({ data: plans.map(item => item.exercises), error: null })
    if (this.table === 'program_exercises') return Promise.resolve({ data: plans.map(item => ({ ...item })), error: null })
    if (this.table === 'profiles') return Promise.resolve({ data: { default_rest_seconds: 120 }, error: null })
    throw new Error(`No fixture for ${this.table}`)
  }
  then(resolve: (value: unknown) => void, reject?: (error: unknown) => void) { return this.execute().then(resolve, reject) }
}

const client = {
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: Record<string, unknown>) => {
    store.rpcCalls.push({ name, args })
    if (store.failReorder) throw new Error('Network unavailable')
    if (name !== 'forge_reorder_program_exercise') throw new Error(`Unexpected RPC ${name}`)
    const current = plans.find(item => item.id === args.p_item_id)!
    const other = plans.find(item => item.sort_order === current.sort_order + Number(args.p_direction))!
    ;[current.sort_order, other.sort_order] = [other.sort_order, current.sort_order]
    return { data: true, error: null }
  },
}

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }))
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ user: authUser }) }))
vi.mock('@/lib/utils', () => ({ dayNumber: () => 1 }))
vi.mock('@/lib/supabase', () => ({ supabase: () => client }))

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderRoutine() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(<RoutineEditor />) })
  await act(async () => { await Promise.resolve() })
  return container
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  plans[0].sort_order = 1
  plans[1].sort_order = 2
  store.failReorder = false
  store.rpcCalls = []
})

afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  container?.remove()
  root = null
  container = null
})

describe('Routine reordering', () => {
  it('uses one atomic request and leaves controls available after a rejected request', async () => {
    const page = await renderRoutine()
    const move = page.querySelector<HTMLButtonElement>('[aria-label="Move Pull-up down"]')!
    expect(move).toBeTruthy()
    store.failReorder = true
    await act(async () => { move.click() })
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Exercise order could not be changed: Network unavailable')
    expect(move.disabled).toBe(false)
    expect(plans.map(item => item.sort_order)).toEqual([1, 2])
    expect(store.rpcCalls).toEqual([{ name: 'forge_reorder_program_exercise', args: { p_item_id: 'item-a', p_direction: 1 } }])

    store.failReorder = false
    await act(async () => { move.click() })
    expect(plans.map(item => item.sort_order)).toEqual([2, 1])
    expect([...page.querySelectorAll('.item h3')].map(item => item.textContent)).toEqual(['Row', 'Pull-up'])
    expect(store.rpcCalls).toHaveLength(2)
  })
})
