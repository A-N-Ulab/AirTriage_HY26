import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const logoPath = join(projectRoot, 'public', 'brand', 'airtriage-logo.svg')

test('ships the AirTriage mark as a transparent vector asset', () => {
  assert.equal(existsSync(logoPath), true, 'SVG logo is missing')

  const svg = readFileSync(logoPath, 'utf8')
  assert.match(svg, /<svg\b[^>]*viewBox="0 0 1024 411"/)
  assert.match(svg, /<path\b/)
  assert.doesNotMatch(svg, /<image\b/i)
  assert.doesNotMatch(svg, /(?:background|fill=["'](?:white|#fff(?:fff)?)["'])/i)
})
