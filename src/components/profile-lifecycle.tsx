'use client'

import { useState, type FormEvent } from 'react'
import { changeProfile, type ProfileAction } from '@/lib/profile-lifecycle'
import { errorMessage } from '@/lib/data'

export function ProfileLifecycle() {
  const [action, setAction] = useState<ProfileAction | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const expected = action === 'delete' ? 'DELETE' : 'RESET'

  function choose(next: ProfileAction | null) {
    setAction(next); setConfirmation(''); setError('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!action || busy || confirmation !== expected) return
    setBusy(true); setError('')
    try {
      await changeProfile(action, confirmation)
      // A full navigation discards loaded records and stops the active rest timer.
      window.location.replace(action === 'delete' ? '/login?profile=deleted' : '/onboarding')
    } catch (caught) {
      setError(errorMessage(caught)); setBusy(false)
    }
  }
  return <section className="card stack" style={{ marginTop: 16 }} aria-labelledby="profile-lifecycle-title">
    <h3 id="profile-lifecycle-title">Start over or leave Forge</h3>
    <p className="muted small" style={{ margin: 0 }}>Export your data above before continuing. These actions permanently erase your workouts, routines, saved templates, food logs, measurements, photos, references, journal, goals, and settings. Shared starter templates stay available.</p>
    {!action ? <div className="row wrap" style={{ justifyContent: 'flex-start' }}>
      <button className="btn" type="button" onClick={() => choose('reset')}>Reset profile</button>
      <button className="btn danger" type="button" onClick={() => choose('delete')}>Delete profile</button>
    </div> : <form className="stack" onSubmit={submit}>
      <h4>{action === 'delete' ? 'Delete profile and account?' : 'Reset profile?'}</h4>
      <p style={{ margin: 0 }}>{action === 'delete' ? 'Your email and password will no longer sign in to this account. You will need to create a new account to use Forge again.' : 'Keep your email, password, and login. Erase your Forge data and return to setup to choose a new routine.'}</p>
      <p className="muted small" style={{ margin: 0 }}>This cannot be undone. Unsynced sets on this device will be discarded. Keep Forge closed on other devices while this runs. If interrupted, some uploads may already be removed; return here to finish.</p>
      <div><label htmlFor="profile-confirmation">Type {expected} to confirm</label>
        <input id="profile-confirmation" autoFocus autoComplete="off" spellCheck={false} value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} /></div>
      {error && <div className="notice" role="alert">{error}</div>}
      <div className="row wrap" style={{ justifyContent: 'flex-start' }}>
        <button className="btn danger" disabled={busy || confirmation !== expected}>{busy ? 'Removing profile data…' : action === 'delete' ? 'Permanently delete profile' : 'Permanently reset profile'}</button>
        <button className="btn" type="button" disabled={busy} onClick={() => choose(null)}>Cancel</button>
      </div>
    </form>}
  </section>
}
