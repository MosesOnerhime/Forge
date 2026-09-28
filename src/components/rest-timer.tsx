'use client'
import { useEffect,useState } from 'react'
import { Pause,Play,SkipForward,ArrowCounterClockwise } from '@phosphor-icons/react'
export function RestTimer({duration,onDismiss}:{duration:number;onDismiss:()=>void}) {
  const [remaining,setRemaining]=useState(duration);const [running,setRunning]=useState(true)
  useEffect(()=>{if(!running||remaining<=0)return;const timer=window.setInterval(()=>setRemaining(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer)},[running,remaining])
  useEffect(()=>{if(remaining===0&&'Notification'in window&&Notification.permission==='granted')new Notification('Rest complete',{body:'Time for your next set.'})},[remaining])
  const clock=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`
  return <div className="timer" role="timer" aria-label={`Rest timer ${clock} remaining`}><div><div className="eyebrow">{remaining?'Rest':'Ready'}</div><strong>{clock}</strong></div>{remaining>0&&<button className="btn small" aria-label={running?'Pause timer':'Resume timer'} onClick={()=>setRunning(!running)}>{running?<Pause size={18}/>:<Play size={18}/>}</button>}<button className="btn small" aria-label="Reset timer" onClick={()=>{setRemaining(duration);setRunning(true)}}><ArrowCounterClockwise size={18}/></button><button className="btn small" aria-label="Dismiss timer" onClick={onDismiss}><SkipForward size={18}/></button></div>
}
