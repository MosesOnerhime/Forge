import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const origin = process.env.FORGE_PREVIEW_URL ?? 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } })
  await page.goto(`${origin}/design-preview`)
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  assert.equal(await nav.count(), 1)
  assert.equal(await nav.locator('a,button').count(), 5)
  const more = page.getByRole('button', { name: 'More' })
  await more.click()
  const sheet = page.getByRole('navigation', { name: 'More navigation' })
  assert.equal(await sheet.isVisible(), true)
  assert.deepEqual(await sheet.locator('a').allTextContents(), ['History', 'Journal', 'Routine', 'Settings'])
  assert.equal(await sheet.getByRole('link', { name: 'History' }).getAttribute('href'), '/workouts#history')
  await page.keyboard.press('Escape')
  assert.equal(await sheet.count(), 0)
  assert.equal(await more.evaluate(element => element === document.activeElement), true)
  await more.click()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  const sizes = await nav.locator('a,button').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect()
    return [rect.width, rect.height]
  }))
  assert.equal(sizes.every(([width, height]) => width >= 44 && height >= 44), true)
  await mkdir('docs/screenshots', { recursive: true })
  await page.screenshot({ path: 'docs/screenshots/mobile-more.png' })

  await page.setViewportSize({ width: 1440, height: 900 })
  assert.equal(await page.getByRole('button', { name: 'More' }).count(), 0)
  assert.equal(await page.getByRole('navigation', { name: 'Main navigation' }).locator('a').count(), 6)
} finally {
  await browser.close()
}
