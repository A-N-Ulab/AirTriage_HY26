import { defineConfig } from '@playwright/test'

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    launchOptions: {
      args: ['--enable-unsafe-swiftshader'],
      ...(executablePath ? { executablePath } : {}),
    },
  },
})
