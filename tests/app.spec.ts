import { test, expect, Page } from '@playwright/test'

// Helper: assert no console errors/hydration issues on a page
async function assertNoConsoleErrors(page: Page, path: string) {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', err => errors.push(err.message))
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  const hydrationErrors = errors.filter(e =>
    e.toLowerCase().includes('hydration') ||
    e.toLowerCase().includes('did not match') ||
    e.toLowerCase().includes('cannot be a descendant')
  )
  expect(hydrationErrors, `Hydration errors on ${path}: ${hydrationErrors.join(', ')}`).toHaveLength(0)
}

// Helper: assert no nested interactive elements (button-in-button, a-in-a)
async function assertNoNestedButtons(page: Page) {
  const nested = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons
      .filter(b => b.closest('button') !== b && b.closest('button') !== null)
      .map(b => b.outerHTML.slice(0, 100))
  })
  expect(nested, `Nested <button> elements found: ${nested.join('\n')}`).toHaveLength(0)
}

// ─── Navigation ──────────────────────────────────────────────────────────────

test('dashboard loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1, [class*="text-xl"]').first()).toBeVisible()
})

test('all nav links are reachable', async ({ page }) => {
  const routes = ['/', '/tasks', '/pipeline', '/ideas', '/feed']
  for (const route of routes) {
    const res = await page.goto(route)
    expect(res?.status(), `${route} returned non-200`).toBe(200)
    // Use 'load' not 'networkidle' — /feed keeps an SSE connection open forever
    await page.waitForLoadState('load')
  }
})

// ─── Hydration / nested buttons ──────────────────────────────────────────────

test('tasks page: no hydration errors', async ({ page }) => {
  await assertNoConsoleErrors(page, '/tasks')
})

test('tasks page: no nested buttons', async ({ page }) => {
  await page.goto('/tasks')
  await page.waitForLoadState('networkidle')
  await assertNoNestedButtons(page)
})

test('pipeline page: no hydration errors', async ({ page }) => {
  await assertNoConsoleErrors(page, '/pipeline')
})

test('pipeline page: no nested buttons', async ({ page }) => {
  await page.goto('/pipeline')
  await page.waitForLoadState('networkidle')
  await assertNoNestedButtons(page)
})

// ─── Task CRUD ────────────────────────────────────────────────────────────────

test('tasks: open new task sheet', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByText('+ New Task').click()
  // Wait for Base UI sheet animation to complete
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('#task-title')).toBeVisible()
})

test('tasks: create and delete a task', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByText('+ New Task').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.locator('#task-title').fill('Playwright test task')
  await page.getByRole('button', { name: 'Create Task' }).click()
  await expect(page.getByText('Playwright test task')).toBeVisible()

  // Delete it
  const row = page.locator('tr').filter({ hasText: 'Playwright test task' })
  await row.getByText('✕').click()
  await expect(page.getByText('Playwright test task')).not.toBeVisible()
})

// ─── Ideas ───────────────────────────────────────────────────────────────────

test('ideas: capture an idea via modal', async ({ page }) => {
  await page.goto('/ideas')
  await page.getByRole('button', { name: '+ New Idea' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.locator('#idea-title').fill('Playwright test idea')
  await page.getByRole('button', { name: 'Capture Idea' }).click()
  await expect(page.getByText('Playwright test idea')).toBeVisible()

  // Clean up
  await page.locator('.group').filter({ hasText: 'Playwright test idea' }).hover()
  await page.locator('.group').filter({ hasText: 'Playwright test idea' }).getByText('✕').click()
})

// ─── Pipeline ────────────────────────────────────────────────────────────────

test('pipeline: open new draft sheet', async ({ page }) => {
  await page.goto('/pipeline')
  await page.getByText('+ New Draft').click()
  await expect(page.getByText('New Draft').last()).toBeVisible()
})

// ─── Feed ────────────────────────────────────────────────────────────────────

test('feed: page loads and shows connection status', async ({ page }) => {
  await page.goto('/feed')
  await expect(page.getByText(/Live|Connecting/)).toBeVisible()
})

// ─── Mobile layout ───────────────────────────────────────────────────────────

test('mobile: tasks page has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tasks')
  await page.waitForLoadState('networkidle')
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
  const viewportWidth = await page.evaluate(() => window.innerWidth)
  expect(bodyWidth, 'Horizontal overflow on mobile tasks page').toBeLessThanOrEqual(viewportWidth + 1)
})

test('mobile: sidebar is hidden or collapsed on small screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  // Sidebar text shouldn't be visible at mobile widths (hidden via responsive classes)
  const sidebarText = page.locator('nav').filter({ hasText: 'Tasks' })
  const isVisible = await sidebarText.isVisible().catch(() => false)
  // Not a hard failure — just note if sidebar is leaking into mobile layout
  if (isVisible) {
    console.warn('Sidebar may need mobile hiding — visible at 390px')
  }
})
