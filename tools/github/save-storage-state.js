const { chromium } = require('@playwright/test')
const path = require('path')
const { loadEnvFiles } = require('./shared.js')

loadEnvFiles()

const main = async () => {
  const storageStatePath = process.env.GITHUB_STORAGE_STATE
  if (!storageStatePath) throw new Error('GITHUB_STORAGE_STATE is not set in .env')

  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  await page.goto('https://github.com/login')
  console.log('\nLog in to GitHub in the browser window, then wait...\n')

  await page.waitForURL('https://github.com/', { timeout: 120_000 })

  await page.context().storageState({ path: path.resolve(storageStatePath) })
  console.log(`\nStorage state saved at ${storageStatePath}\n`)

  await browser.close()
}

main().catch(error => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
