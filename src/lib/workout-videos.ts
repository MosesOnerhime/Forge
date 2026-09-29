import { Upload } from 'tus-js-client'
import { supabase } from './supabase'

export const WORKOUT_VIDEO_BUCKET = 'workout-reference-videos'
export const MAX_WORKOUT_VIDEO_BYTES = 50 * 1024 * 1024
export const WORKOUT_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const

export function workoutVideoError(file: File): string | null {
  if (!WORKOUT_VIDEO_TYPES.some(type => type === file.type)) return 'Choose an MP4 or WebM video.'
  if (file.size < 1 || file.size > MAX_WORKOUT_VIDEO_BYTES) return 'Choose a video between 1 byte and 50 MB.'
  if (!file.name.trim() || file.name.length > 255) return 'Choose a video with a filename under 255 characters.'
  return null
}

export function workoutVideoPath(userId: string, dayId: string, file: File): string {
  return `${userId}/${dayId}/${crypto.randomUUID()}.${file.type === 'video/webm' ? 'webm' : 'mp4'}`
}

export async function uploadWorkoutVideo(file: File, path: string, onProgress: (percent: number) => void): Promise<void> {
  const validationError = workoutVideoError(file)
  if (validationError) throw new Error(validationError)
  const client = supabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) throw new Error('Sign in again before uploading a video.')
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!projectUrl) throw new Error('Supabase project URL is missing.')
  const storageOrigin = projectUrl.replace(/\.supabase\.co\/?$/, '.storage.supabase.co').replace(/\/$/, '')

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${storageOrigin}/storage/v1/upload/resumable`,
      headers: { authorization: `Bearer ${data.session!.access_token}` },
      metadata: {
        bucketName: WORKOUT_VIDEO_BUCKET,
        objectName: path,
        contentType: file.type,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
      storeFingerprintForResuming: false,
      removeFingerprintOnSuccess: true,
      onProgress: (sent, total) => onProgress(Math.min(100, Math.round(sent / total * 100))),
      onSuccess: () => resolve(),
      onError: error => reject(error),
    })
    upload.start()
  })
}
