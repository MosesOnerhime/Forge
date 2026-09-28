'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/data'
export default function ResetPassword() {
  const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const router=useRouter()
  async function submit(e:FormEvent) { e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase().auth.updateUser({password});if(error)throw error;router.push('/today')}catch(caught){setError(errorMessage(caught))}finally{setBusy(false)} }
  return <div className="auth-wrap"><form className="card auth-card stack" onSubmit={submit}><div className="brand">FORGE<span>.</span></div><h1>Set a new password</h1><div><label htmlFor="password">New password</label><input id="password" type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></div>{error&&<div className="notice" role="alert">{error}</div>}<button className="btn primary" disabled={busy}>Save password</button></form></div>
}
