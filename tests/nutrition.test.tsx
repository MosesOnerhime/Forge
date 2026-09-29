// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Nutrition from '../src/app/(app)/nutrition/page'

type FoodEntry = { id: string; food_id: string; logged_date: string; meal_type: string; quantity: number; calories: number; protein_g: number; carbs_g: number; fat_g: number; foods: { name: string; serving_description: string } }
const authUser = vi.hoisted(() => ({ id: 'user-a' }))
const food = { id: 'food-a', name: 'Oats', serving_description: '1 bowl', serving_grams: 100, calories: 200, protein_g: 10, carbs_g: 30, fat_g: 4 }
const store: { entries: FoodEntry[]; failInsert: boolean; inserted: Record<string, unknown> | null } = { entries: [], failInsert: false, inserted: null }

class Query {
  constructor(private table: string) {}
  select() { return this }
  eq() { return this }
  lte() { return this }
  order() { return this }
  limit() { return this }
  maybeSingle() { return this.read() }
  private read() {
    if (this.table === 'nutrition_targets') return Promise.resolve({ data: { calories: 2900, protein_g: 170, carbs_g: 375, fat_g: 80 }, error: null })
    if (this.table === 'foods') return Promise.resolve({ data: [food], error: null })
    if (this.table === 'food_entries') return Promise.resolve({ data: [...store.entries], error: null })
    throw new Error(`No fixture for ${this.table}`)
  }
  then(resolve: (value: unknown) => void, reject?: (error: unknown) => void) { return this.read().then(resolve, reject) }
  async insert(payload: Record<string, unknown>) {
    if (this.table !== 'food_entries') throw new Error(`Unexpected insert into ${this.table}`)
    if (store.failInsert) throw new Error('Network unavailable')
    store.inserted = payload
    store.entries.push({ ...payload, id: 'entry-a', foods: { name: food.name, serving_description: food.serving_description } } as FoodEntry)
    return { error: null }
  }
}

vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ user: authUser }) }))
vi.mock('@/lib/supabase', () => ({ supabase: () => ({ from: (table: string) => new Query(table) }) }))

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderNutrition() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root!.render(<Nutrition />) })
  await act(async () => { await Promise.resolve() })
  return container
}

async function chooseAndSubmit(page: HTMLDivElement) {
  const select = page.querySelector<HTMLSelectElement>('#food')!
  await act(async () => { select.value = food.id; select.dispatchEvent(new Event('change', { bubbles: true })) })
  const form = page.querySelector('form')!
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  store.entries = []
  store.inserted = null
  store.failInsert = false
})

afterEach(async () => {
  if (root) await act(async () => { root!.unmount() })
  container?.remove()
  root = null
  container = null
})

describe('Nutrition logging', () => {
  it('saves a food snapshot and updates consumed and remaining totals', async () => {
    const page = await renderNutrition()
    await chooseAndSubmit(page)
    expect(store.inserted).toMatchObject({ food_id: 'food-a', quantity: 1, calories: 200, protein_g: 10, carbs_g: 30, fat_g: 4 })
    expect(page.textContent).toContain('200 / 2900')
    expect(page.textContent).toContain('2700 kcal remaining')
    expect(page.textContent).toContain('160 g remaining')
    expect(page.textContent).toContain('Oats')
  })

  it('recovers from a rejected network request without losing the chosen food', async () => {
    store.failInsert = true
    const page = await renderNutrition()
    await chooseAndSubmit(page)
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Network unavailable')
    expect(page.querySelector<HTMLButtonElement>('form button.btn.primary')?.disabled).toBe(false)
    expect(page.querySelector<HTMLSelectElement>('#food')?.value).toBe('food-a')
    expect(store.entries).toHaveLength(0)
    store.failInsert = false
    await act(async () => { page.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    expect(store.entries).toHaveLength(1)
  })
})
