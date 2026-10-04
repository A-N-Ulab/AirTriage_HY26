import { expect, test } from '@playwright/test'

async function skipIntro(page) {
  await page.goto('/')
  await expect(page.locator('.intro')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-demo-shell]')).toHaveClass(/is-revealed/)
  await expect(page.locator('.intro')).toHaveCount(0)
}

const langParam = (page) => new URL(page.url()).searchParams.get('lang')

test('shows Polish by default and offers the switch in the header corner', async ({ page }) => {
  await skipIntro(page)

  const toggle = page.locator('[data-language-toggle]')
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveText('EN')
  await expect(toggle).toHaveAttribute('aria-label', 'Przełącz na angielski')

  // the control sits to the right of the navigation, inside the sticky header
  const [toggleBox, navBox, headerBox] = await Promise.all([
    toggle.boundingBox(),
    page.locator('.experience-tabs').boundingBox(),
    page.locator('.experience-header').boundingBox(),
  ])
  expect(toggleBox.x).toBeGreaterThan(navBox.x + navBox.width)
  expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(headerBox.x + headerBox.width)

  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  await expect(page.locator('#nasze-przyklady h1')).toHaveText('Nasze przykłady')
  await expect(page.locator('#nasz-wklad h2')).toHaveText('Widok operatora')
  await expect(page.locator('#algorytm-i-podstawa-naukowa h2')).toHaveText('Algorytm')
  await expect(page.locator('.experience-tabs')).toContainText('Widok operatora')
  await expect(page.locator('.operator-panel__heading')).toContainText('Osoby w scenariuszu')
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('Priorytet żółty')
  await expect(page.locator('.scrub-film__badge')).toHaveText('Widok poglądowy')
  expect(langParam(page)).toBeNull()
})

test('switches every section to English and back without a reload', async ({ page }) => {
  await skipIntro(page)
  const toggle = page.locator('[data-language-toggle]')
  const reloads = []
  page.on('load', () => reloads.push(true))

  await toggle.click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(toggle).toHaveText('PL')
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to Polish')
  await expect(page.locator('#nasze-przyklady h1')).toHaveText('Our examples')
  await expect(page.locator('#nasz-wklad h2')).toHaveText('Operator view')
  await expect(page.locator('#algorytm-i-podstawa-naukowa h2')).toHaveText('Algorithm')
  await expect(page.locator('.experience-tabs')).toContainText('Operator view')
  await expect(page.locator('.contribution-caption__text')).toContainText('four selected people')
  await expect(page.locator('.scrub-film__badge')).toHaveText('Preview view')
  await expect(page.locator('.science-lead')).toContainText('does not replace the rescuer')
  await expect(page.locator('.operator-panel__heading')).toContainText('People in the scenario')
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('Yellow priority')
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('Very tired')
  await expect(page.locator('[data-person-target="person-01"]')).toHaveAttribute(
    'aria-label',
    'Select Person 01 on the film',
  )
  await expect(page.locator('.scrub-film')).toHaveAttribute(
    'aria-label',
    /Interactive film. Drag right/,
  )
  // the inline thresholds keep their emphasis inside the translated paragraph
  await expect(page.locator('.algorithm-outcome--green strong').first()).toHaveText('HR 51–90/min')
  await expect(page.locator('.algorithm-outcome--red h4 + p')).toContainText('HR ≤40 or ≥131/min')
  await expect(page.locator('.algorithm-panel__note')).toContainText(
    'Red takes priority over yellow and green',
  )
  expect(langParam(page)).toBe('en')

  await toggle.click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  await expect(toggle).toHaveText('EN')
  await expect(page.locator('#nasz-wklad h2')).toHaveText('Widok operatora')
  await expect(page.locator('[data-person-card="person-01"]')).toContainText('Priorytet żółty')
  await expect(page.locator('.algorithm-outcome--red h4 + p')).toContainText('HR ≤40 lub ≥131/min')
  expect(langParam(page)).toBeNull()
  expect(reloads).toHaveLength(0)
})

test('starts in English from the query parameter and prefers it over a stored choice', async ({
  page,
}) => {
  await page.goto('/?lang=en')
  await expect(page.locator('.intro')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-demo-shell]')).toHaveClass(/is-revealed/)

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('[data-demo-title]')).toHaveText('Loading the page')
  await expect(page.locator('#nasz-wklad h2')).toHaveText('Operator view')
  await expect(page.locator('[data-demo-message]')).toHaveText(
    /Loading the page|Preparing the page|Almost ready|Page ready/,
  )

  await page.evaluate(() => window.localStorage.setItem('airtriage:lang', 'en'))
  await page.goto('/?lang=pl')
  await expect(page.locator('.intro')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-demo-shell]')).toHaveClass(/is-revealed/)

  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  await expect(page.locator('#nasz-wklad h2')).toHaveText('Widok operatora')
})

test('remembers the language for the next visit and keeps English free of Polish copy', async ({
  page,
}) => {
  await skipIntro(page)
  await page.locator('[data-language-toggle]').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await page.evaluate(() => window.localStorage.getItem('airtriage:lang'))).toBe('en')

  const sections = page.locator('.experience-content')
  await expect(sections).not.toContainText('Widok operatora')
  await expect(sections).not.toContainText('Nasze przykłady')
  await expect(sections).not.toContainText('Priorytet żółty')
  await expect(sections).not.toContainText('Zakres POC')

  // a fresh visit without the parameter reuses the stored language
  await page.goto('/')
  await expect(page.locator('.intro')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-demo-shell]')).toHaveClass(/is-revealed/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('#nasz-wklad h2')).toHaveText('Operator view')
})

test('keeps the English layout free of horizontal overflow on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/?lang=en')
  await expect(page.locator('.intro')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-demo-shell]')).toHaveClass(/is-revealed/)

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await expect(page.locator('[data-language-toggle]')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})