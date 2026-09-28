export type Units = 'metric' | 'imperial'
export type Dimension = 'weight' | 'length'
export function displayValue(value: number | null, dimension: Dimension, units: Units) {
  if (value === null) return null
  return Math.round(value * (units === 'metric' ? 1 : dimension === 'weight' ? 2.2046226218 : .3937007874) * 10) / 10
}
export function storageValue(value: number, dimension: Dimension, units: Units) {
  return Math.round(value / (units === 'metric' ? 1 : dimension === 'weight' ? 2.2046226218 : .3937007874) * 100) / 100
}
export function unitLabel(dimension: Dimension, units: Units) { return dimension === 'weight' ? units === 'metric' ? 'kg' : 'lb' : units === 'metric' ? 'cm' : 'in' }
