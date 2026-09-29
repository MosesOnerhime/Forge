import { storageValue, type Units } from './units'

export const measurementFields = [
  ['weight_kg', 'Weight (kg)'], ['waist_cm', 'Waist (cm)'], ['chest_cm', 'Chest (cm)'],
  ['shoulders_cm', 'Shoulders (cm)'], ['bicep_left_cm', 'Left bicep (cm)'],
  ['bicep_right_cm', 'Right bicep (cm)'], ['forearm_left_cm', 'Left forearm (cm)'],
  ['forearm_right_cm', 'Right forearm (cm)'], ['thigh_left_cm', 'Left thigh (cm)'],
  ['thigh_right_cm', 'Right thigh (cm)'], ['neck_cm', 'Neck (cm)'],
  ['calf_left_cm', 'Left calf (cm)'], ['calf_right_cm', 'Right calf (cm)'],
] as const

export type MeasurementField = typeof measurementFields[number][0]

export function measurementPayload(values: Partial<Record<MeasurementField, string>>, units: Units): Record<MeasurementField, number | null> {
  const payload = {} as Record<MeasurementField, number | null>
  let count = 0
  for (const [field, label] of measurementFields) {
    const raw = values[field]?.trim() ?? ''
    if (!raw) { payload[field] = null; continue }
    const input = Number(raw)
    const stored = storageValue(input, field === 'weight_kg' ? 'weight' : 'length', units)
    if (!Number.isFinite(input) || !Number.isFinite(stored) || stored <= 0 || stored > 9999.99) {
      throw new Error(`Enter a valid positive value for ${label.toLowerCase()}.`)
    }
    payload[field] = stored
    count++
  }
  if (!count) throw new Error('Enter at least one measurement.')
  return payload
}
