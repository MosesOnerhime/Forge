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

export function nutritionBalance(consumed: number, target: number, unit: 'kcal' | 'g') {
  const difference = Math.round(target - consumed)
  return difference >= 0 ? `${difference} ${unit} remaining` : `${-difference} ${unit} over target`
}

export function setVolume(set: Pick<WorkoutSet,'weight_kg'|'reps'>) { return number(set.weight_kg)*number(set.reps) }

export function sessionDurationMinutes(startedAt:string,completedAt:string|null) {
  if (!completedAt) return null
  const minutes=(Date.parse(completedAt)-Date.parse(startedAt))/60000
  return Number.isFinite(minutes)&&minutes>=0?Math.round(minutes):null
}

export function sessionSummary(items: Pick<SessionExercise,'exercise_id'|'workout_sets'>[],historicalBests:Record<string,number>) {
  const sets=items.flatMap(item=>item.workout_sets.filter(set=>set.completed))
  const prCount=items.filter(item=>{
    const oldBest=number(historicalBests[item.exercise_id])
    return oldBest>0&&item.workout_sets.some(set=>set.completed&&setVolume(set)>oldBest)
  }).length
  const exercises=items.filter(item=>item.workout_sets.some(set=>set.completed)).length
  return {exercises,sets:sets.length,volume:sets.reduce((sum,set)=>sum+setVolume(set),0),prCount}
}
