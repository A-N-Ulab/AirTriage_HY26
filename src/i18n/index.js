import pl from './pl.js'

export const STORAGE_KEY = 'airtriage:lang'
export const SUPPORTED_LANGUAGES = ['pl', 'en']
export const DEFAULT_LANGUAGE = 'pl'

/**
 * Polish ships in the entry chunk; every other dictionary is fetched on demand
 * so a visitor who never leaves the default language pays nothing for it.
 */
const LOADERS = {
  pl: () => Promise.resolve({ default: pl }),
  en: () => import('./en.js'),
}

const dictionaries = { pl }
let activeLanguage = DEFAULT_LANGUAGE
const listeners = new Set()

export function isSupportedLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value)
}

export function normaliseLanguage(value) {
  const candidate = String(value ?? '')
    .trim()
    .toLowerCase()
    .split('-')[0]
  return isSupportedLanguage(candidate) ? candidate : null
}

export function languageFromSearch(search) {
  try {
    return normaliseLanguage(new URLSearchParams(search ?? '').get('lang'))
  } catch {
    return null
  }
}

/** URL wins over the stored choice, and Polish is the fallback. */
export function resolveInitialLanguage({ search = '', storage = null } = {}) {
  const stored = (() => {
    try {
      return normaliseLanguage(storage?.getItem?.(STORAGE_KEY))
    } catch {
      return null
    }
  })()

  return languageFromSearch(search) ?? stored ?? DEFAULT_LANGUAGE
}

export function getLanguage() {
  return activeLanguage
}

export async function ensureDictionary(language) {
  if (dictionaries[language]) return dictionaries[language]
  const load = LOADERS[language]
  if (!load) return dictionaries[DEFAULT_LANGUAGE]
  const module = await load()
  dictionaries[language] = module.default
  return dictionaries[language]
}

export function t(key, values) {
  const template = dictionaries[activeLanguage]?.[key] ?? pl[key] ?? key
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(values, name) ? values[name] : match,
  )
}

export function onLanguageChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function syncDocumentLanguage(language) {
  document?.documentElement?.setAttribute('lang', language)
}

function syncLanguageInUrl(language) {
  if (!window?.history?.replaceState) return
  const url = new URL(window.location.href)
  if (language === DEFAULT_LANGUAGE) url.searchParams.delete('lang')
  else url.searchParams.set('lang', language)
  window.history.replaceState(null, '', url)
}

function persistLanguage(language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    /* private mode or blocked storage: the URL still carries the choice */
  }
}

export async function setLanguage(language, { persist = true, syncUrl = true } = {}) {
  const next = normaliseLanguage(language) ?? DEFAULT_LANGUAGE
  await ensureDictionary(next)

  if (next !== activeLanguage) {
    activeLanguage = next
    if (persist) persistLanguage(next)
    if (syncUrl) syncLanguageInUrl(next)
    syncDocumentLanguage(next)
    for (const listener of listeners) listener(next)
  }

  return activeLanguage
}

export function toggleLanguage(options) {
  return setLanguage(activeLanguage === 'pl' ? 'en' : 'pl', options)
}

/** Resolves the boot language before anything user-visible is rendered. */
export async function initLanguage() {
  const initial = resolveInitialLanguage({
    search: window.location.search,
    storage: window.localStorage,
  })

  await ensureDictionary(initial)
  activeLanguage = initial
  syncDocumentLanguage(initial)

  return initial
}

const ATTRIBUTES = {
  aria: 'aria-label',
  alt: 'alt',
  title: 'title',
  placeholder: 'placeholder',
}

/**
 * One pass over the marked-up Polish copy. Elements keep their literal Polish
 * text so the default language needs no JavaScript at all.
 */
export function applyTranslations(root = document) {
  if (!root?.querySelectorAll) return

  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n)
  }

  for (const [name, attribute] of Object.entries(ATTRIBUTES)) {
    for (const element of root.querySelectorAll(`[data-i18n-${name}]`)) {
      element.setAttribute(attribute, t(element.dataset[`i18n${name[0].toUpperCase()}${name.slice(1)}`]))
    }
  }
}