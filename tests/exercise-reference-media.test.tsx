// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ExerciseReferenceMedia } from '../src/components/exercise-reference-media'

const uploadStub = vi.hoisted(() => vi.fn(async (_file: File, _path: string, progress: (percent: number) => void) => progress(100)))
const saved: Record<string, unknown>[] = []
const client = {
  from: (table: string) => {
    if (table !== 'exercise_reference_media') throw new Error('Wrong table')
    return {
      select() { return this },
      eq() { return this },
      order: async () => ({ data: [...saved], error: null }),
      insert(payload: Record<string, unknown>) { saved.push({ id: `media-${saved.length + 1}`, ...payload, created_at: '2026-09-29T12:00:00Z' }); return this },
      single: async () => ({ data: saved.at(-1), error: null }),
    }
  },
  storage: { from: (bucket: string) => {
    if (bucket !== 'exercise-reference-media') throw new Error('Wrong bucket')
    return { createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://example.test/${path}` }, error: null }) }
  } },
}
vi.mock('@/lib/supabase', () => ({ supabase: () => client }))
vi.mock('@/lib/exercise-media', async importOriginal => ({
  ...await importOriginal<typeof import('../src/lib/exercise-media')>(), uploadExerciseMedia: uploadStub,
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

async function render(manage = false) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(<ExerciseReferenceMedia exerciseId="exercise-a" exerciseName="Cable Lateral Raise" userId="user-a" manage={manage} />) })
  return container
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  saved.length = 0
  uploadStub.mockClear()
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')) }
})
afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  container?.remove()
  root = null
  container = null
})

it('shows an existing image immediately and enlarges it on click', async () => {
  saved.push({ id: 'image-a', exercise_id: 'exercise-a', storage_path: 'user-a/exercise-a/angle.jpg', original_name: 'angle.jpg', mime_type: 'image/jpeg', file_size_bytes: 1024, created_at: '2026-09-29T12:00:00Z' })
  const page = await render()
  expect(page.querySelector('.reference-rail img')?.getAttribute('src')).toBe('https://example.test/user-a/exercise-a/angle.jpg')
  expect(page.querySelector('button[aria-expanded]')).toBeNull()
  await act(async () => { page.querySelector<HTMLButtonElement>('[aria-label="Open image reference angle.jpg"]')!.click() })
  expect(page.querySelector('dialog[open] img')?.getAttribute('alt')).toContain('Cable Lateral Raise reference')
})

it('uploads an image from the exercise and shows its new card', async () => {
  const page = await render(true)
  expect(page.querySelector('input[type="file"]')).toBeNull()
  await act(async () => { page.querySelector<HTMLButtonElement>('[aria-expanded]')!.click() })
  const input = page.querySelector<HTMLInputElement>('input[type="file"]')!
  const file = new File(['image'], 'angle.jpg', { type: 'image/jpeg' })
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => { page.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  expect(uploadStub).toHaveBeenCalledOnce()
  expect(saved[0]).toMatchObject({ user_id: 'user-a', exercise_id: 'exercise-a', mime_type: 'image/jpeg', original_name: 'angle.jpg' })
  expect(saved[0].storage_path).toMatch(/^user-a\/exercise-a\/.+\.jpg$/)
  expect(page.querySelector('[aria-label="Open image reference angle.jpg"]')).toBeTruthy()
  expect(page.querySelector('input[type="file"]')).toBeNull()
})

it('shows a saved video in the workout gallery and opens playback', async () => {
  saved.push({ id: 'video-a', exercise_id: 'exercise-a', storage_path: 'user-a/exercise-a/clip.mp4', original_name: 'clip.mp4', mime_type: 'video/mp4', file_size_bytes: 100, created_at: '2026-09-29T12:00:00Z' })
  const page = await render()
  expect(page.querySelector('.reference-rail video')?.getAttribute('src')).toContain('clip.mp4')
  expect(page.querySelector('input[type="file"]')).toBeNull()
  await act(async () => { page.querySelector<HTMLButtonElement>('[aria-label="Open video reference clip.mp4"]')!.click() })
  expect(page.querySelector('dialog[open] video')?.getAttribute('src')).toBe('https://example.test/user-a/exercise-a/clip.mp4')
})
