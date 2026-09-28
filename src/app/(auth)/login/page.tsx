'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { configured, supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/data'

export default function Login() {
  const [mode,setMode]=useState<'login'|'signup'|'reset'>('login')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  const router=useRouter()
  async function submit(event:FormEvent) {
    event.preventDefault(); setError('');setMessage('');setBusy(true)
    try {
      if (!configured) throw new Error('Supabase is not configured yet. See the setup instructions in README.md.')
      if (mode==='reset') {
        const {error}=await supabase().auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/auth/callback?next=/reset-password`})
        if (error) throw error
        setMessage('Check your email for a password reset link.')
      } else if (mode==='signup') {
        const {data,error}=await supabase().auth.signUp({email,password,options:{emailRedirectTo:`${window.location.origin}/auth/callback?next=/onboarding`}})
        if (error) throw error
        if (data.session) router.push('/onboarding')
        else setMessage('Check your email to confirm your account, then sign in.')
      } else {
        const {error}=await supabase().auth.signInWithPassword({email,password})
        if (error) throw error
        const {data:profile,error:profileError}=await supabase().from('profiles').select('onboarding_completed_at').maybeSingle()
        if (profileError) throw profileError
        router.push(profile?.onboarding_completed_at?'/today':'/onboarding');router.refresh()
      }
    } catch (caught) { setError(errorMessage(caught)) } finally { setBusy(false) }
  }
  return <div className="auth-wrap"><div className="auth-card"><Link href="/today" className="brand">FORGE<span>.</span></Link><div className="card"><div className="eyebrow">Train with intent</div><h1>{mode==='login'?'Welcome back':mode==='signup'?'Build your record':'Reset password'}</h1><p className="muted">{mode==='login'?'Your next session starts here.':mode==='signup'?'One place for your training, food, and progress.':'We’ll send a reset link to your email.'}</p><form onSubmit={submit} className="stack" style={{marginTop:24}}><div><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div>{mode!=='reset'&&<div><label htmlFor="password">Password</label><input id="password" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></div>}{error&&<div role="alert" className="notice">{error}</div>}{message&&<div role="status" className="notice success">{message}</div>}<button className="btn primary full" disabled={busy}>{busy?'Working…':mode==='login'?'Sign in':mode==='signup'?'Create account':'Send reset link'}</button></form><div className="row wrap" style={{marginTop:20}}><button className="btn ghost small" onClick={()=>{setMode(mode==='signup'?'login':'signup');setError('');setMessage('')}}>{mode==='signup'?'I have an account':'Create account'}</button><button className="btn ghost small" onClick={()=>{setMode(mode==='reset'?'login':'reset');setError('');setMessage('')}}>{mode==='reset'?'Back to sign in':'Forgot password?'}</button></div></div></div></div>
}
