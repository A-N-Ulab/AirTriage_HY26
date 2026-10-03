import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function skipIntro(page) {
  await page.goto('/')
  await expect(page.locator('.intro')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-demo-shell]')).toHaveClass(/is-revealed/)
}

async function expectReadyExperience(page, screenshotName) {
  await skipIntro(page)
  const shell = page.locator('[data-demo-shell]')
  await expect(shell).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.intro')).toHaveCount(0)

  await expect(page.locator('.experience')).toBeVisible()
  await expect(page.locator('#nasz-wklad')).toBeVisible()
  await expect(page.locator('#poparcie-naukowe')).toBeVisible()

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasOverflow).toBe(false)
  await page.screenshot({ path: `test-results/${screenshotName}`, fullPage: true })
}

test('shows the standalone logo stage on the page background before crossfading to the film', async ({ page }) => {
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
  // This check only looks at the splash. Block the demo chunk so the repeated
  // This test needs only the splash, so avoid loading the page chunk repeatedly.
  await page.route('**/assets/experience-*.js', (route) => route.abort())

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

test('plays the local film without controls and keeps the AirTriage lockup', async ({ page }) => {
  const filmResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/video/RYSY_demo_20s_dopracowany.mp4') && response.ok(),
  )
  await page.goto('/')
  await filmResponse

  const intro = page.locator('.intro')
  const video = page.locator('.intro__video')
  await expect(video).toBeAttached()
  await expect(video).toHaveAttribute('src', '/video/RYSY_demo_20s_dopracowany.mp4')
  expect(
    await video.evaluate((element) => ({
      autoplay: element.autoplay,
      controls: element.controls,
      muted: element.muted,
      playsInline: element.playsInline,
    })),
  ).toEqual({ autoplay: false, controls: false, muted: true, playsInline: true })
  await expect.poll(() => video.evaluate((element) => element.videoWidth)).toBeGreaterThan(0)

  await expect(page.locator('.intro__skip, .intro__tap, .intro__progress')).toHaveCount(0)
  await expect(intro).toHaveAttribute('data-phase', 'video', { timeout: 2500 })
  const startTime = await video.evaluate((element) => element.currentTime)
  expect(startTime).toBeLessThan(1)
  await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(
    startTime,
  )
  await expect(page.locator('.intro__lockup-logo')).toBeVisible()
  await expect(page.locator('.intro__lockup-logo')).toHaveAttribute(
    'src',
    '/brand/airtriage-logo.svg',
  )

  await video.evaluate((element) => {
    element.currentTime = Math.max(0, element.duration - 0.1)
  })
  await expect(intro).toHaveAttribute('data-phase', 'handoff', { timeout: 3000 })
})

test('hands off when the local film cannot play', async ({ page }) => {
  await page.route('**/video/RYSY_demo_20s_dopracowany.mp4', (route) => route.abort())
  await page.goto('/')

  const intro = page.locator('.intro')
  await expect(intro).toHaveAttribute('data-phase', 'logo')
  await expect(intro).toHaveAttribute('data-phase', 'handoff', { timeout: 5000 })
  await expect(page.locator('[data-demo-shell]')).toHaveClass(/is-revealed/)
})

test('renders the interactive page at a desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await expectReadyExperience(page, 'experience-desktop.png')
})

test('renders the interactive page without overflow at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expectReadyExperience(page, 'experience-mobile.png')
})

test('keeps the main film paused at its midpoint and scrubs it by dragging', async ({ page }) => {
  await skipIntro(page)
  const surface = page.locator('[data-scrub-surface]')
  const video = page.locator('[data-scrub-video]')

  await expect(video).toHaveAttribute('src', '/video/film_2.mp4')
  await expect
    .poll(() =>
      video.evaluate((element) => ({
        currentTime: element.currentTime,
        duration: element.duration,
        paused: element.paused,
        controls: element.controls,
        autoplay: element.autoplay,
      })),
    )
    .toMatchObject({ paused: true, controls: false, autoplay: false })
  await expect.poll(() => video.evaluate((element) => element.duration)).toBeGreaterThan(0)

  const midpoint = await video.evaluate((element) => ({
    currentTime: element.currentTime,
    duration: element.duration,
  }))
  expect(Math.abs(midpoint.currentTime - midpoint.duration / 2)).toBeLessThan(0.35)

  const box = await surface.boundingBox()
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 4 })
  await page.mouse.up()

  await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(
    midpoint.currentTime,
  )
  expect(await video.evaluate((element) => element.paused)).toBe(true)
})

test('shows text placeholders for example films that will be added later', async ({ page }) => {
  await skipIntro(page)
  await expect(page.locator('.example-card__placeholder')).toHaveCount(2)
  await expect(page.locator('.example-card__placeholder').first()).toContainText(
    'Film przykładowy zostanie dodany później',
  )
  await expect(page.getByText('Tu będzie opis', { exact: true })).toHaveCount(3)
})

test('keeps the page usable when the interactive film fails', async ({ page }) => {
  await page.route('**/video/film_2.mp4', (route) => route.abort())
  await skipIntro(page)

  await expect(page.locator('.scrub-film__fallback')).toBeVisible()
  await expect(page.locator('#nasz-wklad')).toBeVisible()
  await expect(page.locator('#poparcie-naukowe')).toBeVisible()
})

test('keeps a polished loading surface visible while the page chunk is delayed', async ({ page }) => {
  await page.route('**/assets/experience-*.js', async (route) => {
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
  await page.screenshot({ path: 'test-results/experience-loading.png', fullPage: true })
})

test('shows an error and Retry when the lazy chunk fails', async ({ page }) => {
  await page.route('**/assets/experience-*.js', (route) => route.abort())
  await skipIntro(page)

  await expect(page.locator('[data-demo-shell]')).toHaveAttribute('data-state', 'error')
  await expect(page.locator('[data-demo-title]')).toHaveText('Strona niedostępna')
  await expect(page.locator('[data-demo-retry]')).toBeVisible()
})
