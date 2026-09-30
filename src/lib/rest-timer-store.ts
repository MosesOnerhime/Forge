export type RestTimerRecord = {
  duration: number
  remaining: number
  endAt: number | null
  notify: boolean
  notified: boolean
}

export function restTimerKey(userId: string) {
  return `forge-rest-timer:${userId}`
}

export function remainingRestSeconds(timer: RestTimerRecord, now: number) {
  return timer.endAt === null ? timer.remaining : Math.max(0, Math.ceil((timer.endAt - now) / 1000))
}

export function parseRestTimer(value: string | null): RestTimerRecord | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return null
    const timer = parsed as Record<string, unknown>
    if (!Number.isInteger(timer.duration) || Number(timer.duration) < 1 || Number(timer.duration) > 900) return null
    if (!Number.isInteger(timer.remaining) || Number(timer.remaining) < 0 || Number(timer.remaining) > Number(timer.duration)) return null
    if (timer.endAt !== null && (typeof timer.endAt !== 'number' || !Number.isFinite(timer.endAt))) return null
    if (typeof timer.notify !== 'boolean' || typeof timer.notified !== 'boolean') return null
    return timer as RestTimerRecord
  } catch { return null }
}
