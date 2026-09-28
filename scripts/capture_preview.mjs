import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const origin = process.env.FORGE_PREVIEW_URL ?? 'http://localhost:3000'
const output = '.impeccable/review'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.goto(`${origin}/design-preview`, { waitUntil: 'networkidle' })
    if (await page.locator('h1').textContent() !== 'Today starts here.') throw new Error(`Preview failed at ${name}`)
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
    await page.close()
  }
} finally {
  await browser.close()
}
