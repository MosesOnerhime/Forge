// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import RoutineTemplatesPage from '../src/app/(app)/workouts/templates/page'

const store = vi.hoisted(() => ({ owner: 'creator', shared: true, rpc: vi.fn(), user: { id: 'me' } }))
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ user: store.user }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/supabase', () => ({ supabase: () => ({
  rpc: store.rpc,
  from: () => ({ select() { return this }, async order() { return { data: [{ id: 'shared', user_id: store.owner, publisher_id: null, is_shared: store.shared, name: 'Shared routine', description: 'A full week', days: Array.from({ length: 7 }, (_, day) => ({ day_of_week: day + 1, name: 'Training', is_rest_day: false, exercises: [{ name: 'Cable Lateral Raise' }] })) }], error: null } } }),
}) }))
let root: ReturnType<typeof createRoot> | null = null
let container: HTMLDivElement | null = null
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  store.owner = 'creator'; store.shared = true
  store.rpc.mockReset().mockResolvedValue({ error: null })
})
afterEach(async () => { if (root) await act(async () => root!.unmount()); container?.remove(); root = null; container = null })
async function render() {
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container)
  await act(async () => root!.render(<RoutineTemplatesPage />))
  return container!
}

it('lets a user load and save a shared routine without offering changes to the creator template', async () => {
  const view = await render()
  expect(view.textContent).toContain('creator’s template stays unchanged')
  expect(view.textContent).toContain('Save your current routine')
  expect(view.textContent).not.toContain('Delete saved template')
  expect(view.textContent).not.toContain('Update from current routine')
  expect(view.textContent).not.toContain('Stop sharing references')
  expect(store.rpc).not.toHaveBeenCalled()
})

it('offers sharing controls only for the creator and persists the toggle', async () => {
  store.owner = 'me'
  const view = await render()
  const button = [...view.querySelectorAll('button')].find(item => item.textContent === 'Stop sharing references')!
  expect(button).toBeTruthy()
  await act(async () => button.click())
  expect(store.rpc).toHaveBeenCalledWith('forge_set_template_sharing', { p_template_id: 'shared', p_shared: false })
})
