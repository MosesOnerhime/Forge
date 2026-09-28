import { describe,expect,it } from 'vitest'
import { nutritionTotals,sessionDurationMinutes,sessionSummary } from '../src/lib/metrics'
import type { WorkoutSet } from '../src/lib/data'
import { displayValue,storageValue } from '../src/lib/units'

function set(weight_kg:number,reps:number,completed=true):WorkoutSet {return {id:'x',session_exercise_id:'x',set_number:1,weight_kg,reps,rir:2,completed,completed_at:completed?'2026-09-28T10:00:00Z':null}}

describe('fitness summaries',()=>{
  it('keeps stored food snapshots and fractional servings in totals',()=>{
    const result=nutritionTotals([{calories:123.75,protein_g:10.5,carbs_g:12.25,fat_g:3.5},{calories:240.25,protein_g:20,carbs_g:30,fat_g:4}])
    expect(result).toEqual({calories:364,protein:30.5,carbs:42.25,fat:7.5})
  })
  it('counts completed exercises, sets, volume, and all-time volume PRs',()=>{
    const items=[{exercise_id:'a',workout_sets:[set(80,8),set(90,8),set(100,1,false)]},{exercise_id:'b',workout_sets:[set(20,10)]}]
    expect(sessionSummary(items,{a:700,b:200})).toEqual({exercises:2,sets:3,volume:1560,prCount:1})
    expect(sessionSummary(items,{a:800,b:200}).prCount).toBe(0)
    expect(sessionDurationMinutes('2026-09-28T10:00:00Z','2026-09-28T11:15:00Z')).toBe(75)
    expect(sessionDurationMinutes('2026-09-28T10:00:00Z',null)).toBeNull()
  })
  it('round trips pounds and inches through metric storage',()=>{
    expect(displayValue(storageValue(225,'weight','imperial'),'weight','imperial')).toBe(225)
    expect(displayValue(storageValue(32,'length','imperial'),'length','imperial')).toBe(32)
  })
})
