// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Today from '../src/app/(app)/today/page'

type Result = { data: unknown; error: Error | null }
const responses: Record<string, Result> = {}
const calls: string[] = []
const pushes: string[] = []
const authUser = vi.hoisted(() => ({ id: 'user-a' }))

class Query implements PromiseLike<Result> {
  private orderBy = ''
  constructor(private table: string) { calls.push(table) }
  select() { return this }
  eq() { return this }
  lte() { return this }
  not() { return this }
  limit() { return this }
  order(column: string) { this.orderBy = column; return this }
  maybeSingle() { return this.execute() }
  private execute(): Promise<Result> {
    const result = responses[this.table]
    if (!result) throw new Error(`No fixture for ${this.table}`)
    if (this.orderBy === 'sort_order' && Array.isArray(result.data)) {
      return Promise.resolve({ ...result, data: [...result.data].sort((a, b) => a.sort_order - b.sort_order) })
    }
    return Promise.resolve(result)
  }
  then<TResult1 = Result, TResult2 = never>(onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
}

const client = {
  from: (table: string) => new Query(table),
  rpc: async (name: string) => { calls.push(name); return { data: name === 'forge_start_workout' ? 'session-new' : null, error: null } },
}

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: (path: string) => pushes.push(path) }) }))
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }))
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ user: authUser }) }))
vi.mock('@/hooks/use-units', () => ({ useUnits: () => 'metric' }))
vi.mock('@/lib/supabase', () => ({ supabase: () => client }))

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderToday() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(<Today />) })
  await act(async () => { await Promise.resolve() })
  return container
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  calls.length = 0
  pushes.length = 0
  Object.assign(responses, {
    workout_sessions: { data: null, error: null },
    nutrition_targets: { data: { calories: 2900, protein_g: 170, carbs_g: 375, fat_g: 80 }, error: null },
    food_entries: { data: [], error: null },
    body_measurements: { data: [{ id: 'weight-2', measured_at: '2026-09-29', weight_kg: 78.4 }, { id: 'weight-1', measured_at: '2026-09-22', weight_kg: 78 }], error: null },
    workout_programs: { data: { id: 'program-a' }, error: null },
    workout_days: { data: { id: 'day-a', day_of_week: 1, name: 'Back day', is_rest_day: false, estimated_minutes_min: 85, estimated_minutes_max: 110 }, error: null },
    program_exercises: { data: [{ id: 'plan-2', sort_order: 2, exercises: { name: 'Row' } }, { id: 'plan-1', sort_order: 1, exercises: { name: 'Pull-up' } }], error: null },
  })
})

afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  container?.remove()
  root = null
  container = null
})

describe('Today dashboard', () => {
  it('shows ordered exercises and starts the selected workout', async () => {
    const page = await renderToday()
    expect([...page.querySelectorAll('.today-exercises li')].map(item => item.textContent)).toEqual(['01Pull-up', '02Row'])
    expect(page.textContent).toContain('2 exercises · 85–110 min')
    expect(page.textContent).toContain('+0.4 kg since Sep 22')
    const start = [...page.querySelectorAll('button')].find(button => button.textContent?.includes('Start workout'))
    expect(start).toBeTruthy()
    await act(async () => { start!.click() })
    expect(calls).toContain('forge_start_workout')
    expect(pushes).toEqual(['/workouts/session/session-new'])
  })

  it('shows recovery without querying exercises or offering Start workout', async () => {
    responses.workout_days = { data: { id: 'day-rest', day_of_week: 2, name: 'Recovery', is_rest_day: true, estimated_minutes_min: null, estimated_minutes_max: null }, error: null }
    const page = await renderToday()
    expect(page.textContent).toContain('Recovery day')
    expect(page.querySelector('.today-exercises')).toBeNull()
    expect(calls).not.toContain('program_exercises')
    expect([...page.querySelectorAll('button')].some(button => button.textContent?.includes('Start workout'))).toBe(false)
  })

  it('shows a failed plan query instead of leaving a loading message', async () => {
    responses.workout_programs = { data: null, error: new Error('Plan query failed') }
    const page = await renderToday()
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Plan query failed')
    expect(page.textContent).toContain('Plan unavailable')
    expect(page.textContent).not.toContain('Loading your plan')
  })
})
