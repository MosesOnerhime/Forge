import { supabase } from './supabase'
import { clearOfflineWorkout } from './offline-workout'
import { clearPendingSets } from './pending-sets'
import { restTimerKey } from './rest-timer-store'

export type ProfileAction = 'reset' | 'delete'
type MediaObject = { bucket_id: string; name: string }

export async function changeProfile(action: ProfileAction, confirmation: string) {
  const expected = action === 'delete' ? 'DELETE' : 'RESET'
  if (confirmation !== expected) throw new Error(`Type ${expected} to confirm.`)
  const client = supabase()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sign in again before changing your profile.')
  let previousBatch = ''
  // Re-read after removal so accounts with more than the API row limit are complete.
  for (;;) {
    const { data, error } = await client.rpc('forge_profile_media')
    if (error) throw error
    const objects = (data ?? []) as MediaObject[]
    if (!objects.length) break
    const fingerprint = JSON.stringify(objects)
    if (fingerprint === previousBatch) throw new Error('Uploads are still present. Retry when Storage is available.')
    previousBatch = fingerprint
    for (const bucket of ['progress-photos', 'workout-reference-videos', 'exercise-reference-media']) {
      const paths = objects.filter(object => object.bucket_id === bucket).map(object => object.name)
      if (paths.some(path => !path.startsWith(`${user.id}/`))) throw new Error('Upload ownership could not be verified.')
      for (let offset = 0; offset < paths.length; offset += 1000) {
        const { error: removeError } = await client.storage.from(bucket).remove(paths.slice(offset, offset + 1000))
        if (removeError) throw new Error(`Uploads could not all be removed: ${removeError.message}. Some files may already be removed. Retry to finish.`)
      }
    }
  }
  const { error: changeError } = await client.rpc('forge_reset_profile', {
    p_expected_user: user.id, p_confirmation: confirmation, p_delete_account: action === 'delete',
  })
  if (changeError) throw new Error(`Profile change could not be confirmed: ${changeError.message}. Uploads may already be removed. Refresh Settings before retrying.`)
  clearOfflineWorkout()
  clearPendingSets()
  try { window.localStorage.removeItem(restTimerKey(user.id)) } catch { /* Storage may be unavailable. */ }
  if (action === 'delete') {
    // The Auth row and refresh sessions are gone; discard this browser's JWT too.
    await client.auth.signOut({ scope: 'local' }).catch(() => {})
  }
}
