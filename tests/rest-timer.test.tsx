// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RestTimerProvider, useRestTimer } from '../src/components/rest-timer-provider'
import { parseRestTimer, remainingRestSeconds, restTimerKey } from '../src/lib/rest-timer-store'

vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ user: { id: 'user-a' } }) }))

function StartButton() {
  const { startRest } = useRestTimer()
  return <button onClick={() => startRest(90, false)}>Log set</button>
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-30T10:00:00Z'))
  localStorage.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
})

it('keeps the rest countdown through app navigation and restores it after a reload', async () => {
  await act(async () => { root.render(<RestTimerProvider><StartButton /></RestTimerProvider>) })
  await act(async () => { container.querySelector('button')!.click() })
  expect(localStorage.getItem(restTimerKey('user-a'))).toContain('"duration":90')

  await act(async () => { vi.advanceTimersByTime(20_000) })
  await act(async () => { root.render(<RestTimerProvider><div>Today page</div></RestTimerProvider>) })
  expect(container.textContent).toContain('Today page')
  expect(container.querySelector('[role="timer"]')?.getAttribute('aria-label')).toContain('1:10')

  await act(async () => root.unmount())
  root = createRoot(container)
  vi.setSystemTime(new Date('2026-09-30T10:00:35Z'))
  await act(async () => { root.render(<RestTimerProvider><div>Nutrition page</div></RestTimerProvider>) })
  expect(container.querySelector('[role="timer"]')?.getAttribute('aria-label')).toContain('0:55')
  await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Pause timer"]')!.click() })
  await act(async () => { vi.advanceTimersByTime(10_000) })
  expect(container.querySelector('[role="timer"]')?.getAttribute('aria-label')).toContain('0:55')
  await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Resume timer"]')!.click() })
  await act(async () => { vi.advanceTimersByTime(5_000) })
  expect(container.querySelector('[role="timer"]')?.getAttribute('aria-label')).toContain('0:50')
})

it('syncs another browser tab without accepting a different account timer', async () => {
  await act(async () => { root.render(<RestTimerProvider><div>Today page</div></RestTimerProvider>) })
  const record = JSON.stringify({ duration: 60, remaining: 60, endAt: Date.now() + 60_000, notify: false, notified: false })
  await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: restTimerKey('user-b'), newValue: record })) })
  expect(container.querySelector('[role="timer"]')).toBeNull()
  await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: restTimerKey('user-a'), newValue: record })) })
  expect(container.querySelector('[role="timer"]')?.getAttribute('aria-label')).toContain('1:00')
})

it('rejects broken saved timers and derives remaining time from the wall clock', () => {
  expect(parseRestTimer('{')).toBeNull()
  expect(parseRestTimer('{"duration":90,"remaining":90,"endAt":0,"notify":"yes","notified":false}')).toBeNull()
  const timer = parseRestTimer('{"duration":90,"remaining":90,"endAt":100000,"notify":false,"notified":false}')!
  expect(remainingRestSeconds(timer, 25000)).toBe(75)
  expect(remainingRestSeconds(timer, 120000)).toBe(0)
})
