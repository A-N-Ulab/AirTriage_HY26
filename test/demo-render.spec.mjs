import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

const blockVideo = (page) =>
  page.route(/(?:youtube(?:-nocookie)?\.com|ytimg\.com)/, (route) => route.abort())

async function skipIntro(page) {
  await blockVideo(page)
  await page.goto('/')
  await expect(page.locator('.intro')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-demo-shell]')).toHaveClass(/is-revealed/)
}

async function expectReadyTerrain(page, screenshotName) {
  await skipIntro(page)
  const shell = page.locator('[data-demo-shell]')
  await expect(shell).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.intro')).toHaveCount(0)

  const canvas = page.locator('.terrain-demo__canvas')
  await expect(canvas).toBeVisible()
  const dimensions = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  })
  expect(dimensions.width).toBeGreaterThan(300)
  expect(dimensions.height).toBeGreaterThan(300)

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasOverflow).toBe(false)
  await page.screenshot({ path: `test-results/${screenshotName}`, fullPage: true })
}

test('renders the terrain at a desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await expectReadyTerrain(page, 'demo-desktop.png')
})

test('renders the terrain without overflow at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expectReadyTerrain(page, 'demo-mobile.png')
})

test('keeps a polished loading surface visible while the demo chunk is delayed', async ({ page }) => {
  await page.route('**/assets/demo-*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await route.continue()
  })
  await skipIntro(page)

  const shell = page.locator('[data-demo-shell]')
  await expect(shell).toHaveAttribute('data-state', 'loading')
  await expect(page.locator('.intro')).toHaveCount(0)
  await expect(page.locator('.demo-shell__status')).toBeVisible()
  const backgroundImage = await page
    .locator('.demo-shell__status')
    .evaluate((element) => getComputedStyle(element).backgroundImage)
  expect(backgroundImage).not.toBe('none')
  await page.screenshot({ path: 'test-results/demo-loading.png', fullPage: true })
})

test('shows an error and Retry when the lazy chunk fails', async ({ page }) => {
  await page.route('**/assets/demo-*.js', (route) => route.abort())
  await skipIntro(page)

  await expect(page.locator('[data-demo-shell]')).toHaveAttribute('data-state', 'error')
  await expect(page.locator('[data-demo-title]')).toHaveText('Demo unavailable')
  await expect(page.locator('[data-demo-retry]')).toBeVisible()
})

test('shows an error and Retry when the WebGL context is lost', async ({ page }) => {
  await skipIntro(page)

  const shell = page.locator('[data-demo-shell]')
  await expect(shell).toHaveAttribute('data-state', 'ready')
  await page.locator('.terrain-demo__canvas').evaluate((canvas) => {
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  })

  await expect(shell).toHaveAttribute('data-state', 'error')
  await expect(page.locator('[data-demo-title]')).toHaveText('Demo unavailable')
  await expect(page.locator('[data-demo-retry]')).toBeVisible()
})

test('disables automatic orbit for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await skipIntro(page)

  await expect(page.locator('[data-demo-shell]')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('[data-demo-shell]')).toHaveAttribute('data-auto-rotate', 'false')
})
