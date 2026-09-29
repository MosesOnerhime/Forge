'use client'

import { useState, type FormEvent } from 'react'
import { ImageSquare, Play, Trash, UploadSimple } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { errorMessage, type ExerciseReferenceMedia as Media } from '@/lib/data'
import { EXERCISE_MEDIA_BUCKET, exerciseMediaError, exerciseMediaPath, uploadExerciseMedia } from '@/lib/exercise-media'

type Props = { exerciseId: string; exerciseName: string; userId: string; manage?: boolean }

export function ExerciseReferenceMedia({ exerciseId, exerciseName, userId, manage = false }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [media, setMedia] = useState<Media[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function toggle() {
    if (open) { setOpen(false); return }
    setOpen(true); setLoading(true); setError('')
    try {
      const { data, error: queryError } = await supabase().from('exercise_reference_media')
        .select('id,exercise_id,storage_path,original_name,mime_type,file_size_bytes,created_at')
        .eq('exercise_id', exerciseId).order('created_at', { ascending: false })
      if (queryError) throw queryError
      setMedia(data as Media[])
    } catch (caught) { setError(`References could not be loaded: ${errorMessage(caught)}`) }
    finally { setLoading(false) }
  }

  async function view(item: Media) {
    setBusy(true); setError('')
    try {
      const { data, error: signError } = await supabase().storage.from(EXERCISE_MEDIA_BUCKET).createSignedUrl(item.storage_path, 7200)
      if (signError) throw signError
      if (!data?.signedUrl) throw new Error('No view link was returned.')
      setUrls(previous => ({ ...previous, [item.id]: data.signedUrl }))
    } catch (caught) { setError(`Reference could not be opened: ${errorMessage(caught)}`) }
    finally { setBusy(false) }
  }

  async function upload(event: FormEvent) {
    event.preventDefault()
    if (!manage || !file || busy) return
    const validationError = exerciseMediaError(file)
    if (validationError) { setError(validationError); return }
    setBusy(true); setError(''); setNotice(''); setProgress(0)
    const client = supabase()
    const path = exerciseMediaPath(userId, exerciseId, file)
    let uploaded = false
    try {
      await uploadExerciseMedia(file, path, setProgress)
      uploaded = true
      const { data, error: saveError } = await client.from('exercise_reference_media').insert({
        user_id: userId, exercise_id: exerciseId, storage_path: path,
        original_name: file.name, mime_type: file.type, file_size_bytes: file.size,
      }).select('id,exercise_id,storage_path,original_name,mime_type,file_size_bytes,created_at').single()
      if (saveError) throw saveError
      setMedia(previous => [data as Media, ...previous])
      setFile(null); setFileKey(previous => previous + 1)
      setNotice(`${file.type.startsWith('image/') ? 'Image' : 'Video'} saved for ${exerciseName}.`)
    } catch (caught) {
      if (uploaded) {
        const { data: existing, error: lookupError } = await client.from('exercise_reference_media')
          .select('id,exercise_id,storage_path,original_name,mime_type,file_size_bytes,created_at')
          .eq('storage_path', path).maybeSingle()
        if (existing) {
          setMedia(previous => [existing as Media, ...previous])
          setFile(null); setFileKey(previous => previous + 1)
          setNotice('Reference saved.'); setError('')
        } else if (lookupError) {
          setError('The upload finished, but its save could not be confirmed. Refresh before retrying.')
        } else {
          const { error: cleanupError } = await client.storage.from(EXERCISE_MEDIA_BUCKET).remove([path])
          setError(cleanupError
            ? `Reference could not be saved. Its uploaded file also needs cleanup: ${cleanupError.message}`
            : `Reference could not be saved: ${errorMessage(caught)}`)
        }
      } else setError(`Reference could not be uploaded: ${errorMessage(caught)}`)
    } finally { setBusy(false) }
  }

  async function remove(item: Media) {
    if (!manage || busy || !window.confirm(`Remove ${item.original_name} from ${exerciseName}?`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const client = supabase()
      const { error: fileError } = await client.storage.from(EXERCISE_MEDIA_BUCKET).remove([item.storage_path])
      if (fileError) throw new Error(`File could not be removed: ${fileError.message}`)
      const { error: rowError } = await client.from('exercise_reference_media').delete().eq('id', item.id)
      if (rowError) throw new Error(`File was removed, but its record remains. Retry removal: ${rowError.message}`)
      setMedia(previous => previous.filter(row => row.id !== item.id))
      setUrls(previous => { const next = { ...previous }; delete next[item.id]; return next })
      setNotice('Reference removed.')
    } catch (caught) { setError(errorMessage(caught)) }
    finally { setBusy(false) }
  }

  return <div style={{ marginTop: 12 }}>
    <button type="button" className="btn ghost small" aria-expanded={open} aria-controls={`exercise-media-${exerciseId}`} onClick={toggle}>
      <ImageSquare size={17} /> {open ? 'Hide references' : 'Reference images & videos'}
    </button>
    {open && <div id={`exercise-media-${exerciseId}`} className="stack" style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 14 }}>
      {error && <div className="notice" role="alert">{error}</div>}
      {notice && <p className="muted small" role="status">{notice}</p>}
      {loading ? <p className="muted small">Loading references…</p> : media.length ? media.map(item => <div key={item.id} className="item">
        <div className="row wrap" style={{ justifyContent: 'space-between', gap: 10 }}>
          <div><strong style={{ overflowWrap: 'anywhere' }}>{item.original_name}</strong><div className="muted small">{item.mime_type.startsWith('image/') ? 'Image' : 'Video'} · {(item.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</div></div>
          <div className="row wrap" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn small" disabled={busy} onClick={() => void view(item)}>{item.mime_type.startsWith('image/') ? <ImageSquare size={16} /> : <Play size={16} />}{urls[item.id] ? 'Refresh link' : 'View'}</button>
            {manage && <button type="button" className="btn ghost small danger" disabled={busy} onClick={() => void remove(item)} aria-label={`Remove ${item.original_name}`}><Trash size={16} /></button>}
          </div>
        </div>
        {urls[item.id] && (item.mime_type.startsWith('image/')
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={urls[item.id]} alt={`${exerciseName} reference: ${item.original_name}`} style={{ display: 'block', maxWidth: '100%', maxHeight: 420, objectFit: 'contain', marginTop: 12, borderRadius: 12 }} />
          : <video src={urls[item.id]} controls playsInline preload="none" aria-label={`${exerciseName} reference video`} style={{ display: 'block', width: '100%', maxHeight: 420, marginTop: 12, borderRadius: 12, background: 'var(--background)' }} />)}
      </div>) : <p className="muted small">No reference images or videos for this exercise yet.</p>}
      {manage && !loading && <form className="stack" onSubmit={upload}>
        <div><label htmlFor={`exercise-media-file-${exerciseId}`}>Add an image or video</label><input key={fileKey} id={`exercise-media-file-${exerciseId}`} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /><p className="muted small" style={{ margin: '8px 0 0' }}>JPG, PNG, or WebP up to 10 MB; MP4 or WebM up to 50 MB. Private to your account.</p></div>
        {busy && progress > 0 && <div className="muted small" role="status">Uploading {progress}%</div>}
        <button className="btn primary small" type="submit" disabled={busy || !file} style={{ justifySelf: 'start' }}><UploadSimple size={16} />{busy ? 'Saving…' : 'Save reference'}</button>
      </form>}
    </div>}
  </div>
}
