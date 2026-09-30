'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider'
import { RestTimer } from '@/components/rest-timer'
import { parseRestTimer, remainingRestSeconds, restTimerKey, type RestTimerRecord } from '@/lib/rest-timer-store'

type TimerControls = { startRest: (duration: number, notify: boolean) => void; dismissRest: () => void }
const RestTimerContext = createContext<TimerControls | null>(null)

export function useRestTimer() {
  const controls = useContext(RestTimerContext)
  if (!controls) throw new Error('RestTimerProvider is required.')
  return controls
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [timer, setTimer] = useState<RestTimerRecord | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const commit = useCallback((next: RestTimerRecord | null) => {
    setTimer(next)
    if (!userId) return
    try {
      if (next) localStorage.setItem(restTimerKey(userId), JSON.stringify(next))
      else localStorage.removeItem(restTimerKey(userId))
    } catch { /* The timer continues in this tab if storage is unavailable. */ }
  }, [userId])

  useEffect(() => {
    let live = true
    if (!userId) {
      queueMicrotask(() => { if (live) setTimer(null) })
      return () => { live = false }
    }
    const key = restTimerKey(userId)
    queueMicrotask(() => {
      if (!live) return
      try { setTimer(parseRestTimer(localStorage.getItem(key))) }
      catch { setTimer(null) }
      setNow(Date.now())
    })
    const sync = (event: StorageEvent) => {
      if (event.key !== key) return
      setTimer(parseRestTimer(event.newValue))
      setNow(Date.now())
    }
    window.addEventListener('storage', sync)
    return () => { live = false; window.removeEventListener('storage', sync) }
  }, [userId])

  useEffect(() => {
    if (!timer || timer.endAt === null) return
    const tick = () => setNow(Date.now())
    const interval = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    tick()
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [timer])

  const remaining = timer ? remainingRestSeconds(timer, now) : 0
  useEffect(() => {
    if (!timer || timer.endAt === null || remaining > 0 || timer.notified) return
    let live = true
    queueMicrotask(() => {
      if (!live) return
      commit({ ...timer, endAt: null, remaining: 0, notified: true })
      if (timer.notify && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Rest complete', { body: 'Time for your next set.' })
      }
    })
    return () => { live = false }
  }, [timer, remaining, commit])

  const startRest = useCallback((duration: number, notify: boolean) => {
    if (!Number.isInteger(duration) || duration < 1 || duration > 900) return
    const started = Date.now()
    setNow(started)
    commit({ duration, remaining: duration, endAt: started + duration * 1000, notify, notified: false })
  }, [commit])
  const dismissRest = useCallback(() => commit(null), [commit])
  const controls = useMemo(() => ({ startRest, dismissRest }), [startRest, dismissRest])

  function toggle() {
    if (!timer) return
    if (timer.endAt !== null) commit({ ...timer, endAt: null, remaining: remainingRestSeconds(timer, Date.now()) })
    else if (timer.remaining > 0) {
      const resumed = Date.now()
      setNow(resumed)
      commit({ ...timer, endAt: resumed + timer.remaining * 1000 })
    }
  }
  function reset() {
    if (!timer) return
    const restarted = Date.now()
    setNow(restarted)
    commit({ ...timer, endAt: restarted + timer.duration * 1000, remaining: timer.duration, notified: false })
  }

  return <RestTimerContext.Provider value={controls}>
    {children}
    {timer && <RestTimer remaining={remaining} running={timer.endAt !== null && remaining > 0} onToggle={toggle} onReset={reset} onDismiss={dismissRest} />}
  </RestTimerContext.Provider>
}
