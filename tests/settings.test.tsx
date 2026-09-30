// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Settings from '../src/app/(app)/settings/page'

const store = vi.hoisted(() => ({
  failTargetSave: false,
  target: null as null | { id: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; effective_from: string },
  saves: 0,
}))

class Query {
  constructor(private table: string) {}
  select() { return this }
  lte() { return this }
  order() { return this }
  limit() { return this }
  maybeSingle() {
    if (this.table === 'profiles') return Promise.resolve({ data: { display_name: 'Test', units: 'metric', default_rest_seconds: 120, timer_notifications: false }, error: null })
    if (this.table === 'nutrition_targets') return Promise.resolve({ data: store.target, error: null })
    throw new Error(`Unexpected read: ${this.table}`)
  }
  async upsert(payload: { calories: number; protein_g: number; carbs_g: number; fat_g: number; effective_from: string }) {
    if (this.table !== 'nutrition_targets') throw new Error(`Unexpected save: ${this.table}`)
    if (store.failTargetSave) throw new Error('Network unavailable')
    store.saves++
    store.target = { ...payload, id: 'target-a' }
    return { error: null }
  }
}

vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ user: { id: 'user-a', email: 'test@example.com' } }) }))
vi.mock('@/lib/supabase', () => ({ supabase: () => ({ from: (table: string) => new Query(table) }) }))
vi.mock('@/components/export-data', () => ({ ExportData: () => null }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  store.failTargetSave = false
  store.target = null
  store.saves = 0
})

afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  container?.remove()
  root = null
  container = null
})

it('keeps target fields empty when this account has not chosen them', async () => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(<Settings />) })
  await act(async () => { await Promise.resolve() })
  expect(container.textContent).toContain('No target saved yet')
  expect(container.querySelector<HTMLInputElement>('#Calories')?.value).toBe('')
})

it('permits retry after a rejected target save', async () => {
  store.target = { id: 'target-a', calories: 2100, protein_g: 130, carbs_g: 230, fat_g: 70, effective_from: '2026-09-30' }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(<Settings />) })
  await act(async () => { await Promise.resolve() })
  const form = container.querySelectorAll('form')[1]
  store.failTargetSave = true
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Network unavailable')
  expect(form.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false)
  expect(store.saves).toBe(0)

  store.failTargetSave = false
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  expect(store.saves).toBe(1)
  expect(store.target).toMatchObject({ calories: 2100, protein_g: 130, carbs_g: 230, fat_g: 70 })
  expect(container.textContent).toContain('Nutrition targets saved.')
})
