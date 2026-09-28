'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipForward, ArrowCounterClockwise } from '@phosphor-icons/react'

export function RestTimer({ duration, notify, onDismiss }: { duration: number; notify: boolean; onDismiss: () => void }) {
  const [remaining, setRemaining] = useState(duration)
  const [running, setRunning] = useState(true)
  const endAt = useRef<number | null>(null)
  const notified = useRef(false)

  useEffect(() => {
    if (!running) return
    if (endAt.current === null) endAt.current = Date.now() + duration * 1000
    const tick = () => {
      const seconds = Math.max(0, Math.ceil(((endAt.current ?? Date.now()) - Date.now()) / 1000))
      setRemaining(seconds)
      if (seconds === 0) setRunning(false)
    }
    const interval = window.setInterval(tick, 250)
    tick()
    return () => window.clearInterval(interval)
  }, [running, duration])

  useEffect(() => {
    if (remaining !== 0 || notified.current) return
    notified.current = true
    if (notify && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Rest complete', { body: 'Time for your next set.' })
    }
  }, [remaining, notify])

  function toggle() {
    if (running) {
      if (endAt.current !== null) setRemaining(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)))
      setRunning(false)
    } else if (remaining > 0) {
      endAt.current = Date.now() + remaining * 1000
      setRunning(true)
    }
  }

  function reset() {
    endAt.current = Date.now() + duration * 1000
    notified.current = false
    setRemaining(duration)
    setRunning(true)
  }

  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
  return <div className="timer" role="timer" aria-label={`Rest timer ${clock} remaining`}>
    <div><div className="eyebrow">{remaining ? 'Rest' : 'Ready'}</div><strong>{clock}</strong></div>
    {remaining > 0 && <button className="btn small" aria-label={running ? 'Pause timer' : 'Resume timer'} onClick={toggle}>{running ? <Pause size={18} /> : <Play size={18} />}</button>}
    <button className="btn small" aria-label="Reset timer" onClick={reset}><ArrowCounterClockwise size={18} /></button>
    <button className="btn small" aria-label="Dismiss timer" onClick={onDismiss}><SkipForward size={18} /></button>
  </div>
}
