'use client'
import { useEffect,useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import type { Units } from '@/lib/units'
export function useUnits() {
  const {user}=useAuth();const [units,setUnits]=useState<Units>('metric')
  useEffect(()=>{if(!user)return;queueMicrotask(async()=>{const {data}=await supabase().from('profiles').select('units').maybeSingle();if(data?.units==='imperial')setUnits('imperial')})},[user])
  return units
}
