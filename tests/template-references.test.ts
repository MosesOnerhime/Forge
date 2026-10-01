import { beforeEach, expect, it, vi } from 'vitest'
import { loadRoutineTemplate } from '../src/lib/template-references'

const store = vi.hoisted(() => ({
  refs: [] as Record<string, unknown>[], saved: new Set<string>(), copy: vi.fn(), remove: vi.fn(), writes: vi.fn(), apply: vi.fn(), failWrite: false,
}))
vi.mock('@/lib/supabase', () => ({ supabase: () => ({
  rpc: (name: string, args: Record<string, unknown>) => {
    if (name === 'forge_apply_routine_template') { store.apply(args); return Promise.resolve({ data: 'new-program', error: null }) }
    return { range: async (start: number, end: number) => ({ data: store.refs.slice(start, end + 1), error: null }) }
  },
  from: (table: string) => {
    let path = ''
    return {
      select() { return this }, eq(_key: string, value: string) { path = value; return this },
      async maybeSingle() { return { data: store.saved.has(path) ? { id: path } : null, error: null } },
      async upsert(payload: { storage_path: string }, options: unknown) {
        if (store.failWrite) return { error: { message: 'Write unavailable' } }
        store.saved.add(payload.storage_path); store.writes(table, payload, options)
        return { error: null }
      },
    }
  },
  storage: { from: (bucket: string) => ({ copy: (source: string, target: string) => store.copy(bucket, source, target), remove: (paths: string[]) => store.remove(bucket, paths) }) },
}) }))

beforeEach(() => {
  vi.clearAllMocks(); store.saved.clear(); store.failWrite = false
  store.copy.mockResolvedValue({ error: null }); store.remove.mockResolvedValue({ error: null })
  store.refs = [
    { source_id: 'video', source_bucket: 'exercise-reference-media', storage_path: 'creator/exercise/video.mp4', original_name: 'Demo.mp4', mime_type: 'video/mp4', file_size_bytes: 2000, exercise_id: 'my-exercise', workout_day_id: null, already_owned: false },
    { source_id: 'image', source_bucket: 'exercise-reference-media', storage_path: 'creator/exercise/image.jpg', original_name: 'Form.jpg', mime_type: 'image/jpeg', file_size_bytes: 300, exercise_id: 'my-exercise', workout_day_id: null, already_owned: false },
    { source_id: 'day', source_bucket: 'workout-reference-videos', storage_path: 'creator/day/overview.mp4', original_name: 'Day.mp4', mime_type: 'video/mp4', file_size_bytes: 1000, exercise_id: null, workout_day_id: 'my-day', already_owned: false },
  ]
})

it('copies exercise images/videos and the day video into the new owner folder', async () => {
  expect(await loadRoutineTemplate('shared', 'me')).toBe('new-program')
  expect(store.copy.mock.calls.map(call => call[2])).toEqual(['me/my-exercise/video-video.mp4', 'me/my-exercise/image-image.jpg', 'me/my-day/day-overview.mp4'])
  expect(store.writes.mock.calls.every(call => call[1].user_id === 'me')).toBe(true)
  expect(store.copy.mock.calls.every(call => call[1].startsWith('creator/'))).toBe(true)
})

it('reuses the active imported routine and avoids duplicate media on retry', async () => {
  await loadRoutineTemplate('shared', 'me')
  await loadRoutineTemplate('shared', 'me')
  expect(store.copy).toHaveBeenCalledTimes(3)
  expect(store.apply).toHaveBeenLastCalledWith({ p_template_id: 'shared', p_reuse_if_active: true })
})

it('reports partial transfer and retries a copied file whose metadata failed', async () => {
  store.failWrite = true
  await expect(loadRoutineTemplate('shared', 'me')).rejects.toThrow('Load this template again')
  store.failWrite = false
  await loadRoutineTemplate('shared', 'me')
  expect(store.remove).toHaveBeenCalledWith('exercise-reference-media', ['me/my-exercise/video-video.mp4'])
  expect(store.writes).toHaveBeenCalledTimes(3)
})

it('keeps original references intact and skips files already attached to the owner exercise', async () => {
  store.refs[0].already_owned = true
  await loadRoutineTemplate('own', 'me')
  expect(store.copy).toHaveBeenCalledTimes(2)
  expect(store.remove.mock.calls.every(call => call[1].every((path: string) => path.startsWith('me/')))).toBe(true)
})

it('reads beyond the API page size and imports every reference', async () => {
  store.refs = Array.from({ length: 1001 }, (_, index) => ({ ...store.refs[0], source_id: String(index) }))
  await loadRoutineTemplate('shared', 'me')
  expect(store.copy).toHaveBeenCalledTimes(1001)
})

it('copies a replaced day video using its new immutable file version', async () => {
  await loadRoutineTemplate('shared', 'me')
  store.refs[2].storage_path = 'creator/day/replacement.mp4'
  await loadRoutineTemplate('shared', 'me')
  expect(store.copy).toHaveBeenCalledTimes(4)
  expect(store.copy).toHaveBeenLastCalledWith('workout-reference-videos', 'creator/day/replacement.mp4', 'me/my-day/day-replacement.mp4')
})
