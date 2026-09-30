'use client'

import { Pause, Play, SkipForward, ArrowCounterClockwise } from '@phosphor-icons/react'

export function RestTimer({ remaining, running, onToggle, onReset, onDismiss }: { remaining: number; running: boolean; onToggle: () => void; onReset: () => void; onDismiss: () => void }) {
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
  return <div className="timer" role="timer" aria-label={`Rest timer ${clock} remaining`}>
    <div><div className="eyebrow">{remaining ? 'Rest' : 'Ready'}</div><strong>{clock}</strong></div>
    {remaining > 0 && <button className="btn small" aria-label={running ? 'Pause timer' : 'Resume timer'} onClick={onToggle}>{running ? <Pause size={18} /> : <Play size={18} />}</button>}
    <button className="btn small" aria-label="Reset timer" onClick={onReset}><ArrowCounterClockwise size={18} /></button>
    <button className="btn small" aria-label="Dismiss timer" onClick={onDismiss}><SkipForward size={18} /></button>
  </div>
}
