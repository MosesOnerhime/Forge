'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { RoutineTemplateChoice } from '@/components/routine-template-choice'
import { errorMessage } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import type { RoutineTemplate } from '@/lib/routine-templates'
import { loadRoutineTemplate } from '@/lib/template-references'

export default function RoutineTemplatesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [templates, setTemplates] = useState<RoutineTemplate[]>([])
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [share, setShare] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: queryError } = await supabase().from('routine_templates')
        .select('id,user_id,publisher_id,is_shared,name,description,days,created_at').order('created_at')
      if (queryError) throw queryError
      const available = (data ?? []) as RoutineTemplate[]
      setTemplates(available)
      setSelected(current => available.some(item => item.id === current) ? current : (available[0]?.id ?? ''))
    } catch (caught) { setError(errorMessage(caught)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (user) queueMicrotask(() => { void load() }) }, [user, load])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || !name.trim()) return
    setBusy(true); setError(''); setMessage('')
    try {
      const { data, error: saveError } = await supabase().rpc('forge_save_routine_template', {
        p_name: name.trim(), p_description: description.trim() || null,
      })
      if (saveError) throw saveError
      await load()
      setSelected(data as string)
      if (share) {
        const shared = await supabase().rpc('forge_set_template_sharing', { p_template_id: data, p_shared: true })
        if (shared.error) throw new Error(`Your template was saved privately, but sharing failed: ${shared.error.message}. Select it to retry sharing.`)
      }
      await load()
      setSelected(data as string)
      setName(''); setDescription('')
      setMessage(share ? 'Template shared with all signed-in users, including its references. Only you can change the original.' : 'Your routine and references were saved as a private template.')
      setShare(false)
    } catch (caught) { setError(errorMessage(caught)) }
    finally { setBusy(false) }
  }

  async function apply() {
    const template = templates.find(item => item.id === selected)
    if (!template || busy || !window.confirm(`Load ${template.name} as your active routine? Your past workout logs will stay available.`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (!user) throw new Error('Sign in to load a routine.')
      await loadRoutineTemplate(template.id, user.id)
      router.push('/workouts/routine')
      router.refresh()
    } catch (caught) { setError(errorMessage(caught)); setBusy(false) }
  }

  async function remove() {
    const template = templates.find(item => item.id === selected)
    if (!template || template.user_id !== user?.id || busy || !window.confirm(`Delete your saved template “${template.name}”? Your active routine and workout logs will remain.`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      const { error: deleteError } = await supabase().from('routine_templates').delete().eq('id', template.id)
      if (deleteError) throw deleteError
      setSelected('')
      await load()
      setMessage('Saved template deleted.')
    } catch (caught) { setError(errorMessage(caught)) }
    finally { setBusy(false) }
  }

  const chosen = templates.find(item => item.id === selected)
  const ownsChosen = !!user && !!chosen && (chosen.user_id === user.id || chosen.publisher_id === user.id)
  async function changeSelected(update: boolean) {
    if (!chosen || !ownsChosen || busy) return
    if (update && !window.confirm(`Update ${chosen.name} from your current routine? People who load it next will get the updated week and references. Existing copies stay unchanged.`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await supabase().rpc(update ? 'forge_update_routine_template' : 'forge_set_template_sharing', update
        ? { p_template_id: chosen.id } : { p_template_id: chosen.id, p_shared: !chosen.is_shared })
      if (result.error) throw result.error
      await load()
      setMessage(update ? 'Template updated. Reference uploads for this saved routine sync automatically.' : chosen.is_shared ? 'Reference sharing stopped. Existing downloaded copies stay with their owners.' : 'Template and references shared with signed-in users. Only you can update the original.')
    } catch (caught) { setError(errorMessage(caught)) }
    finally { setBusy(false) }
  }

  return <>
    <Link href="/workouts/routine" className="muted small" style={{ display: 'inline-block', marginBottom: 16 }}>← Edit routine</Link>
    <div className="page-head"><h1>Routine templates.</h1><p>Load a complete week, or keep a private copy of the routine you built.</p></div>
    {error && <div className="notice" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
    {message && <div className="notice success" role="status" style={{ marginBottom: 16 }}>{message}</div>}
    <section className="card stack">
      <h2>Choose a routine</h2>
      {loading ? <p className="muted">Loading templates…</p> : templates.length === 0 ? <p className="muted">No templates found. Apply the latest database migration.</p> : <RoutineTemplateChoice templates={templates} selected={selected} onSelect={setSelected} disabled={busy} />}
      <div className="row wrap" style={{ justifyContent: 'flex-start' }}>
        <button className="btn primary" type="button" disabled={busy || !selected} onClick={() => void apply()}>{busy ? 'Working…' : 'Load selected routine'}</button>
        {ownsChosen && <button className="btn" type="button" disabled={busy} onClick={() => void changeSelected(true)}>Update from current routine</button>}
        {ownsChosen && <button className="btn" type="button" disabled={busy} onClick={() => void changeSelected(false)}>{chosen?.is_shared ? 'Stop sharing references' : 'Share template and references'}</button>}
        {chosen?.user_id === user?.id && <button className="btn ghost danger" type="button" disabled={busy} onClick={() => void remove()}>Delete saved template</button>}
      </div>
      <p className="muted small" style={{ margin: 0 }}>Loading copies the schedule and references into your account. Edit your copy freely; the creator’s template stays unchanged. Previous sessions stay in History. Save your loaded routine below to keep your own template.</p>
    </section>
    <section className="card stack" style={{ marginTop: 20 }}>
      <h2>Save your current routine</h2>
      <p className="muted" style={{ margin: 0 }}>Save the full week with its images and videos. New references for those exercises sync to your saved templates automatically.</p>
      <form className="stack" onSubmit={save}>
        <div><label htmlFor="template-name">Template name</label><input id="template-name" maxLength={150} required value={name} onChange={event => setName(event.target.value)} placeholder="My workout routine" /></div>
        <div><label htmlFor="template-description">Description <span className="muted">(optional)</span></label><textarea id="template-description" maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Who or what is this plan for?" /></div>
        <div className="row" style={{ justifyContent: 'flex-start' }}><input id="template-share" type="checkbox" checked={share} disabled={busy} onChange={event => setShare(event.target.checked)} /><label htmlFor="template-share" style={{ margin: 0 }}>Share this template and its references with all signed-in users</label></div>
        <button className="btn" disabled={busy || !name.trim()} style={{ justifySelf: 'start' }}>Save as template</button>
      </form>
    </section>
  </>
}
