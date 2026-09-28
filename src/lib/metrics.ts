import type { FoodEntry, SessionExercise, WorkoutSet } from './data'
import { number } from './utils'

export function nutritionTotals(entries: Pick<FoodEntry,'calories'|'protein_g'|'carbs_g'|'fat_g'>[]) {
  return entries.reduce((sum,item)=>({
    calories:sum.calories+number(item.calories),
    protein:sum.protein+number(item.protein_g),
    carbs:sum.carbs+number(item.carbs_g),
    fat:sum.fat+number(item.fat_g),
  }),{calories:0,protein:0,carbs:0,fat:0})
}

export function setVolume(set: Pick<WorkoutSet,'weight_kg'|'reps'>) { return number(set.weight_kg)*number(set.reps) }

export function sessionSummary(items: Pick<SessionExercise,'exercise_id'|'workout_sets'>[],previous:Record<string,WorkoutSet[]>) {
  const sets=items.flatMap(item=>item.workout_sets.filter(set=>set.completed))
  const prCount=items.filter(item=>{
    const oldBest=Math.max(0,...(previous[item.exercise_id]??[]).map(setVolume))
    return oldBest>0&&item.workout_sets.some(set=>set.completed&&setVolume(set)>oldBest)
  }).length
  return {sets:sets.length,volume:sets.reduce((sum,set)=>sum+setVolume(set),0),prCount}
}
