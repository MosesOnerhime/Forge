// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Journal from '../src/app/(app)/journal/page'
import Goals from '../src/app/(app)/goals/page'

const store = vi.hoisted(() => ({
  journal: [{ id: 'note-a', entry_date: '2026-09-30', title: 'Training', content: 'Strong session', created_at: '2026-09-30T10:00:00Z' }],
  goals: [{ id: 'goal-a', name: 'Stay consistent', description: null, start_date: '2026-09-30', target_date: null, active: true }],
  failDelete: false,
  failUpdate: false,
}))
const authUser = vi.hoisted(() => ({ id: 'user-a' }))

class Query {
  private operation = ''
  private payload: { active?: boolean } = {}
  constructor(private table: string) {}
  select() { return this }
  order() { return this }
  limit() { return this }
  delete() { this.operation = 'delete'; return this }
  update(payload: { active: boolean }) { this.operation = 'update'; this.payload = payload; return this }
  eq(_column: string, id: string) {
    if (this.operation === 'delete') {
      if (store.failDelete) return Promise.reject(new Error('Network unavailable'))
      store.journal = store.journal.filter(row => row.id !== id)
      return Promise.resolve({ error: null })
    }
    if (this.operation === 'update') {
      if (store.failUpdate) return Promise.reject(new Error('Network unavailable'))
      store.goals = store.goals.map(row => row.id === id ? { ...row, active: this.payload.active! } : row)
      return Promise.resolve({ error: null })
    }
    throw new Error('Unexpected query')
  }
  then(resolve: (value: unknown) => void, reject?: (error: unknown) => void) {
    const data = this.table === 'journal_entries' ? [...store.journal] : [...store.goals]
    return Promise.resolve({ data, error: null }).then(resolve, reject)
  }
}

vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ user: authUser }) }))
vi.mock('@/lib/supabase', () => ({ supabase: () => ({ from: (table: string) => new Query(table) }) }))

let root: Root | null = null
let container: HTMLDivElement | null = null

async function render(page: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(page) })
  await act(async () => { await Promise.resolve() })
  return container
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  store.journal = [{ id: 'note-a', entry_date: '2026-09-30', title: 'Training', content: 'Strong session', created_at: '2026-09-30T10:00:00Z' }]
  store.goals = [{ id: 'goal-a', name: 'Stay consistent', description: null, start_date: '2026-09-30', target_date: null, active: true }]
  store.failDelete = false
  store.failUpdate = false
  vi.stubGlobal('confirm', () => true)
})

afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  container?.remove()
  root = null
  container = null
  vi.unstubAllGlobals()
})

it('reports a failed journal deletion and permits retry', async () => {
  const page = await render(<Journal />)
  const remove = page.querySelector<HTMLButtonElement>('[aria-label="Delete note"]')!
  store.failDelete = true
  await act(async () => { remove.click() })
  expect(page.querySelector('[role="alert"]')?.textContent).toContain('Network unavailable')
  expect(remove.disabled).toBe(false)
  expect(store.journal).toHaveLength(1)
  store.failDelete = false
  await act(async () => { remove.click() })
  expect(store.journal).toHaveLength(0)
  expect(page.textContent).toContain('Your notes will live here.')
})

it('reports a failed goal toggle and permits retry', async () => {
  const page = await render(<Goals />)
  const toggle = [...page.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Mark done'))!
  store.failUpdate = true
  await act(async () => { toggle.click() })
  expect(page.querySelector('[role="alert"]')?.textContent).toContain('Network unavailable')
  expect(toggle.disabled).toBe(false)
  expect(store.goals[0].active).toBe(true)
  store.failUpdate = false
  await act(async () => { toggle.click() })
  expect(store.goals[0].active).toBe(false)
  expect(page.textContent).toContain('Reopen')
})
