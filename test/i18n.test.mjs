import assert from 'node:assert/strict'
import test from 'node:test'

import en from '../src/i18n/en.js'
import pl from '../src/i18n/pl.js'
import {
  DEFAULT_LANGUAGE,
  STORAGE_KEY,
  isSupportedLanguage,
  languageFromSearch,
  normaliseLanguage,
  resolveInitialLanguage,
  t,
} from '../src/i18n/index.js'

const fakeStorage = (value) => ({
  getItem: (key) => (key === STORAGE_KEY ? value : null),
})

test('Polish is the default and both languages are supported', () => {
  assert.equal(DEFAULT_LANGUAGE, 'pl')
  assert.equal(isSupportedLanguage('pl'), true)
  assert.equal(isSupportedLanguage('en'), true)
  assert.equal(isSupportedLanguage('de'), false)
})

test('dictionaries describe the same keys in both languages', () => {
  const missingInEnglish = Object.keys(pl).filter((key) => !(key in en))
  const missingInPolish = Object.keys(en).filter((key) => !(key in pl))

  assert.deepEqual(missingInEnglish, [], 'keys missing from en.js')
  assert.deepEqual(missingInPolish, [], 'keys missing from pl.js')
  assert.ok(Object.keys(pl).length > 60, 'the dictionary looks suspiciously small')
})

test('every value is a non-empty string and placeholders match', () => {
  const placeholders = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

  for (const dictionary of [pl, en]) {
    for (const [key, value] of Object.entries(dictionary)) {
      assert.equal(typeof value, 'string', `${key} must be a string`)
      assert.ok(value.trim().length > 0, `${key} must not be empty`)
    }
  }

  for (const key of Object.keys(pl)) {
    assert.deepEqual(
      placeholders(en[key]),
      placeholders(pl[key]),
      `placeholders differ for ${key}`,
    )
  }
})

test('normalises region tags and rejects unsupported values', () => {
  assert.equal(normaliseLanguage('EN'), 'en')
  assert.equal(normaliseLanguage('en-GB'), 'en')
  assert.equal(normaliseLanguage(' pl '), 'pl')
  assert.equal(normaliseLanguage('de-DE'), null)
  assert.equal(normaliseLanguage(undefined), null)
  assert.equal(normaliseLanguage(null), null)
})

test('reads the language from the query string', () => {
  assert.equal(languageFromSearch('?lang=en'), 'en')
  assert.equal(languageFromSearch('?lang=pl&utm=x'), 'pl')
  assert.equal(languageFromSearch('?utm=x'), null)
  assert.equal(languageFromSearch(''), null)
})

test('the URL wins over the stored choice, and Polish is the fallback', () => {
  assert.equal(
    resolveInitialLanguage({ search: '?lang=en', storage: fakeStorage('pl') }),
    'en',
  )
  assert.equal(
    resolveInitialLanguage({ search: '?lang=pl', storage: fakeStorage('en') }),
    'pl',
  )
  assert.equal(resolveInitialLanguage({ search: '', storage: fakeStorage('en') }), 'en')
  assert.equal(resolveInitialLanguage({ search: '', storage: fakeStorage('de') }), 'pl')
  assert.equal(resolveInitialLanguage({}), 'pl')
})

test('a storage that throws still resolves to Polish', () => {
  const hostileStorage = {
    getItem() {
      throw new Error('blocked')
    },
  }

  assert.equal(resolveInitialLanguage({ storage: hostileStorage }), 'pl')
})

test('translate falls back to Polish and interpolates named values', () => {
  assert.equal(t('nav.operator'), pl['nav.operator'])
  assert.equal(t('nav.operator'), 'Widok operatora')
  assert.equal(t('panel.selectOnFilm', { name: 'Osoba 01' }), 'Wybierz Osoba 01 na filmie')
  assert.equal(t('panel.selectOnFilm', {}), 'Wybierz {name} na filmie')
  assert.equal(t('does.not.exist'), 'does.not.exist')
})

test('thresholds carry identical numbers and units in both languages', () => {
  const CONNECTORS = /\b(?:lub|or|albo|and|i)\b/gi
const withoutConnectors = (value) => value.replace(CONNECTORS, '').replace(/\s+/g, ' ').trim()

  for (const key of [
    'algorithm.red.hr',
    'algorithm.red.rr',
    'algorithm.green.hr',
    'algorithm.green.rr',
  ]) {
    assert.equal(
      withoutConnectors(en[key]),
      withoutConnectors(pl[key]),
      `${key} must keep its thresholds`,
    )
  }

  // The red card embeds the connector word, so it is prose; the green card is
  // pure data and stays byte-identical.
  assert.notEqual(en['algorithm.red.hr'], pl['algorithm.red.hr'])
  assert.equal(en['algorithm.green.hr'], pl['algorithm.green.hr'])
  assert.equal(en['algorithm.green.rr'], pl['algorithm.green.rr'])

  for (const [key, expected] of [
    ['algorithm.red.hr', 'HR ≤40 ≥131/min'],
    ['algorithm.red.rr', 'RR ≤8 ≥25/min'],
    ['algorithm.green.hr', 'HR 51–90/min'],
    ['algorithm.green.rr', 'RR 12–20/min'],
  ]) {
    assert.equal(withoutConnectors(pl[key]), expected)
  }
})