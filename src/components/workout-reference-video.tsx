'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { UploadSimple, X } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { ReferenceVideoTile } from '@/components/reference-video-tile'
import { errorMessage, type WorkoutReferenceVideo } from '@/lib/data'
import { MAX_WORKOUT_VIDEO_BYTES, WORKOUT_VIDEO_BUCKET, uploadWorkoutVideo, workoutVideoError, workoutVideoPath } from '@/lib/workout-videos'

type Props = { dayId: string; dayName: string; userId: string; manage?: boolean }

async function signedWorkoutUrl(video: WorkoutReferenceVideo) {
  const { data, error } = await supabase().storage.from(WORKOUT_VIDEO_BUCKET).createSignedUrl(video.storage_path, 7200)
  if (error) throw error
  if (!data?.signedUrl) throw new Error('No playback link was returned.')
  return data.signedUrl
}

export function WorkoutReferenceVideo({ dayId, dayName, userId, manage = false }: Props) {
  const [video, setVideo] = useState<WorkoutReferenceVideo | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [playbackUrl, setPlaybackUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cleanupPath, setCleanupPath] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const { data, error: queryError } = await supabase().from('workout_reference_videos')
          .select('id,workout_day_id,storage_path,original_name,mime_type,file_size_bytes,created_at')
          .eq('workout_day_id', dayId).maybeSingle()
        if (!live) return
        if (queryError) setError(`Reference video could not be loaded: ${queryError.message}`)
        else {
          const saved = data as WorkoutReferenceVideo | null
          setVideo(saved)
          if (saved) void signedWorkoutUrl(saved).then(url => { if (live) setPreviewUrl(url) }).catch(() => {})
        }
      } catch (caught) {
        if (live) setError(`Reference video could not be loaded: ${errorMessage(caught)}`)
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => { live = false }
  }, [dayId])

  useEffect(() => {
    if (playbackUrl && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal()
  }, [playbackUrl])

  async function play() {
    if (!video || busy) return
    setBusy(true); setError('')
    try {
      setPlaybackUrl(await signedWorkoutUrl(video))
    } catch (caught) { setError(`Reference video could not be opened: ${errorMessage(caught)}`) }
    finally { setBusy(false) }
  }

  async function upload(event: FormEvent) {
    event.preventDefault()
    if (!manage || !file || busy || loading) return
    const validationError = workoutVideoError(file)
    if (validationError) { setError(validationError); return }
    setBusy(true); setError(''); setNotice(''); setProgress(0)
    const client = supabase()
    const path = workoutVideoPath(userId, dayId, file)
    const previousPath = video?.storage_path
    let uploaded = false
    let saved = false
    try {
      await uploadWorkoutVideo(file, path, setProgress)
      uploaded = true
      const { data, error: saveError } = await client.from('workout_reference_videos').upsert({
        user_id: userId,
        workout_day_id: dayId,
        storage_path: path,
        original_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      }, { onConflict: 'workout_day_id' }).select('id,workout_day_id,storage_path,original_name,mime_type,file_size_bytes,created_at').single()
      if (saveError) throw saveError
      saved = true
      setVideo(data as WorkoutReferenceVideo)
      setPlaybackUrl('')
      void signedWorkoutUrl(data as WorkoutReferenceVideo).then(setPreviewUrl).catch(() => setPreviewUrl(''))
      setFile(null)
      setUploadOpen(false)
      if (fileInput.current) fileInput.current.value = ''
      setNotice(previousPath ? 'Reference video replaced.' : 'Reference video saved.')
      if (previousPath && previousPath !== path) {
        try {
          const { error: cleanupError } = await client.storage.from(WORKOUT_VIDEO_BUCKET).remove([previousPath])
          if (cleanupError) throw cleanupError
          setCleanupPath('')
        } catch (caught) {
          setCleanupPath(previousPath)
          setError(`The new video is ready, but the old file could not be removed: ${errorMessage(caught)}`)
        }
      }
    } catch (caught) {
      if (saved) {
        setError(`The new video is ready, but cleanup failed: ${errorMessage(caught)}`)
      } else if (uploaded) {
        try {
          const { data: current, error: lookupError } = await client.from('workout_reference_videos')
            .select('id,workout_day_id,storage_path,original_name,mime_type,file_size_bytes,created_at')
            .eq('workout_day_id', dayId).maybeSingle()
          if (lookupError) throw lookupError
          if (current?.storage_path === path) {
            setVideo(current as WorkoutReferenceVideo)
            setPlaybackUrl('')
            void signedWorkoutUrl(current as WorkoutReferenceVideo).then(setPreviewUrl).catch(() => setPreviewUrl(''))
            setFile(null)
            setUploadOpen(false)
            if (fileInput.current) fileInput.current.value = ''
            setNotice('Reference video saved.')
            if (previousPath && previousPath !== path) setCleanupPath(previousPath)
            setError(previousPath ? 'The video was saved, but old-file cleanup needs a retry.' : '')
          } else {
            const { error: cleanupError } = await client.storage.from(WORKOUT_VIDEO_BUCKET).remove([path])
            if (cleanupError) {
              setCleanupPath(path)
              setError(`Video could not be saved, and its uploaded file could not be removed: ${cleanupError.message}`)
            } else setError(`Video could not be saved: ${errorMessage(caught)}`)
          }
        } catch {
          setError('The upload finished, but its save could not be confirmed. Refresh this workout before retrying.')
        }
      } else setError(`Video could not be uploaded: ${errorMessage(caught)}`)
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!manage || !video || busy || !window.confirm(`Remove the reference video for ${dayName}?`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const client = supabase()
      const { error: fileError } = await client.storage.from(WORKOUT_VIDEO_BUCKET).remove([video.storage_path])
      if (fileError) throw new Error(`Video file could not be removed: ${fileError.message}`)
      const { error: rowError } = await client.from('workout_reference_videos').delete().eq('id', video.id)
      if (rowError) throw new Error(`Video file was removed, but its record remains. Retry removal: ${rowError.message}`)
      setVideo(null); setPlaybackUrl(''); setPreviewUrl(''); setNotice('Reference video removed.')
    } catch (caught) { setError(errorMessage(caught)) }
    finally { setBusy(false) }
  }

  async function retryCleanup() {
    if (!cleanupPath || busy) return
    setBusy(true); setError('')
    try {
      const { error: cleanupError } = await supabase().storage.from(WORKOUT_VIDEO_BUCKET).remove([cleanupPath])
      if (cleanupError) throw cleanupError
      setCleanupPath(''); setNotice('Unused video file removed.')
    } catch (caught) { setError(`Unused video file could not be removed: ${errorMessage(caught)}`) }
    finally { setBusy(false) }
  }

  if (!manage && !video && !error) return null

  return <section className="card" style={{ marginTop: 16 }} aria-label={`Reference video for ${dayName}`}>
    <div className="reference-head"><h2>Reference video</h2>{manage && <button className="btn ghost small" type="button" aria-expanded={uploadOpen} onClick={() => setUploadOpen(value => !value)}><UploadSimple size={16} /> {uploadOpen ? 'Close upload' : video ? 'Replace video' : 'Add video'}</button>}</div>
    {error && <div className="notice" role="alert" style={{ marginTop: 12 }}>{error}{cleanupPath && <button className="btn small" type="button" disabled={busy} onClick={retryCleanup} style={{ marginLeft: 10 }}>Retry cleanup</button>}</div>}
    {notice && <p className="muted small" role="status">{notice}</p>}
    {loading ? <p className="muted small">Checking for a reference video…</p> : video ? <div className="reference-rail" style={{ marginTop: 12 }}><ReferenceVideoTile name={video.original_name} sizeBytes={video.file_size_bytes} url={previewUrl || undefined}
      expandLabel={`Expand workout reference ${video.original_name}`} onExpand={() => void play()}
      onRemove={manage ? () => void remove() : undefined} disabled={busy} /></div> : <p className="muted small">No video saved for this workout yet.</p>}
    {manage && uploadOpen && <form onSubmit={upload} className="stack" style={{ marginTop: 18 }}>
      <div><label htmlFor={`workout-video-${dayId}`}>{video ? 'Replace video' : 'Upload video'}</label><input ref={fileInput} id={`workout-video-${dayId}`} type="file" accept="video/mp4,video/webm" disabled={busy || loading} onChange={event => setFile(event.target.files?.[0] ?? null)} /><p className="muted small" style={{ margin: '8px 0 0' }}>MP4 or WebM, up to {MAX_WORKOUT_VIDEO_BYTES / (1024 * 1024)} MB. Private to your account.</p></div>
      {busy && progress > 0 && <div role="status" className="muted small">Uploading {progress}%</div>}
      <button className="btn primary" type="submit" disabled={busy || loading || !file} style={{ justifySelf: 'start' }}><UploadSimple size={17} /> {busy ? 'Saving video…' : video ? 'Replace reference' : 'Save reference'}</button>
    </form>}
    <dialog ref={dialogRef} className="reference-dialog" onClose={() => setPlaybackUrl('')} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }} aria-label={`Reference video for ${dayName}`}>
      {video && playbackUrl && <><div className="reference-dialog-head"><strong>{video.original_name}</strong><button type="button" className="btn ghost small" onClick={() => dialogRef.current?.close()} aria-label="Close reference"><X size={20} /></button></div><video controls autoPlay playsInline preload="metadata" src={playbackUrl} aria-label={`Reference video for ${dayName}`} /></>}
    </dialog>
  </section>
}
