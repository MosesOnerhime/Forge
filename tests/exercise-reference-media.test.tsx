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
      order: async () => ({ data: saved, error: null }),
      insert(payload: Record<string, unknown>) { saved.push({ id: 'media-a', ...payload, created_at: '2026-09-29T12:00:00Z' }); return this },
      single: async () => ({ data: saved.at(-1), error: null }),
    }
  },
  storage: { from: (bucket: string) => {
    if (bucket !== 'exercise-reference-media') throw new Error('Wrong bucket')
    return { createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/private-image' }, error: null }) }
  } },
}
vi.mock('@/lib/supabase', () => ({ supabase: () => client }))
vi.mock('@/lib/exercise-media', async importOriginal => ({
  ...await importOriginal<typeof import('../src/lib/exercise-media')>(), uploadExerciseMedia: uploadStub,
}))

let root: Root | null = null
let container: HTMLDivElement | null = null
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); saved.length = 0; uploadStub.mockClear() })
afterEach(async () => { if (root) await act(async () => { root!.unmount() }); container?.remove(); root = null; container = null })

it('uploads an image for an exercise and opens a private view link', async () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  await act(async () => { root!.render(<ExerciseReferenceMedia exerciseId="exercise-a" exerciseName="Cable Lateral Raise" userId="user-a" manage />) })
  await act(async () => { container!.querySelector('button')!.click() })
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
  const file = new File(['image'], 'angle.jpg', { type: 'image/jpeg' })
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => { container!.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  expect(uploadStub).toHaveBeenCalledOnce()
  expect(saved[0]).toMatchObject({ user_id: 'user-a', exercise_id: 'exercise-a', mime_type: 'image/jpeg', original_name: 'angle.jpg' })
  expect(saved[0].storage_path).toMatch(/^user-a\/exercise-a\/.+\.jpg$/)
  const view = [...container.querySelectorAll('button')].find(button => button.textContent === 'View')!
  await act(async () => { view.click() })
  expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.test/private-image')
})

it('lets a workout session view existing references without upload controls', async () => {
  saved.push({ id: 'media-a', exercise_id: 'exercise-a', storage_path: 'user-a/exercise-a/clip.mp4', original_name: 'clip.mp4', mime_type: 'video/mp4', file_size_bytes: 100, created_at: '2026-09-29T12:00:00Z' })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  await act(async () => { root!.render(<ExerciseReferenceMedia exerciseId="exercise-a" exerciseName="Cable Lateral Raise" userId="user-a" />) })
  await act(async () => { container!.querySelector('button')!.click() })
  expect(container.textContent).toContain('clip.mp4')
  expect(container.querySelector('input[type="file"]')).toBeNull()
  const view = [...container.querySelectorAll('button')].find(button => button.textContent === 'View')!
  await act(async () => { view.click() })
  expect(container.querySelector('video')?.getAttribute('src')).toBe('https://example.test/private-image')
})
