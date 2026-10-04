import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const introRoot = join(projectRoot, 'src', 'intro')

test('intro lives in its own folder', () => {
  for (const file of [
    'index.js',
    'timeline.js',
    'intro.css',
    'logo-stage.js',
    'logo-stage.css',
    'video-stage.js',
    'video-stage.css',
  ]) {
    assert.equal(existsSync(join(introRoot, file)), true, `${file} is missing`)
  }
})

test('intro has no page experience dependency', () => {
  const sources = ['index.js', 'timeline.js']
    .map((file) => readFileSync(join(introRoot, file), 'utf8'))
    .join('\n')

  assert.doesNotMatch(sources, /\/experience\//)
})

test('logo and film stages can be developed without importing each other', () => {
  const logoPath = join(introRoot, 'logo-stage.js')
  const videoPath = join(introRoot, 'video-stage.js')

  assert.equal(existsSync(logoPath), true, 'logo stage module is missing')
  assert.equal(existsSync(videoPath), true, 'film stage module is missing')

  const logoSource = readFileSync(logoPath, 'utf8')
  const videoSource = readFileSync(videoPath, 'utf8')

  assert.doesNotMatch(logoSource, /(?:youtube|iframe|video-stage)/i)
  assert.doesNotMatch(videoSource, /(?:airtriage-logo|logo-stage)/i)
})

test('the intro coordinator composes the independent logo and film stages', () => {
  const source = readFileSync(join(introRoot, 'index.js'), 'utf8')

  assert.match(
    source,
    /import\s+\{\s*createLogoStage\s*\}\s+from\s+['"]\.\/logo-stage\.js['"]/,
  )
  assert.match(
    source,
    /import\s+\{\s*(?:[$\w]+\s*,\s*)*createVideoStage(?:\s*,\s*[$\w]+)*\s*\}\s+from\s+['"]\.\/video-stage\.js['"]/,
  )
})

test('legacy intro files are removed from the source root', () => {
  for (const file of ['intro.js', 'loader.js', 'intro.css']) {
    assert.equal(existsSync(join(projectRoot, 'src', file)), false, `${file} still exists`)
  }
})

test('the entry point loads the page experience through a dynamic import', () => {
  const mainSource = readFileSync(join(projectRoot, 'src', 'main.js'), 'utf8')
  assert.match(mainSource, /import\(['"]\.\/experience\/index\.js['"]\)/)
  assert.doesNotMatch(mainSource, /from\s+['"]\.\/experience\//)
})

test('the production entry keeps the interactive page in a lazy chunk', () => {
  const viteCli = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  execFileSync(process.execPath, [viteCli, 'build'], {
    cwd: projectRoot,
    stdio: 'pipe',
  })

  const assetsRoot = join(projectRoot, 'dist', 'assets')
  const files = readdirSync(assetsRoot)
  const entryFile = files.find((file) => /^index-.*\.js$/.test(file))
  const experienceFile = files.find((file) => /^experience-.*\.js$/.test(file))

  assert.ok(entryFile, 'entry chunk is missing')
  assert.ok(experienceFile, 'lazy experience chunk is missing')

  const entrySource = readFileSync(join(assetsRoot, entryFile), 'utf8')
  const experienceSource = readFileSync(join(assetsRoot, experienceFile), 'utf8')
  assert.doesNotMatch(entrySource, /film_2\.mp4|pointerdown/)
  assert.match(experienceSource, /film_2\.mp4/)
  assert.match(experienceSource, /pointerdown/)
})
