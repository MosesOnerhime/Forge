// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkoutReferenceVideo } from '../src/components/workout-reference-video'
import { MAX_WORKOUT_VIDEO_BYTES, workoutVideoError, workoutVideoPath } from '../src/lib/workout-videos'

type Video = { id: string; workout_day_id: string; storage_path: string; original_name: string; mime_type: string; file_size_bytes: number; created_at: string }
const uploadStub = vi.hoisted(() => vi.fn(async (_file: File, _path: string, progress: (percent: number) => void) => progress(100)))
const store: { video: Video | null; removed: string[]; failCleanup: boolean; uploads: Record<string, unknown>[] } = {
  video: null, removed: [], failCleanup: false, uploads: [],
}

class Query {
  private action: 'read' | 'upsert' | 'delete' = 'read'
  private payload: Record<string, unknown> = {}
  constructor(private table: string) {}
  select() { return this }
  eq() { return this }
  maybeSingle() { return Promise.resolve({ data: store.video, error: null }) }
  upsert(payload: Record<string, unknown>) { this.action = 'upsert'; this.payload = payload; return this }
  delete() { this.action = 'delete'; return this }
  single() {
    if (this.table !== 'workout_reference_videos' || this.action !== 'upsert') throw new Error('Unexpected single query')
    store.uploads.push(this.payload)
    store.video = { ...this.payload, id: 'video-a', created_at: '2026-09-29T12:00:00Z' } as Video
    return Promise.resolve({ data: store.video, error: null })
  }
  then(resolve: (value: unknown) => void, reject?: (error: unknown) => void) {
    if (this.table !== 'workout_reference_videos' || this.action !== 'delete') throw new Error('Unexpected query')
    store.video = null
    return Promise.resolve({ data: null, error: null }).then(resolve, reject)
  }
}

const client = {
  from: (table: string) => new Query(table),
  storage: {
    from: (bucket: string) => {
      if (bucket !== 'workout-reference-videos') throw new Error('Wrong bucket')
      return {
        createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/private-video' }, error: null }),
        remove: async (paths: string[]) => {
          store.removed.push(...paths)
          if (store.failCleanup) { store.failCleanup = false; return { error: new Error('Storage unavailable') } }
          return { error: null }
        },
      }
    },
  },
}

vi.mock('@/lib/supabase', () => ({ supabase: () => client }))
vi.mock('@/lib/workout-videos', async importOriginal => ({
  ...await importOriginal<typeof import('../src/lib/workout-videos')>(),
  uploadWorkoutVideo: uploadStub,
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderVideo(manage = true) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(<WorkoutReferenceVideo dayId="day-a" dayName="Back day" userId="user-a" manage={manage} />) })
  await act(async () => { await Promise.resolve() })
  return container
}

async function selectAndUpload(page: HTMLDivElement) {
  await act(async () => { page.querySelector<HTMLButtonElement>('[aria-expanded]')!.click() })
  const input = page.querySelector<HTMLInputElement>('input[type="file"]')!
  const file = new File(['video bytes'], 'form-demo.mp4', { type: 'video/mp4' })
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => { page.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  store.video = null
  store.removed = []
  store.uploads = []
  store.failCleanup = false
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

describe('Workout reference videos', () => {
  it('validates file type, size, and owner/day path', () => {
    expect(workoutVideoError(new File(['a'], 'clip.mp4', { type: 'video/mp4' }))).toBeNull()
    expect(workoutVideoError(new File(['a'], 'clip.mov', { type: 'video/quicktime' }))).toContain('MP4 or WebM')
    expect(workoutVideoError(new File([], 'empty.webm', { type: 'video/webm' }))).toContain('50 MB')
    const huge = new File(['a'], 'huge.mp4', { type: 'video/mp4' })
    Object.defineProperty(huge, 'size', { value: MAX_WORKOUT_VIDEO_BYTES + 1 })
    expect(workoutVideoError(huge)).toContain('50 MB')
    expect(MAX_WORKOUT_VIDEO_BYTES).toBe(52428800)
    expect(workoutVideoPath('user-a', 'day-a', new File(['a'], 'clip.webm', { type: 'video/webm' }))).toMatch(/^user-a\/day-a\/.+\.webm$/)
  })

  it('uploads a private video and opens a fresh signed playback link', async () => {
    const page = await renderVideo()
    expect(page.textContent).toContain('No video saved')
    await selectAndUpload(page)
    expect(uploadStub).toHaveBeenCalledOnce()
    expect(store.uploads[0]).toMatchObject({ user_id: 'user-a', workout_day_id: 'day-a', original_name: 'form-demo.mp4' })
    expect(store.uploads[0].storage_path).toMatch(/^user-a\/day-a\/.+\.mp4$/)
    expect(page.textContent).toContain('Reference video saved.')
    expect(page.querySelector('.reference-rail video')).toBeTruthy()
    const watch = page.querySelector<HTMLButtonElement>('[aria-label="Play workout reference form-demo.mp4"]')!
    await act(async () => { watch.click() })
    expect(page.querySelector('dialog[open] video')?.getAttribute('src')).toBe('https://example.test/private-video')
  })

  it('retains the new video and offers old-file cleanup after cleanup fails', async () => {
    store.video = { id: 'video-a', workout_day_id: 'day-a', storage_path: 'user-a/day-a/old.mp4', original_name: 'old.mp4', mime_type: 'video/mp4', file_size_bytes: 10, created_at: '2026-09-29T10:00:00Z' }
    store.failCleanup = true
    const page = await renderVideo()
    await selectAndUpload(page)
    expect(store.video?.storage_path).toMatch(/^user-a\/day-a\/.+\.mp4$/)
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('old file could not be removed')
    const retry = [...page.querySelectorAll('button')].find(button => button.textContent?.includes('Retry cleanup'))!
    await act(async () => { retry.click() })
    expect(page.querySelector('[role="alert"]')).toBeNull()
    expect(store.removed).toEqual(['user-a/day-a/old.mp4', 'user-a/day-a/old.mp4'])
  })

  it('hides an absent video from the workout session', async () => {
    const page = await renderVideo(false)
    expect(page.textContent).toBe('')
  })
})
