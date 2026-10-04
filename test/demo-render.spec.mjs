import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function skipIntro(page) {
  await page.goto('/')
  await expect(page.locator('.intro')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-demo-shell]')).toHaveClass(/is-revealed/)
  await expect(page.locator('.intro')).toHaveCount(0)
}

async function expectReadyExperience(page, screenshotName) {
  await skipIntro(page)
  const shell = page.locator('[data-demo-shell]')
  await expect(shell).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.intro')).toHaveCount(0)

  await expect(page.locator('.experience')).toBeVisible()
  await expect(page.locator('#nasze-przyklady')).toBeVisible()
  await expect(page.locator('#nasz-wklad')).toBeVisible()
  await expect(page.locator('#algorytm-i-podstawa-naukowa')).toBeVisible()

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
  ).toBe('0.4s')

  await expect(intro).toHaveAttribute('data-phase', 'video', { timeout: 2500 })
  await expect(logo).toBeHidden()
})

test('keeps the logo visible until a delayed intro film actually starts playing', async ({ page }) => {
  let releaseVideo
  const videoReleased = new Promise((resolve) => {
    releaseVideo = resolve
  })

  await page.route('**/video/RYSY_demo_20s_dopracowany.mp4', async (route) => {
    await videoReleased
    await route.continue()
  })
  await page.goto('/')

  const intro = page.locator('.intro')
  const logo = page.locator('.intro-logo__image')
  await expect(intro).toHaveAttribute('data-phase', 'video', { timeout: 2500 })
  await expect(intro).toHaveAttribute('data-video-ready', 'false')
  await expect(logo).toBeVisible()
  expect(
    await page.locator('.intro__media').evaluate((element) => getComputedStyle(element).opacity),
  ).toBe('0')

  releaseVideo()
  await expect(intro).toHaveAttribute('data-video-ready', 'true', { timeout: 5000 })
  await expect(logo).toBeHidden()
})

test('gives the intro film exclusive bandwidth until it can play through', async ({ page }) => {
  let heldIntroRequest
  let interactiveFilmRequests = 0

  await page.route('**/video/RYSY_demo_20s_dopracowany.mp4', (route) => {
    heldIntroRequest = route
  })
  await page.route('**/video/film_2.mp4', async (route) => {
    interactiveFilmRequests += 1
    await route.abort()
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => Boolean(heldIntroRequest)).toBe(true)
  await expect(page.locator('[data-demo-shell]')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('[data-scrub-video]')).toBeAttached()
  expect(interactiveFilmRequests).toBe(0)

  await page.locator('.intro__video').evaluate((video) => {
    video.dispatchEvent(new Event('canplaythrough'))
  })
  await expect.poll(() => interactiveFilmRequests).toBe(1)

  await heldIntroRequest?.abort()
})

test('releases the interactive film when intro fails during the logo stage', async ({ page }) => {
  let heldIntroRequest
  let interactiveFilmRequests = 0

  await page.route('**/video/RYSY_demo_20s_dopracowany.mp4', (route) => {
    heldIntroRequest = route
  })
  await page.route('**/video/film_2.mp4', async (route) => {
    interactiveFilmRequests += 1
    await route.abort()
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.intro')).toHaveAttribute('data-phase', 'logo')
  await page.locator('.intro__video').dispatchEvent('error')

  await expect.poll(() => interactiveFilmRequests, { timeout: 1000 }).toBe(1)
  await expect(page.locator('.intro')).toHaveAttribute('data-phase', 'logo')

  await heldIntroRequest?.abort()
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
  const lockupBox = await page.locator('.intro__lockup').boundingBox()
  expect(lockupBox.x).toBeGreaterThanOrEqual(12)
  expect(lockupBox.x).toBeLessThanOrEqual(24)
  const viewport = page.viewportSize()
  await expect
    .poll(async () => {
      const settledBox = await page.locator('.intro__lockup').boundingBox()
      return viewport.height - (settledBox.y + settledBox.height)
    })
    .toBeGreaterThanOrEqual(12)
  const settledBox = await page.locator('.intro__lockup').boundingBox()
  const bottomGap = viewport.height - (settledBox.y + settledBox.height)
  expect(bottomGap).toBeLessThanOrEqual(24)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(async () => {
      const mobileBox = await page.locator('.intro__lockup').boundingBox()
      return 844 - (mobileBox.y + mobileBox.height)
    })
    .toBeGreaterThanOrEqual(12)
  const mobileBox = await page.locator('.intro__lockup').boundingBox()
  const mobileBottomGap = 844 - (mobileBox.y + mobileBox.height)
  const safeAreaBottom = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.paddingBottom = 'env(safe-area-inset-bottom)'
    document.body.append(probe)
    const inset = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0
    probe.remove()
    return inset
  })
  expect(mobileBox.x).toBeGreaterThanOrEqual(12)
  expect(mobileBox.x).toBeLessThanOrEqual(24)
  expect(mobileBox.x + mobileBox.width).toBeLessThanOrEqual(390)
  expect(mobileBottomGap).toBeGreaterThanOrEqual(Math.max(12, safeAreaBottom - 0.5))
  expect(mobileBottomGap).toBeLessThanOrEqual(Math.max(24, safeAreaBottom + 0.5))

  await video.evaluate((element) => {
    element.currentTime = Math.max(0, element.duration - 0.1)
  })
  await expect(intro).toHaveAttribute('data-phase', 'handoff', { timeout: 3000 })
})

test('changes one numbered caption beneath the intro film at mask transitions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const video = page.locator('.intro__video')
  const caption = page.locator('[data-intro-caption]')
  await expect(page.locator('.intro')).toHaveAttribute('data-phase', 'video', { timeout: 2500 })
  await expect.poll(() => video.evaluate((element) => element.videoWidth)).toBeGreaterThan(0)
  await expect(caption).toHaveCount(1)
  await expect(page.locator('[data-intro-caption-number]')).toHaveCount(1)
  await expect(page.locator('[data-intro-caption-text]')).toHaveCount(1)

  const cues = [
    { time: 0.1, number: '01', text: 'Lorem ipsum dolor sit amet.' },
    { time: 4.999, number: '01', text: 'Lorem ipsum dolor sit amet.' },
    { time: 5, number: '02', text: 'Consectetur adipiscing elit.' },
    { time: 6.999, number: '02', text: 'Consectetur adipiscing elit.' },
    { time: 7, number: '03', text: 'Sed do eiusmod tempor incididunt.' },
    { time: 10.999, number: '03', text: 'Sed do eiusmod tempor incididunt.' },
    { time: 11, number: '04', text: 'Ut labore et dolore magna aliqua.' },
    { time: 7.1, number: '03', text: 'Sed do eiusmod tempor incididunt.' },
    { time: 0.1, number: '01', text: 'Lorem ipsum dolor sit amet.' },
    { time: 5.1, number: '02', text: 'Consectetur adipiscing elit.' },
    { time: 11.1, number: '04', text: 'Ut labore et dolore magna aliqua.' },
  ]

  for (const cue of cues) {
    await video.evaluate((element, time) => {
      element.pause()
      element.currentTime = time
      element.dispatchEvent(new Event('timeupdate'))
    }, cue.time)
    await expect(caption.locator('[data-intro-caption-number]')).toHaveText(cue.number)
    await expect(caption.locator('[data-intro-caption-text]')).toHaveText(cue.text)
  }

  const [captionBox, logoBox] = await Promise.all([
    caption.boundingBox(),
    page.locator('.intro__lockup-logo').boundingBox(),
  ])
  expect(captionBox).not.toBeNull()
  expect(logoBox).not.toBeNull()
  expect(captionBox.y).toBeGreaterThan(900 * 0.7)
  expect(captionBox.width).toBeGreaterThanOrEqual(logoBox.width * 0.8)
  expect(captionBox.width).toBeLessThanOrEqual(logoBox.width * 1.4)
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

  expect(
    await page.locator('.experience-content > section').evaluateAll((sections) =>
      sections.map((section) => section.id),
    ),
  ).toEqual(['nasze-przyklady', 'nasz-wklad', 'algorytm-i-podstawa-naukowa'])
  await expect(page.locator('#nasz-wklad h2')).toHaveText('Widok operatora')
})

test('centres the main page blocks on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await skipIntro(page)

  for (const selector of [
    '.section-heading',
    '.example-grid',
    '.contribution-body',
    '.science-content',
  ]) {
    const box = await page.locator(selector).first().boundingBox()
    expect(Math.abs(box.x + box.width / 2 - 720), `${selector} is off-centre`).toBeLessThanOrEqual(
      1,
    )
  }
})

test('presents the algorithm and evidence as structured HTML', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await skipIntro(page)

  const science = page.locator('#algorytm-i-podstawa-naukowa')
  await expect(page.locator('.experience-tabs a[href="#algorytm-i-podstawa-naukowa"]')).toHaveText(
    'Algorytm',
  )
  await expect(science.getByRole('heading', { name: 'Algorytm', exact: true })).toBeVisible()
  await expect(science.getByRole('heading', { name: 'Poparcie naukowe', exact: true })).toBeVisible()
  await expect(science).not.toContainText('Co pochodzi z badań, a co jest decyzją POC')
  await expect(science.locator('.algorithm-flow > li')).toHaveCount(3)
  expect(
    await science
      .locator('.algorithm-flow__number')
      .evaluateAll((numbers) => numbers.every((number) => number.getAttribute('aria-hidden') === 'true')),
  ).toBe(true)
  await expect(science.locator('.algorithm-outcome')).toHaveCount(3)
  await expect(science.locator('.evidence-source')).toHaveCount(4)
  await expect(science).toContainText('Czerwony ma pierwszeństwo przed żółtym i zielonym')
  await expect(science).toContainText('HR ≤40 lub ≥131/min')
  await expect(science).toContainText('RR ≤8 lub ≥25/min')
  await expect(science).toContainText('HR 41–50 / 91–130')
  await expect(science).toContainText('RR 9–11 / 21–24')
  await expect(science).toContainText('HR 51–90/min')
  await expect(science).toContainText('RR 12–20/min')
  await expect(science).toContainText('nie zastępuje decyzji ratownika')

  const compactness = await science.evaluate((element) => ({
    paddingTop: Number.parseFloat(getComputedStyle(element).paddingTop),
    titleSize: Number.parseFloat(
      getComputedStyle(element.querySelector('.section-heading h2')).fontSize,
    ),
    evidenceGap: Number.parseFloat(
      getComputedStyle(element.querySelector('.evidence-section')).marginTop,
    ),
  }))
  expect(compactness.paddingTop).toBeLessThanOrEqual(80)
  expect(compactness.titleSize).toBeLessThanOrEqual(76)
  expect(compactness.evidenceGap).toBeLessThanOrEqual(96)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440)
})

test('renders the interactive page without overflow at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expectReadyExperience(page, 'experience-mobile.png')

  const cards = await page.locator('#nasze-przyklady .example-card').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { top: rect.top, bottom: rect.bottom }
    }),
  )
  expect(cards[1].top).toBeGreaterThan(cards[0].bottom)
})

test('keeps the main film paused at its midpoint and scrubs it by dragging', async ({ page }) => {
  await skipIntro(page)
  const surface = page.locator('[data-scrub-surface]')
  const video = page.locator('[data-scrub-video]')

  await expect(
    page.getByRole('group', { name: /Interaktywny film.+Przeciągnij w prawo/i }),
  ).toBeVisible()
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

  await surface.scrollIntoViewIfNeeded()
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

test('selects the same one of four people from panel and film', async ({ page }) => {
  await skipIntro(page)

  const overlay = page.locator('[data-operator-overlay]')
  const cards = page.locator('[data-person-card]')
  const video = page.locator('[data-scrub-video]')

  await expect(overlay).toBeVisible()
  await expect(cards).toHaveCount(4)
  await expect(page.locator('[data-person-id="person-05"]')).toHaveCount(0)
  await expect(overlay).toHaveAttribute('data-selected-person', 'person-01')
  await expect(page.locator('[data-person-card="person-01"]')).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('118/min')
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('22/min')
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('Priorytet żółty')

  const beforeCardClick = await video.evaluate((element) => element.currentTime)
  await page.locator('[data-person-card="person-04"]').click()
  await expect(overlay).toHaveAttribute('data-selected-person', 'person-04')
  await expect(page.locator('[data-person-card="person-04"]')).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(page.locator('[data-person-box="person-04"]')).toBeVisible()
  const afterCardClick = await video.evaluate((element) => element.currentTime)
  expect(Math.abs(afterCardClick - beforeCardClick)).toBeLessThan(0.01)

  const clickFilmPerson = async (personId) => {
    await page.locator('[data-operator-tracking]').evaluate((tracking, id) => {
      const marker = tracking.querySelector(`[data-person-box="${id}"], [data-person-pin="${id}"]`)
      const rect = marker.getBoundingClientRect()
      tracking.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }),
      )
    }, personId)
  }

  await clickFilmPerson('person-02')
  await expect(overlay).toHaveAttribute('data-selected-person', 'person-02')
  await expect(page.locator('[data-person-card="person-02"]')).toHaveAttribute(
    'aria-expanded',
    'true',
  )

  for (const frame of [70, 277]) {
    await video.evaluate((element, time) => {
      element.currentTime = time
      element.dispatchEvent(new Event('seeked'))
    }, frame / 30)
    await expect(overlay).toHaveAttribute('data-frame', String(frame))
    for (const personId of ['person-01', 'person-02', 'person-03', 'person-04']) {
      await clickFilmPerson(personId)
      await expect(overlay).toHaveAttribute('data-selected-person', personId)
    }
  }
})

test('operator layout keeps the A3 rail and tracking layer aligned with the desktop film', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await skipIntro(page)

  const surface = page.locator('[data-scrub-surface]')
  const video = page.locator('[data-scrub-video]')
  const overlay = page.locator('[data-operator-overlay]')
  const tracking = page.locator('[data-operator-tracking]')
  const panel = page.locator('[data-operator-panel]')

  await surface.scrollIntoViewIfNeeded()
  const [surfaceBox, videoBox, overlayBox, trackingBox, panelBox] = await Promise.all([
    surface.boundingBox(),
    video.boundingBox(),
    overlay.boundingBox(),
    tracking.boundingBox(),
    panel.boundingBox(),
  ])

  for (const candidate of [videoBox, overlayBox, trackingBox]) {
    expect(Math.abs(candidate.x - surfaceBox.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(candidate.y - surfaceBox.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(candidate.width - surfaceBox.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(candidate.height - surfaceBox.height)).toBeLessThanOrEqual(1)
  }
  expect(panelBox.width).toBeGreaterThanOrEqual(184)
  expect(panelBox.width).toBeLessThanOrEqual(252)
  expect(panelBox.x - surfaceBox.x).toBeGreaterThanOrEqual(12)
  expect(panelBox.x - surfaceBox.x).toBeLessThanOrEqual(48)
  await expect(page.locator('[data-person-card]')).toHaveCount(4)
  for (const card of await page.locator('[data-person-card]').all()) await expect(card).toBeVisible()
})

test('mobile operator layout uses a compact bottom sheet and accessible film targets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await skipIntro(page)

  const surface = page.locator('[data-scrub-surface]')
  const panel = page.locator('[data-operator-panel]')
  await surface.scrollIntoViewIfNeeded()
  const [surfaceBox, panelBox] = await Promise.all([surface.boundingBox(), panel.boundingBox()])

  expect(panelBox.y).toBeGreaterThan(surfaceBox.y + surfaceBox.height * 0.54)
  expect(panelBox.height).toBeLessThan(surfaceBox.height * 0.44)
  expect(panelBox.x).toBeGreaterThanOrEqual(surfaceBox.x)
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(surfaceBox.x + surfaceBox.width + 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

  const targetBox = await page.locator('[data-person-target]').first().boundingBox()
  expect(targetBox.width).toBeGreaterThanOrEqual(44)
  expect(targetBox.height).toBeGreaterThanOrEqual(44)
  await expect(page.locator('[data-person-card="person-01"] .operator-card__condition')).toBeVisible()
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('Bardzo zmęczona')
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('118/min')
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('22/min')
  await expect(page.locator('.contribution-caption')).toContainText('cztery wybrane osoby')
})

test('reduced motion removes operator interface transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await skipIntro(page)

  expect(
    await page
      .locator('[data-person-card="person-01"]')
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s')
})

test('operator controls support keyboard selection and outside-frame state', async ({ page }) => {
  await skipIntro(page)

  const overlay = page.locator('[data-operator-overlay]')
  const video = page.locator('[data-scrub-video]')
  const thirdCard = page.locator('[data-person-card="person-03"]')

  await thirdCard.focus()
  await page.keyboard.press('Enter')
  await expect(overlay).toHaveAttribute('data-selected-person', 'person-03')

  await page.locator('[data-person-target="person-04"]').focus()
  await page.keyboard.press('Space')
  await expect(overlay).toHaveAttribute('data-selected-person', 'person-04')

  await video.evaluate((element) => {
    element.currentTime = 0
    element.dispatchEvent(new Event('seeked'))
  })
  await expect(page.locator('[data-person-card="person-04"]')).toContainText('Poza kadrem')
  await expect(page.locator('[data-person-box="person-04"]')).toHaveCount(0)
})

test('operator overlay shows image and scenario fallbacks without blocking the film', async ({ page }) => {
  await page.route('**/operator/person-02-green.webp', (route) => route.abort())
  await skipIntro(page)

  await page.locator('[data-person-card="person-02"]').click()
  await expect(page.locator('[data-person-image-fallback="person-02"]')).toBeVisible()
  await expect(page.locator('[data-scrub-video]')).toBeVisible()

  await page.unroute('**/operator/person-02-green.webp')
  await page.route('**/assets/operator-scenario-*.js', (route) => route.abort())
  await page.reload()
  await expect(page.locator('.intro')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-operator-status]')).toContainText(
    'Scenariusz operatora jest niedostępny',
  )
  await expect(page.locator('[data-scrub-video]')).toBeVisible()
})

test('shows text placeholders for example films that will be added later', async ({ page }) => {
  await skipIntro(page)
  await expect(page.locator('#nasze-przyklady .example-card__placeholder')).toHaveCount(2)
  await expect(page.locator('#nasze-przyklady .example-card__placeholder').first()).toContainText(
    'Film przykładowy zostanie dodany później',
  )
  await expect(page.getByText('Tu będzie opis', { exact: true })).toHaveCount(2)
})

test('keeps the page usable when the interactive film fails', async ({ page }) => {
  await page.route('**/video/film_2.mp4', (route) => route.abort())
  await skipIntro(page)

  await expect(page.locator('.scrub-film__fallback')).toBeVisible()
  await expect(page.locator('[data-operator-overlay]')).toBeHidden()
  await expect(page.locator('#nasz-wklad')).toBeVisible()
  await expect(page.locator('#algorytm-i-podstawa-naukowa')).toBeVisible()
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
