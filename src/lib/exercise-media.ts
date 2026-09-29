import { uploadResumableVideo } from './workout-videos'

export const EXERCISE_MEDIA_BUCKET = 'exercise-reference-media'
export const MAX_EXERCISE_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_EXERCISE_VIDEO_BYTES = 50 * 1024 * 1024
export const EXERCISE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const EXERCISE_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/webm': 'webm',
}

export function exerciseMediaError(file: File): string | null {
  const isImage = EXERCISE_IMAGE_TYPES.some(type => type === file.type)
  const isVideo = EXERCISE_VIDEO_TYPES.some(type => type === file.type)
  if (!isImage && !isVideo) return 'Choose a JPG, PNG, WebP, MP4, or WebM file.'
  const limit = isImage ? MAX_EXERCISE_IMAGE_BYTES : MAX_EXERCISE_VIDEO_BYTES
  if (file.size < 1 || file.size > limit) return `Choose a ${isImage ? 'image' : 'video'} between 1 byte and ${limit / (1024 * 1024)} MB.`
  if (!file.name.trim() || file.name.length > 255) return 'Choose a file with a filename under 255 characters.'
  return null
}

export function exerciseMediaPath(userId: string, exerciseId: string, file: File): string {
  return `${userId}/${exerciseId}/${crypto.randomUUID()}.${extensions[file.type]}`
}

export async function uploadExerciseMedia(file: File, path: string, onProgress: (percent: number) => void): Promise<void> {
  const validationError = exerciseMediaError(file)
  if (validationError) throw new Error(validationError)
  if (file.type.startsWith('video/')) {
    await uploadResumableVideo(file, EXERCISE_MEDIA_BUCKET, path, onProgress)
    return
  }
  const { supabase } = await import('./supabase')
  const { error } = await supabase().storage.from(EXERCISE_MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  onProgress(100)
}
