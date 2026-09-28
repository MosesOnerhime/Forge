'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { configured, supabase } from '@/lib/supabase'
import { clearOfflineWorkout, clearOfflineWorkoutForOtherUser } from '@/lib/offline-workout'
import { clearPendingSets, clearPendingSetsForOtherUser, syncPendingSets } from '@/lib/pending-sets'

const AuthContext = createContext<{ user:User|null; loading:boolean; refresh:()=>Promise<void> }>({ user:null, loading:true, refresh:async()=>{} })

export function AuthProvider({ children, required = false }: { children:React.ReactNode; required?:boolean }) {
  const [user,setUser] = useState<User|null>(null)
  const [loading,setLoading] = useState(true)
  const router = useRouter()
  async function refresh() {
    if (!configured) { setLoading(false); return }
    const {data:{user:nextUser}} = await supabase().auth.getUser()
    if (nextUser) { clearOfflineWorkoutForOtherUser(nextUser.id); clearPendingSetsForOtherUser(nextUser.id) }
    setUser(nextUser)
    setLoading(false)
    if (required && !nextUser) router.replace('/login')
  }
  useEffect(() => {
    // The subscription also catches password-reset and cross-tab sign-out events.
    const task = Promise.resolve().then(refresh)
    if (!configured) return () => { void task }
    const {data:{subscription}} = supabase().auth.onAuthStateChange((event,session) => {
      if (event === 'SIGNED_OUT') { clearOfflineWorkout(); clearPendingSets() }
      if (session?.user) { clearOfflineWorkoutForOtherUser(session.user.id); clearPendingSetsForOtherUser(session.user.id) }
      setUser(session?.user ?? null)
      if (required && !session?.user) router.replace('/login')
    })
    return () => { subscription.unsubscribe(); void task }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [required,router])
  useEffect(() => {
    if (!user) return
    const sync = () => { if (navigator.onLine) void syncPendingSets(user.id) }
    const visible = () => { if (document.visibilityState === 'visible') sync() }
    sync()
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', visible)
    return () => { window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', visible) }
  }, [user])
  if (required && loading) return <div className="auth-wrap"><div className="brand">FORGE<span>.</span></div></div>
  if (required && !configured) return <div className="auth-wrap"><div className="card auth-card"><div className="brand">FORGE<span>.</span></div><h1>Connect the database</h1><p className="muted">Copy .env.example to .env.local, add your Supabase project URL and publishable key, then restart the app. Apply the migration in supabase/migrations first.</p></div></div>
  if (required && !user) return null
  return <AuthContext.Provider value={{user,loading,refresh}}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
