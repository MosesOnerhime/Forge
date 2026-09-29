import { describe, expect, it } from 'vitest'
import { measurementPayload } from '../src/lib/measurements'

describe('measurement edits', () => {
  it('writes null for a cleared field while retaining entered values', () => {
    const result = measurementPayload({ weight_kg: '80', waist_cm: '' }, 'metric')
    expect(result.weight_kg).toBe(80)
    expect(result.waist_cm).toBeNull()
    expect(Object.keys(result)).toHaveLength(13)
  })

  it('converts imperial entries and rejects values that cannot fit the database', () => {
    expect(measurementPayload({ weight_kg: '220.46' }, 'imperial').weight_kg).toBeCloseTo(100, 1)
    expect(() => measurementPayload({ weight_kg: '0' }, 'metric')).toThrow(/positive value/)
    expect(() => measurementPayload({ waist_cm: '100000' }, 'metric')).toThrow(/positive value/)
    expect(() => measurementPayload({}, 'metric')).toThrow(/at least one/)
  })
})
