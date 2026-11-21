const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const out = process.env.SHOT_DIR || process.env.TEMP
  fs.mkdirSync(out, { recursive: true })
  const problems = []
  try {
    for (const width of [320, 390, 1024]) {
      for (const theme of ['classic', 'dark', 'clean']) {
        const page = await browser.newPage({ viewport: { width, height: 812 }, reducedMotion: 'reduce' })
        page.on('pageerror', (e) => problems.push(e.message))
        await page.goto('http://127.0.0.1:5190/')
        await page.evaluate((theme) => {
          localStorage.setItem('shkolny-krug-v3', JSON.stringify({ stage: 'main', user: { name: 'Тестов Тест Тестович', phone: '+79000000000', nick: 'new_hero', cls: '9Б', role: 'student', interests: ['Музыка'], color: '#2F80ED', coins: 50, owned: [] }, tab: 'chats', settings: { theme } }))
        }, theme)
        await page.reload()
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
        await page.screenshot({ path: path.join(out, `chats-${width}-${theme}.png`) })
        await page.locator('.chat-row').filter({ hasText: 'Гитара и музыка' }).first().click()
        await page.screenshot({ path: path.join(out, `chat-${width}-${theme}.png`) })
        assert.equal(await page.locator('.tabbar').count(), 0)
        await page.goBack()
        await page.locator('.tabbar button', { hasText: 'События' }).click()
        await page.screenshot({ path: path.join(out, `events-${width}-${theme}.png`) })
        await page.locator('.tabbar button', { hasText: 'Профиль' }).click()
        await page.screenshot({ path: path.join(out, `profile-${width}-${theme}.png`) })
        const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
        assert.equal(reduced, true)
        await page.close()
      }
    }
    assert.deepEqual(problems, [])
    console.log('Design screenshots: 320/390/1024, three themes, reduced motion, chat navigation and overflow passed.')
  } finally { await browser.close() }
})().catch((e) => { console.error(e); process.exitCode = 1 })
