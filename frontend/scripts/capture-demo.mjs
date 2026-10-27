import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'
const directory = new URL('../../.github/images/', import.meta.url)
await mkdir(directory, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
try {
  await page.goto(baseURL + '/login')
  await page.getByLabel('Email address').fill('demo@example.com')
  await page.getByLabel('Password', { exact: true }).fill('DemoPassword123!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.locator('.metric-card').first().waitFor()
  await page.locator('.vacancy-card').first().waitFor()
  await page.screenshot({ path: fileURLToPath(new URL('dashboard.png', directory)), fullPage: true })
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Opportunities', exact: true }).click()
  await page.locator('.vacancy-card').first().waitFor()
  await page.screenshot({ path: fileURLToPath(new URL('opportunities.png', directory)), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await page.locator('.metric-card').first().waitFor()
  await page.locator('.vacancy-card').first().waitFor()
  await page.screenshot({ path: fileURLToPath(new URL('mobile.png', directory)), fullPage: true })
} finally { await browser.close() }
