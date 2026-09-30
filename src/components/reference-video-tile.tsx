'use client'

import { useRef } from 'react'
import { ArrowsOut, Play, Trash } from '@phosphor-icons/react'

export function ReferenceVideoTile({ name, sizeBytes, url, expandLabel, onExpand, onRemove, disabled = false }: {
  name: string
  sizeBytes: number
  url: string | undefined
  expandLabel: string
  onExpand: () => void
  onRemove?: () => void
  disabled?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  return <article className="reference-card">
    <div className="reference-thumb">
      {url ? <video ref={videoRef} src={`${url}#t=0.1`} controls preload="metadata" playsInline aria-label={`Play ${name} inline`} />
        : <span className="reference-fallback"><Play size={32} /></span>}
    </div>
    <span className="reference-title">{name}</span>
    <span className="reference-kind">Video · {(sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
    <button className="btn ghost small reference-expand" type="button" disabled={disabled} onClick={() => { videoRef.current?.pause(); onExpand() }} aria-label={expandLabel}><ArrowsOut size={16} /> Expand</button>
    {onRemove && <button type="button" className="reference-remove" disabled={disabled} onClick={onRemove} aria-label={`Remove ${name}`}><Trash size={17} /></button>}
  </article>
}
