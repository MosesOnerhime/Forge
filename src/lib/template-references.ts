import { supabase } from './supabase'

type ImportReference = {
  source_id: string
  source_bucket: 'exercise-reference-media' | 'workout-reference-videos'
  storage_path: string
  original_name: string
  mime_type: string
  file_size_bytes: number
  exercise_id: string | null
  workout_day_id: string | null
  already_owned: boolean
}

export async function loadRoutineTemplate(templateId: string, userId: string) {
  const client = supabase()
  const { data: programId, error } = await client.rpc('forge_apply_routine_template', {
    p_template_id: templateId, p_reuse_if_active: true,
  })
  if (error) throw error
  try {
    // Read the complete manifest before copying. Owner uploads can refresh its links.
    const references: ImportReference[] = []
    for (let offset = 0; ; offset += 1000) {
      const result = await client.rpc('forge_template_import_targets', {
        p_template_id: templateId, p_program_id: programId,
      }).range(offset, offset + 999)
      if (result.error) throw result.error
      const rows = (result.data ?? []) as ImportReference[]
      references.push(...rows)
      if (rows.length < 1000) break
    }
    for (const reference of references) {
      if (reference.already_owned) continue
      const targetId = reference.exercise_id ?? reference.workout_day_id
      if (!targetId) throw new Error('A reference has no matching exercise or workout day.')
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' } as Record<string, string>)[reference.mime_type]
      if (!extension) throw new Error('Unsupported reference file type.')
      const version = reference.storage_path.split('/').at(-1)!.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
      const path = `${userId}/${targetId}/${reference.source_id}-${version}.${extension}`
      const table = reference.exercise_id ? 'exercise_reference_media' : 'workout_reference_videos'
      const existing = await client.from(table).select('id').eq('storage_path', path).maybeSingle()
      if (existing.error) throw existing.error
      if (existing.data) continue
      // Clean up a prior interrupted copy at this deterministic owner-only path.
      const cleanup = await client.storage.from(reference.source_bucket).remove([path])
      if (cleanup.error) throw cleanup.error
      const copied = await client.storage.from(reference.source_bucket).copy(reference.storage_path, path)
      if (copied.error) throw copied.error
      const result = await client.from(table).upsert({
        user_id: userId,
        ...(reference.exercise_id ? { exercise_id: reference.exercise_id } : { workout_day_id: reference.workout_day_id }),
        storage_path: path, original_name: reference.original_name,
        mime_type: reference.mime_type, file_size_bytes: reference.file_size_bytes,
      }, { onConflict: reference.exercise_id ? 'storage_path' : 'workout_day_id' })
      if (result.error) throw result.error
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : (caught as { message?: string })?.message ?? 'Transfer failed'
    throw new Error(`The routine loaded, but some references could not be copied: ${message}. Load this template again to finish copying; your workout history is unchanged.`)
  }
  return programId as string
}
