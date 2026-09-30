'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ImageSquare, Trash, UploadSimple, X } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { ReferenceVideoTile } from '@/components/reference-video-tile'
import { errorMessage, type ExerciseReferenceMedia as Media } from '@/lib/data'
import { EXERCISE_MEDIA_BUCKET, exerciseMediaError, exerciseMediaPath, uploadExerciseMedia } from '@/lib/exercise-media'

type Props = { exerciseId: string; exerciseName: string; userId: string; manage?: boolean }

async function signedMediaUrl(item: Media) {
  const { data, error } = await supabase().storage.from(EXERCISE_MEDIA_BUCKET).createSignedUrl(item.storage_path, 7200)
  if (error) throw error
  if (!data?.signedUrl) throw new Error('No view link was returned.')
  return data.signedUrl
}

export function ExerciseReferenceMedia({ exerciseId, exerciseName, userId, manage = false }: Props) {
  const fileInputId = useId()
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [openingId, setOpeningId] = useState('')
  const [media, setMedia] = useState<Media[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [active, setActive] = useState<{ item: Media; url: string } | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const { data, error: queryError } = await supabase().from('exercise_reference_media')
          .select('id,exercise_id,storage_path,original_name,mime_type,file_size_bytes,created_at')
          .eq('exercise_id', exerciseId).order('created_at', { ascending: false })
        if (queryError) throw queryError
        if (!live) return
        const rows = data as Media[]
        setMedia(rows)
        setLoading(false)
        for (const item of rows) {
          void signedMediaUrl(item).then(url => {
            if (live) setUrls(previous => ({ ...previous, [item.id]: url }))
          }).catch(() => {})
        }
      } catch (caught) {
        if (live) { setError(`References could not be loaded: ${errorMessage(caught)}`); setLoading(false) }
      }
    })()
    return () => { live = false }
  }, [exerciseId])

  useEffect(() => {
    if (active && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal()
  }, [active])

  async function view(item: Media) {
    setOpeningId(item.id); setError('')
    try {
      const url = await signedMediaUrl(item)
      setUrls(previous => ({ ...previous, [item.id]: url }))
      setActive({ item, url })
    } catch (caught) { setError(`Reference could not be opened: ${errorMessage(caught)}`) }
    finally { setOpeningId('') }
  }

  function showSaved(item: Media) {
    setMedia(previous => [item, ...previous])
    void signedMediaUrl(item).then(url => setUrls(previous => ({ ...previous, [item.id]: url }))).catch(() => {})
    setFile(null)
    setFileKey(previous => previous + 1)
    setAddOpen(false)
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
      showSaved(data as Media)
      setNotice(`${file.type.startsWith('image/') ? 'Image' : 'Video'} saved for ${exerciseName}.`)
    } catch (caught) {
      if (uploaded) {
        const { data: existing, error: lookupError } = await client.from('exercise_reference_media')
          .select('id,exercise_id,storage_path,original_name,mime_type,file_size_bytes,created_at')
          .eq('storage_path', path).maybeSingle()
        if (existing) {
          showSaved(existing as Media)
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

  if (!manage && !loading && media.length === 0 && !error) return null

  return <section className="reference-section" aria-label={`${exerciseName} references`}>
    <div className="reference-head">
      <strong>References{media.length > 0 ? ` · ${media.length}` : ''}</strong>
      {manage && <button type="button" className="btn ghost small" aria-expanded={addOpen} onClick={() => setAddOpen(value => !value)}>
        <UploadSimple size={16} /> {addOpen ? 'Close upload' : 'Add image or video'}
      </button>}
    </div>
    <div className="reference-content">
      {error && <div className="notice" role="alert">{error}</div>}
      {notice && <p className="muted small" role="status">{notice}</p>}
      {loading ? <p className="muted small">Loading references…</p> : media.length ? <div className="reference-rail" aria-label={`${exerciseName} reference gallery`}>{media.map(item => {
        const isImage = item.mime_type.startsWith('image/')
        if (!isImage) return <ReferenceVideoTile key={item.id} name={item.original_name} sizeBytes={item.file_size_bytes} url={urls[item.id]}
          expandLabel={`Expand video reference ${item.original_name}`} onExpand={() => void view(item)}
          onRemove={manage ? () => void remove(item) : undefined} disabled={busy || openingId === item.id} />
        return <article className="reference-card" key={item.id}>
          <button type="button" className="reference-open" disabled={busy || openingId === item.id} onClick={() => void view(item)} aria-label={`Open ${isImage ? 'image' : 'video'} reference ${item.original_name}`}>
            <span className="reference-thumb">
              {urls[item.id]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={urls[item.id]} alt="" loading="lazy" />
                : <span className="reference-fallback"><ImageSquare size={32} /></span>}
            </span>
            <span className="reference-title">{item.original_name}</span>
            <span className="reference-kind">Image · {(item.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
          </button>
          {manage && <button type="button" className="reference-remove" disabled={busy} onClick={() => void remove(item)} aria-label={`Remove ${item.original_name}`}><Trash size={17} /></button>}
        </article>
      })}</div> : manage ? <p className="muted small">No references yet. Add an image or video to this exercise.</p> : null}
      {manage && addOpen && !loading && <form className="stack reference-upload" onSubmit={upload}>
        <div><label htmlFor={fileInputId}>Add an image or video</label><input key={fileKey} id={fileInputId} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} /><p className="muted small" style={{ margin: '8px 0 0' }}>JPG, PNG, or WebP up to 10 MB; MP4 or WebM up to 50 MB. Private to your account.</p></div>
        {busy && progress > 0 && <div className="muted small" role="status">Uploading {progress}%</div>}
        <button className="btn primary small" type="submit" disabled={busy || !file} style={{ justifySelf: 'start' }}><UploadSimple size={16} />{busy ? 'Saving…' : 'Save reference'}</button>
      </form>}
    </div>
    <dialog ref={dialogRef} className="reference-dialog" onClose={() => setActive(null)} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }} aria-label={`${exerciseName} reference viewer`}>
      {active && <><div className="reference-dialog-head"><strong>{active.item.original_name}</strong><button type="button" className="btn ghost small" onClick={() => dialogRef.current?.close()} aria-label="Close reference"><X size={20} /></button></div>
        {active.item.mime_type.startsWith('image/')
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={active.url} alt={`${exerciseName} reference: ${active.item.original_name}`} />
          : <video src={active.url} controls autoPlay playsInline preload="metadata" aria-label={`${exerciseName} reference video`} />}
      </>}
    </dialog>
  </section>
}
