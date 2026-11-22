// Exercise the production build under a GitHub Pages-like subpath.
const { chromium } = require('playwright-core')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')

;(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'school-pwa-'))
  const dist = path.join(tmp, 'dist')
  fs.cpSync(path.resolve('dist'), dist, { recursive: true })
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' }
  const server = http.createServer((req, res) => {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/school\/?/, '') || 'index.html'
    const target = path.resolve(dist, relative)
    if (!target.startsWith(dist + path.sep)) { res.writeHead(403).end(); return }
    try {
      res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/school/' })
      res.end(fs.readFileSync(target))
    } catch { res.writeHead(404).end() }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/school/`
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 320, height: 812 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(url)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    await page.getByRole('button', { name: 'Установить на телефон' }).click()
    await page.getByRole('dialog').getByText('Через меню браузера').waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.getByRole('button', { name: 'Понятно' }).click()
    // Simulate the browser-provided event to verify our button invokes its one-shot prompt.
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true })
      event.prompt = async () => { window.__promptCalled = true }
      event.userChoice = Promise.resolve({ outcome: 'accepted' })
      window.dispatchEvent(event)
    })
    await page.getByRole('button', { name: 'Установить на телефон' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Установить', exact: true }).click()
    assert.equal(await page.evaluate(() => window.__promptCalled), true)
    await page.evaluate(() => localStorage.setItem('pwa-test-persist', 'kept'))
    await context.setOffline(true)
    await page.reload()
    await page.getByText('Правила общения:', { exact: false }).waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem('pwa-test-persist')), 'kept')
    await context.setOffline(false)
    await page.evaluate(() => { window.__notReloaded = true })
    fs.appendFileSync(path.join(dist, 'sw.js'), '\n// update test\n')
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update())
    await page.getByText('Доступна новая версия').waitFor({ timeout: 20000 })
    assert.equal(await page.evaluate(() => window.__notReloaded), true)
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Обновить', exact: true }).click()])
    assert.equal(await page.evaluate(() => localStorage.getItem('pwa-test-persist')), 'kept')
    assert.deepEqual(errors, [])
    await context.close()
    const ios = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1' })
    const iphone = await ios.newPage()
    await iphone.goto(url)
    await iphone.getByRole('button', { name: 'Установить на телефон' }).click()
    await iphone.getByRole('dialog').getByText('На iPhone', { exact: true }).waitFor()
    assert.match(await iphone.getByRole('dialog').innerText(), /На экран Домой/)
    await ios.close()
    console.log('PWA checks passed: subpath, Android prompt, iPhone guide, offline reload and user-approved update with local data preserved.')
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
    if (path.dirname(tmp) === os.tmpdir() && path.basename(tmp).startsWith('school-pwa-')) fs.rmSync(tmp, { recursive: true, force: true })
  }
})().catch((error) => { console.error(error); process.exitCode = 1 })
