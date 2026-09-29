'use client'
import { useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { localDate } from '@/lib/utils'
import { errorMessage } from '@/lib/data'
const tables = ['profiles','goals','workout_programs','workout_days','workout_reference_videos','exercises','program_exercises','workout_sessions','session_exercises','workout_sets','nutrition_targets','foods','food_entries','body_measurements','progress_photos','journal_entries'] as const
export function ExportData() {
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  async function download() {
    setBusy(true);setError('')
    try {
      const client=supabase();const result:Record<string,unknown>={exported_at:new Date().toISOString()}
      for(const table of tables){const rows:unknown[]=[];let offset=0;while(true){const {data,error}=await client.from(table).select('*').range(offset,offset+999);if(error)throw error;rows.push(...(data??[]));if((data??[]).length<1000)break;offset+=1000}result[table]=rows}
      const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'})
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`forge-export-${localDate()}.json`;link.click();URL.revokeObjectURL(url)
    } catch(caught) {setError(errorMessage(caught))} finally {setBusy(false)}
  }
  return <div className="card row wrap"><div><h3>Export your data</h3><div className="muted small">Download workouts, nutrition, measurements, notes, and photo/video metadata as JSON. Media files remain in private Storage.</div>{error&&<div className="notice" role="alert" style={{marginTop:10}}>{error}</div>}</div><button className="btn" disabled={busy} onClick={download}><DownloadSimple size={18}/>{busy?'Preparing…':'Download JSON'}</button></div>
}
