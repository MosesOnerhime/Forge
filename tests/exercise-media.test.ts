import { describe, expect, it } from 'vitest'
import { exerciseMediaError, exerciseMediaPath, MAX_EXERCISE_IMAGE_BYTES, MAX_EXERCISE_VIDEO_BYTES } from '../src/lib/exercise-media'

describe('Exercise reference files', () => {
  it('accepts supported media and rejects unsupported, empty, and oversized files', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']) {
      expect(exerciseMediaError(new File(['a'], 'reference', { type }))).toBeNull()
    }
    expect(exerciseMediaError(new File(['a'], 'reference.gif', { type: 'image/gif' }))).toContain('JPG')
    expect(exerciseMediaError(new File([], 'empty.mp4', { type: 'video/mp4' }))).toContain('50 MB')
    const image = new File(['a'], 'huge.jpg', { type: 'image/jpeg' })
    Object.defineProperty(image, 'size', { value: MAX_EXERCISE_IMAGE_BYTES + 1 })
    expect(exerciseMediaError(image)).toContain('10 MB')
    const video = new File(['a'], 'huge.mp4', { type: 'video/mp4' })
    Object.defineProperty(video, 'size', { value: MAX_EXERCISE_VIDEO_BYTES + 1 })
    expect(exerciseMediaError(video)).toContain('50 MB')
  })

  it('scopes each object path to its owner and exercise', () => {
    const file = new File(['a'], 'Cable Lateral Raise.mp4', { type: 'video/mp4' })
    expect(exerciseMediaPath('owner-a', 'exercise-b', file)).toMatch(/^owner-a\/exercise-b\/[0-9a-f-]+\.mp4$/)
  })
})
