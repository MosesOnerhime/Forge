'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { House, Barbell, ForkKnife, ChartLineUp, Notebook, GearSix } from '@phosphor-icons/react'
import { AuthProvider, useAuth } from './auth-provider'
import { ServiceWorker } from './service-worker'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/data'

const links = [
  {href:'/today', label:'Today', icon:House},
  {href:'/workouts', label:'Train', icon:Barbell},
  {href:'/nutrition', label:'Nutrition', icon:ForkKnife},
  {href:'/progress', label:'Progress', icon:ChartLineUp},
  {href:'/journal', label:'Journal', icon:Notebook},
  {href:'/settings', label:'Settings', icon:GearSix},
]
function Nav({mobile=false}:{mobile?:boolean}) {
  const pathname=usePathname()
  return <nav aria-label="Main navigation" className={mobile?'bottom-nav':''}>{links.map(({href,label,icon:Icon})=><Link className={`nav-link ${pathname.startsWith(href)?'active':''}`} href={href} key={href}><Icon size={mobile?23:20} weight={pathname.startsWith(href)?'fill':'regular'}/><span>{label}</span></Link>)}</nav>
}
export function AppShell({children}:{children:React.ReactNode}) {
  return <AuthProvider required><OnboardingGate><ServiceWorker/><div className="shell"><aside className="sidebar"><Link href="/today" className="brand">FORGE<span>.</span></Link><Nav/><div className="muted small" style={{marginTop:'auto',padding:12}}>Show up. Log it. Progress.</div></aside><main className="main">{children}</main><Nav mobile/></div></OnboardingGate></AuthProvider>
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
