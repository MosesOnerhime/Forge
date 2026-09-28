'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Barbell, ForkKnife, ChartLineUp, Notebook, GearSix } from '@phosphor-icons/react'
import { AuthProvider } from './auth-provider'
import { ServiceWorker } from './service-worker'

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
  return <AuthProvider required><ServiceWorker/><div className="shell"><aside className="sidebar"><Link href="/today" className="brand">FORGE<span>.</span></Link><Nav/><div className="muted small" style={{marginTop:'auto',padding:12}}>Show up. Log it. Progress.</div></aside><main className="main">{children}</main><Nav mobile/></div></AuthProvider>
}
