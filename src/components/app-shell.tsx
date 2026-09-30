'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from './auth-provider'
import { ServiceWorker } from './service-worker'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/data'
import { Nav } from './nav'
import { RestTimerProvider } from './rest-timer-provider'

export function AppShell({children}:{children:React.ReactNode}) {
  return <AuthProvider required><OnboardingGate><RestTimerProvider><ServiceWorker/><div className="shell"><aside className="sidebar"><Link href="/today" className="brand">FORGE<span>.</span></Link><Nav/><div className="muted small" style={{marginTop:'auto',padding:12}}>Show up. Log it. Progress.</div></aside><main className="main">{children}</main><Nav mobile/></div></RestTimerProvider></OnboardingGate></AuthProvider>
}

function OnboardingGate({children}:{children:React.ReactNode}) {
  const {user}=useAuth()
  const router=useRouter()
  const [readyFor,setReadyFor]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [retry,setRetry]=useState(0)
  useEffect(()=>{
    if(!user)return
    let live=true
    void (async()=>{
      setError('')
      const {data,error:queryError}=await supabase().from('profiles').select('onboarding_completed_at').eq('user_id',user.id).maybeSingle()
      if(!live)return
      if(queryError){setError(errorMessage(queryError));return}
      if(!data?.onboarding_completed_at){router.replace('/onboarding');return}
      setReadyFor(user.id)
    })()
    return()=>{live=false}
  },[user,router,retry])
  if(readyFor===user?.id)return children
  return <div className="auth-wrap"><div className="card auth-card"><div className="brand">FORGE<span>.</span></div>{error?<><p role="alert">{error}</p><button className="btn" onClick={()=>setRetry(value=>value+1)}>Try again</button></>:<p className="muted">Checking your setup…</p>}</div></div>
}
