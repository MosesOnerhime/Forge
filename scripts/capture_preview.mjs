import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'

const origin = process.env.FORGE_PREVIEW_URL ?? 'http://localhost:3000'
const output = '.impeccable/review'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.goto(`${origin}/design-preview`, { waitUntil: 'networkidle' })
    if (await page.locator('h1').textContent() !== 'Today starts here.') throw new Error(`Preview failed at ${name}`)
    assert.equal(await page.locator('.today-exercises li').count(), 7)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    const start = await page.getByRole('button', { name: 'Start workout' }).boundingBox()
    assert.ok(start && start.y + start.height <= height - (name === 'mobile' ? 64 : 0), `Start workout is outside the first ${name} viewport`)
    const food = await page.getByRole('button', { name: 'Log food' }).boundingBox()
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
    console.log(`${name}: Log food bottom ${food ? Math.round(food.y + food.height) : 'missing'}px; available ${height - (name === 'mobile' ? 64 : 0)}px`)
    assert.ok(food && food.y + food.height <= height - (name === 'mobile' ? 64 : 0), `Log food is behind the first ${name} viewport navigation`)
    await page.close()
  }
} finally {
  await browser.close()
}
