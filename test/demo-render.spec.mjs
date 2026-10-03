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

test('shows the standalone logo stage on the page background before crossfading to the film', async ({ page }) => {
  await blockVideo(page)
  await page.goto('/')

  const intro = page.locator('.intro')
  const logo = page.locator('.intro-logo__image')
  await expect(intro).toHaveAttribute('data-phase', 'logo')
  await expect(logo).toBeVisible()
  await expect(logo).toHaveAttribute('src', '/brand/airtriage-logo.svg')
  expect(await intro.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
    'rgb(254, 242, 228)',
  )
  expect(
    await page
      .locator('.intro__media')
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0.3s')

  await expect(intro).toHaveAttribute('data-phase', 'video', { timeout: 2500 })
  await expect(logo).toBeHidden()
})

test('centres the logo mark without clipping it at any viewport', async ({ page }) => {
  await blockVideo(page)
  // This check only looks at the splash. Block the demo chunk so the repeated
  // viewports never spin up a WebGL context and starve the tests that follow.
  await page.route('**/assets/demo-*.js', (route) => route.abort())

  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 1024, height: 640 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]

  for (const viewport of viewports) {
    const label = viewport.width + 'x' + viewport.height
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.intro')).toHaveAttribute('data-phase', 'logo')

    const box = await page.locator('.intro-logo__image').boundingBox()
    expect(box, 'logo mark is missing at ' + label).not.toBeNull()

    // The mark is a wide 1024x411 canvas: sizing on width alone used to
    // overflow short landscape viewports and push the wordmark below the fold.
    expect(box.x, 'clipped on the left at ' + label).toBeGreaterThanOrEqual(-0.5)
    expect(box.y, 'clipped at the top at ' + label).toBeGreaterThanOrEqual(-0.5)
    expect(box.x + box.width, 'clipped on the right at ' + label).toBeLessThanOrEqual(
      viewport.width + 0.5,
    )
    expect(box.y + box.height, 'clipped at the bottom at ' + label).toBeLessThanOrEqual(
      viewport.height + 0.5,
    )

    const offsetX = Math.abs(box.x + box.width / 2 - viewport.width / 2)
    const offsetY = Math.abs(box.y + box.height / 2 - viewport.height / 2)
    expect(offsetX, 'not horizontally centred at ' + label).toBeLessThanOrEqual(1)
    expect(offsetY, 'not vertically centred at ' + label).toBeLessThanOrEqual(1)
  }
})

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
