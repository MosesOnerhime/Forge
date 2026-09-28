'use client'

import { useEffect,useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Barbell, ForkKnife, TrendUp } from '@phosphor-icons/react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { dayNumber,localDate,niceDate } from '@/lib/utils'
import { nutritionTotals } from '@/lib/metrics'
import { displayValue,unitLabel } from '@/lib/units'
import { useUnits } from '@/hooks/use-units'
import { errorMessage,type WorkoutDay,type NutritionTarget,type FoodEntry,type Measurement,type Session } from '@/lib/data'

export default function Today() {
  const {user}=useAuth();const router=useRouter()
  const units=useUnits()
  const [day,setDay]=useState<WorkoutDay|null>(null)
  const [active,setActive]=useState<Session|null>(null)
  const [targets,setTargets]=useState<NutritionTarget|null>(null)
  const [entries,setEntries]=useState<FoodEntry[]>([])
  const [weight,setWeight]=useState<Pick<Measurement,'id'|'measured_at'|'weight_kg'>|null>(null)
  const [exerciseCount,setExerciseCount]=useState(0)
  const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  useEffect(()=>{ if(!user)return; let live=true; (async()=>{try{
    const client=supabase();await client.rpc('forge_ensure_user_setup')
    const [sessions,nutrition,foods,measurements]=await Promise.all([
      client.from('workout_sessions').select('id,workout_day_id,started_at,completed_at,status,notes').eq('status','active').maybeSingle(),
      client.from('nutrition_targets').select('id,calories,protein_g,carbs_g,fat_g,effective_from').lte('effective_from',localDate()).order('effective_from',{ascending:false}).limit(1).maybeSingle(),
      client.from('food_entries').select('id,food_id,logged_date,meal_type,quantity,calories,protein_g,carbs_g,fat_g').eq('logged_date',localDate()),
      client.from('body_measurements').select('id,measured_at,weight_kg').not('weight_kg','is',null).order('measured_at',{ascending:false}).limit(1).maybeSingle(),
    ])
    if(sessions.error)throw sessions.error;if(nutrition.error)throw nutrition.error;if(foods.error)throw foods.error;if(measurements.error)throw measurements.error
    // Day rows are restricted to the active program through the program relationship.
    const {data:program}=await client.from('workout_programs').select('id').eq('active',true).maybeSingle()
    const {data:today}=await client.from('workout_days').select('id,day_of_week,name,is_rest_day,estimated_minutes_min,estimated_minutes_max').eq('program_id',program?.id??'00000000-0000-0000-0000-000000000000').eq('day_of_week',dayNumber()).maybeSingle()
    const {count}=today?await client.from('program_exercises').select('id',{count:'exact',head:true}).eq('workout_day_id',today.id):{count:0}
    if(live){setDay(today);setActive(sessions.data);setTargets(nutrition.data);setEntries(foods.data??[]);setWeight(measurements.data);setExerciseCount(count??0)}
  }catch(caught){if(live)setError(errorMessage(caught))}})();return()=>{live=false}},[user])
  const totals=nutritionTotals(entries)
  async function start() { if(!user||!day)return;setBusy(true);setError('');try{
    if(active){router.push(`/workouts/session/${active.id}`);return}
    const client=supabase();const {data:plan,error:planError}=await client.from('program_exercises').select('id,exercise_id,sort_order,target_sets,min_reps,max_reps,rest_seconds_min,notes').eq('workout_day_id',day.id).order('sort_order');if(planError)throw planError
    if(!plan?.length)throw new Error('This day has no exercises. Add them in the routine editor before starting.')
    const {data:session,error:sessionError}=await client.from('workout_sessions').insert({user_id:user.id,workout_day_id:day.id}).select('id').single();if(sessionError)throw sessionError
    const {error:copyError}=await client.from('session_exercises').insert((plan??[]).map(item=>({user_id:user.id,session_id:session.id,exercise_id:item.exercise_id,program_exercise_id:item.id,sort_order:item.sort_order,target_sets:item.target_sets,min_reps:item.min_reps,max_reps:item.max_reps,rest_seconds:item.rest_seconds_min,notes:item.notes})));if(copyError){await client.from('workout_sessions').delete().eq('id',session.id);throw copyError}
    router.push(`/workouts/session/${session.id}`)
  }catch(caught){setError(errorMessage(caught))}finally{setBusy(false)} }
  const date=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})
  return <><div className="page-head"><div className="eyebrow">{date}</div><h1>Today starts here.</h1><p>One clear view of the work ahead.</p></div>{error&&<div className="notice" role="alert">{error}</div>}<div className="grid-2"><section className="card strong"><div className="row"><div className="eyebrow">Training plan</div><Barbell size={24} color="var(--accent)"/></div><h2 style={{fontSize:30,marginTop:28}}>{day?.is_rest_day?'Recovery day':day?.name??'Loading your plan…'}</h2><p className="muted">{day?.is_rest_day?'Rest, eat well, and come back stronger.':day?`${exerciseCount} exercises · ${day.estimated_minutes_min}–${day.estimated_minutes_max} min`:'Your weekly routine is being loaded.'}</p><div className="row wrap" style={{marginTop:30}}>{active?<button className="btn primary" onClick={()=>router.push(`/workouts/session/${active.id}`)}>Resume workout <ArrowRight size={18}/></button>:day&&!day.is_rest_day?<button className="btn primary" disabled={busy} onClick={start}>{busy?'Starting…':'Start workout'} <ArrowRight size={18}/></button>:<Link className="btn" href="/workouts">View routine <ArrowRight size={18}/></Link>}<Link href="/workouts" className="muted small">Weekly plan →</Link></div></section><section className="card"><div className="row"><div className="eyebrow">Fuel today</div><ForkKnife size={24} color="var(--amber)"/></div><div style={{marginTop:28}}><div className="metric">{Math.round(totals.calories)} <small>/ {targets?.calories??2900} kcal</small></div><div className="progress-track" style={{marginTop:14}}><div className="progress-fill" style={{width:`${Math.min(100,totals.calories/(targets?.calories||2900)*100)}%`}}/></div></div><div className="row" style={{marginTop:22}}><span className="muted small">Protein</span><strong>{Math.round(totals.protein)} / {targets?.protein_g??170} g</strong></div><div className="row" style={{marginTop:10}}><span className="muted small">Carbs</span><strong>{Math.round(totals.carbs)} / {targets?.carbs_g??375} g</strong></div><div className="row" style={{marginTop:10}}><span className="muted small">Fat</span><strong>{Math.round(totals.fat)} / {targets?.fat_g??80} g</strong></div><Link href="/nutrition" className="btn full" style={{marginTop:24}}>Log food <ArrowRight size={18}/></Link></section></div><div className="section-head"><h2>Keep the streak moving</h2></div><div className="grid-2"><Link href="/progress" className="card row"><div><div className="eyebrow">Body weight</div><div className="metric" style={{marginTop:14}}>{displayValue(weight?.weight_kg??null,'weight',units)??'—'} <small>{unitLabel('weight',units)}</small></div><p className="muted small" style={{marginBottom:0}}>{weight?`Last logged ${niceDate(weight.measured_at)}`:'Log your first weigh-in'}</p></div><TrendUp size={27} color="var(--accent)"/></Link><Link href="/journal" className="card row"><div><div className="eyebrow">Training notes</div><h2 style={{marginTop:14}}>What did you notice?</h2><p className="muted small" style={{marginBottom:0}}>Keep the details that numbers miss.</p></div><ArrowRight size={22} color="var(--muted)"/></Link></div></>
}
