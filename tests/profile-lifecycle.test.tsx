// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ProfileLifecycle } from '../src/components/profile-lifecycle'
import { changeProfile } from '../src/lib/profile-lifecycle'
import { OFFLINE_WORKOUT_KEY } from '../src/lib/offline-workout'
import { PENDING_SETS_KEY } from '../src/lib/pending-sets'
import { restTimerKey } from '../src/lib/rest-timer-store'

const store = vi.hoisted(() => ({
  rpc: vi.fn(), remove: vi.fn(), signOut: vi.fn(),
  getUser: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ supabase: () => ({
  rpc: store.rpc, storage: { from: () => ({ remove: store.remove }) },
  auth: { getUser: store.getUser, signOut: store.signOut },
}) }))
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.resetAllMocks()
  localStorage.clear()
  store.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null })
  store.rpc.mockResolvedValue({ data: [], error: null })
  store.remove.mockResolvedValue({ error: null })
  store.signOut.mockResolvedValue({ error: null })
})
afterEach(() => localStorage.clear())

it('requires exact confirmation before requesting any destructive action', async () => {
  await expect(changeProfile('delete', 'RESET')).rejects.toThrow('Type DELETE')
  expect(store.getUser).not.toHaveBeenCalled()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => root.render(<ProfileLifecycle />))
    const button = [...container.querySelectorAll('button')].find(node => node.textContent === 'Delete profile')!
    await act(async () => button.click())
    expect(container.textContent).toContain('email and password will no longer sign in')
    expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true)
    await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(store.rpc).not.toHaveBeenCalled()
    await act(async () => [...container.querySelectorAll('button')].find(node => node.textContent === 'Cancel')!.click())
    expect(container.querySelector('form')).toBeNull()
  } finally {
    await act(async () => root.unmount()); container.remove()
  }
})

it('removes all uploads in API-sized batches before resetting and clearing local records', async () => {
  const files = Array.from({ length: 1001 }, (_, index) => ({ bucket_id: 'exercise-reference-media', name: `owner/exercise/${index}.mp4` }))
  store.rpc.mockResolvedValueOnce({ data: files.slice(0, 1000), error: null })
    .mockResolvedValueOnce({ data: files.slice(1000), error: null })
  for (const key of [OFFLINE_WORKOUT_KEY, PENDING_SETS_KEY, restTimerKey('owner')]) localStorage.setItem(key, 'saved')
  await changeProfile('reset', 'RESET')
  expect(store.remove.mock.calls.map(args => args[0].length)).toEqual([1000, 1])
  expect(store.rpc).toHaveBeenLastCalledWith('forge_reset_profile', { p_expected_user: 'owner', p_confirmation: 'RESET', p_delete_account: false })
  expect(store.remove.mock.invocationCallOrder[1]).toBeLessThan(store.rpc.mock.invocationCallOrder[3])
  expect(localStorage.length).toBe(0)
  expect(store.signOut).not.toHaveBeenCalled()
})

it('stops at a failed upload removal and allows retry without clearing local sets', async () => {
  store.rpc.mockResolvedValueOnce({ data: [{ bucket_id: 'progress-photos', name: 'owner/photo.jpg' }], error: null })
  store.remove.mockResolvedValueOnce({ error: { message: 'Network unavailable' } })
  localStorage.setItem(PENDING_SETS_KEY, 'saved')
  await expect(changeProfile('reset', 'RESET')).rejects.toThrow('Retry to finish')
  expect(store.rpc).toHaveBeenCalledTimes(1)
  expect(localStorage.getItem(PENDING_SETS_KEY)).toBe('saved')
  await changeProfile('reset', 'RESET')
  expect(store.rpc).toHaveBeenLastCalledWith('forge_reset_profile', expect.any(Object))
})

it('deletes the account and signs out locally only after database confirmation', async () => {
  await changeProfile('delete', 'DELETE')
  expect(store.rpc).toHaveBeenLastCalledWith('forge_reset_profile', { p_expected_user: 'owner', p_confirmation: 'DELETE', p_delete_account: true })
  expect(store.signOut).toHaveBeenCalledWith({ scope: 'local' })
})

it('refuses foreign paths and retains local data if the database operation fails', async () => {
  store.rpc.mockResolvedValueOnce({ data: [{ bucket_id: 'progress-photos', name: 'other/photo.jpg' }], error: null })
  await expect(changeProfile('delete', 'DELETE')).rejects.toThrow('ownership')
  expect(store.remove).not.toHaveBeenCalled()
  store.rpc.mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ error: { message: 'Remaining upload' } })
  localStorage.setItem(PENDING_SETS_KEY, 'saved')
  await expect(changeProfile('delete', 'DELETE')).rejects.toThrow('Uploads may already be removed')
  expect(store.signOut).not.toHaveBeenCalled()
  expect(localStorage.getItem(PENDING_SETS_KEY)).toBe('saved')
})
