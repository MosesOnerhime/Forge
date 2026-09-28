import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const origin = process.env.FORGE_PREVIEW_URL ?? 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await page.goto(`${origin}/offline.html`)
  const snapshot = {
    version: 1, userId: 'preview-user', sessionId: 'preview-session', name: 'Back + Biceps', status: 'active', units: 'metric', savedAt: '2026-09-28T10:00:00Z',
    exercises: [{ name: 'Weighted Pull-ups', targetSets: 3, minReps: 6, maxReps: 10, restSeconds: 180, sets: [{ setNumber: 1, weightKg: 10, reps: 8, rir: 2 }] }],
  }
  await page.evaluate(data => localStorage.setItem('forge:offline-workout:v1', JSON.stringify(data)), snapshot)
  await page.reload()
  assert.equal(await page.locator('#saved').isVisible(), true)
  assert.equal(await page.getByText('Weighted Pull-ups').count(), 1)
  assert.equal(await page.getByText('10 kg × 8').count(), 1)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  await mkdir('docs/screenshots', { recursive: true })
  await page.screenshot({ path: 'docs/screenshots/offline-mobile.png', fullPage: true })

  snapshot.exercises[0].name = '<img src=x onerror=alert(1)>'
  await page.evaluate(data => localStorage.setItem('forge:offline-workout:v1', JSON.stringify(data)), snapshot)
  await page.reload()
  assert.equal(await page.locator('#exercises img').count(), 0)
  assert.equal(await page.getByText('<img src=x onerror=alert(1)>').count(), 1)
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
  })
  await page.context().setOffline(true)
  await page.goto(`${origin}/workouts/session/offline-check`, { waitUntil: 'domcontentloaded' })
  assert.equal(await page.getByRole('heading', { name: 'You are offline.' }).count(), 1)
  assert.equal(await page.getByText('<img src=x onerror=alert(1)>').count(), 1)
  await page.close()
} finally {
  await browser.close()
}
