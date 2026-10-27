import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function register(page: Page) {
  const email = 'browser-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '@example.com'
  await page.goto('/register')
  await page.getByLabel('Full name').fill('Browser Tester')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('BrowserPassword123!')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('heading', { name: /You’ve got this, Browser/ })).toBeVisible()
}
function payload(source: string, description: string) {
  return { source, vacancies: [{ externalId: 'job-42', title: 'Browser Java Role', company: 'Browser Example',
    location: 'Remote, Europe', workMode: 'REMOTE', experience: 'Junior', salary: '€40,000 – €55,000',
    description, sourceUrl: 'https://example.com/jobs/job-42', technologies: ['java', 'spring boot', 'postgresql'] }] }
}
async function importData(page: Page, data: unknown) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Import vacancies' }).click()
  await page.getByLabel('Vacancy data').fill(JSON.stringify(data, null, 2))
  await page.getByRole('button', { name: 'Import vacancies', exact: true }).click()
  await expect(page.getByText('Your library is up to date', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Open imported opportunity' }).click()
  await expect(page.getByRole('heading', { name: 'Browser Java Role', exact: true })).toBeVisible()
}

test('import → apply → save notes → repeat import preserves personal progress', async ({ page }) => {
  await register(page)
  const source = 'browser-' + Date.now()
  await importData(page, payload(source, 'Original description for the browser workflow.'))
  await page.getByRole('button', { name: 'Save opportunity', exact: true }).click()
  await expect(page.getByLabel('Application status')).toHaveValue('SAVED')
  await page.getByLabel('Application status').selectOption('APPLIED')
  await page.getByRole('button', { name: 'Update status', exact: true }).click()
  await expect(page.locator('.status-badge')).toHaveText('Applied')
  await page.getByLabel('Private notes', { exact: true }).fill('Prepare a reliable import demonstration.')
  await page.getByRole('button', { name: 'Save notes', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your notes have been saved.')
  await expect(page.locator('.timeline li')).toHaveCount(2)
  await importData(page, payload(source, 'Updated description received from the same source.'))
  await expect(page.getByText('Updated description received from the same source.', { exact: true })).toBeVisible()
  await expect(page.locator('.status-badge')).toHaveText('Applied')
  await expect(page.getByLabel('Private notes', { exact: true })).toHaveValue('Prepare a reliable import demonstration.')
  await expect(page.locator('.timeline li')).toHaveCount(2)
  await page.reload()
  await expect(page.getByLabel('Private notes', { exact: true })).toHaveValue('Prepare a reliable import demonstration.')
})

test('manual creation and search work; a failed save preserves the draft and supports retry', async ({ page }) => {
  await register(page)
  const title = 'Manual opportunity ' + Date.now()
  await page.getByRole('button', { name: 'Add opportunity', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/Job title/).fill(title)
  await dialog.getByLabel(/Company/).fill('Manual Example')
  await dialog.getByLabel(/Description/).fill('An opportunity entered by hand.')
  await dialog.getByLabel('Technologies', { exact: true }).fill('java, react')
  await dialog.getByRole('button', { name: 'Add opportunity', exact: true }).click()
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save opportunity', exact: true }).click()
  await expect(page.getByLabel('Private notes', { exact: true })).toBeVisible()
  await page.route('**/api/applications/*/notes', route => route.fulfill({
    status: 503, contentType: 'application/problem+json', body: JSON.stringify({ detail: 'Temporary save failure. Please retry.' }),
  }))
  await page.getByLabel('Private notes', { exact: true }).fill('Keep this draft even if saving fails.')
  await page.getByRole('button', { name: 'Save notes', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Temporary save failure.')
  await expect(page.getByLabel('Private notes', { exact: true })).toHaveValue('Keep this draft even if saving fails.')
  await page.unroute('**/api/applications/*/notes')
  await page.getByRole('button', { name: 'Save notes', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your notes have been saved.')
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Opportunities', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search vacancies' }).fill(title)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('.vacancy-card')).toHaveCount(1)
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
})

test('mobile navigation and server-error retry remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await register(page)
  await page.route('**/api/vacancies?*', route => route.fulfill({
    status: 503, contentType: 'application/problem+json', body: JSON.stringify({ detail: 'Temporarily unavailable.' }),
  }))
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Opportunities', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Temporarily unavailable.')
  await page.unroute('**/api/vacancies?*')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('.vacancy-card').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Add opportunity', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible()
})
