import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const introRoot = join(projectRoot, 'src', 'intro')

test('intro lives in its own folder', () => {
  for (const file of ['index.js', 'timeline.js', 'intro.css']) {
    assert.equal(existsSync(join(introRoot, file)), true, `${file} is missing`)
  }
})

test('intro has no demo or Three.js dependency', () => {
  const sources = ['index.js', 'timeline.js']
    .map((file) => readFileSync(join(introRoot, file), 'utf8'))
    .join('\n')

  assert.doesNotMatch(sources, /(?:from\s+['"]three['"]|\/demo\/)/)
})

test('legacy intro files are removed from the source root', () => {
  for (const file of ['intro.js', 'loader.js', 'intro.css']) {
    assert.equal(existsSync(join(projectRoot, 'src', file)), false, `${file} still exists`)
  }
})

test('the entry point loads the demo through a dynamic import', () => {
  const mainSource = readFileSync(join(projectRoot, 'src', 'main.js'), 'utf8')
  assert.match(mainSource, /import\(['"]\.\/demo\/index\.js['"]\)/)
  assert.doesNotMatch(mainSource, /from\s+['"]\.\/demo\//)
})

test('the production entry chunk excludes the Three.js renderer', () => {
  const viteCli = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  execFileSync(process.execPath, [viteCli, 'build'], {
    cwd: projectRoot,
    stdio: 'pipe',
  })

  const assetsRoot = join(projectRoot, 'dist', 'assets')
  const files = readdirSync(assetsRoot)
  const entryFile = files.find((file) => /^index-.*\.js$/.test(file))
  const demoFile = files.find((file) => /^demo-.*\.js$/.test(file))

  assert.ok(entryFile, 'entry chunk is missing')
  assert.ok(demoFile, 'lazy demo chunk is missing')

  const entrySource = readFileSync(join(assetsRoot, entryFile), 'utf8')
  const demoSource = readFileSync(join(assetsRoot, demoFile), 'utf8')
  assert.doesNotMatch(entrySource, /WebGLRenderer|OrbitControls/)
  assert.match(demoSource, /WebGLRenderer|OrbitControls/)
})
