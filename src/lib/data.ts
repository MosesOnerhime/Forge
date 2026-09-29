export type WorkoutDay = { id:string; day_of_week:number; name:string; is_rest_day:boolean; estimated_minutes_min:number|null; estimated_minutes_max:number|null }
export type Exercise = { id:string; name:string }
export type ProgramExercise = { id:string; workout_day_id:string; exercise_id:string; sort_order:number; target_sets:number; min_reps:number; max_reps:number; rest_seconds_min:number; notes:string|null; exercises:Exercise }
export type Session = { id:string; workout_day_id:string|null; started_at:string; completed_at:string|null; status:string; notes:string|null; workout_days?:{ name:string }|null }
export type SessionExercise = { id:string; session_id:string; exercise_id:string; sort_order:number; target_sets:number; min_reps:number; max_reps:number; rest_seconds:number; notes:string|null; skipped:boolean; exercises:Exercise; workout_sets:WorkoutSet[] }
export type WorkoutSet = { id:string; session_exercise_id:string; set_number:number; weight_kg:number|null; reps:number|null; rir:number|null; completed:boolean; completed_at:string|null; pending?:boolean }
export type NutritionTarget = { id:string; calories:number; protein_g:number; carbs_g:number; fat_g:number; effective_from:string }
export type Food = { id:string; name:string; serving_description:string; serving_grams:number|null; calories:number; protein_g:number; carbs_g:number; fat_g:number }
export type FoodEntry = { id:string; food_id:string; logged_date:string; meal_type:string; quantity:number; calories:number; protein_g:number; carbs_g:number; fat_g:number; foods?:{name:string;serving_description:string}|null }
export type Measurement = { id:string; measured_at:string; weight_kg:number|null; waist_cm:number|null; chest_cm:number|null; shoulders_cm:number|null; bicep_left_cm:number|null; bicep_right_cm:number|null; forearm_left_cm:number|null; forearm_right_cm:number|null; thigh_left_cm:number|null; thigh_right_cm:number|null; neck_cm:number|null; calf_left_cm:number|null; calf_right_cm:number|null; notes:string|null }
export type ProgressPhoto = { id:string; photo_date:string; view_type:string; storage_path:string; notes:string|null; signedUrl?:string }
export type WorkoutReferenceVideo = { id:string; workout_day_id:string; storage_path:string; original_name:string; mime_type:string; file_size_bytes:number; created_at:string }
export type ExerciseReferenceMedia = { id:string; exercise_id:string; storage_path:string; original_name:string; mime_type:string; file_size_bytes:number; created_at:string }
export type JournalEntry = { id:string; entry_date:string; title:string|null; content:string; created_at:string }

export function errorMessage(error: unknown) { if(error instanceof Error)return error.message; if(error&&typeof error==='object'&&'message'in error&&typeof error.message==='string')return error.message; return 'Something went wrong. Please try again.' }
