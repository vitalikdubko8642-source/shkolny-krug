const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 812 }, reducedMotion })
      await page.goto('http://127.0.0.1:5190/')
      await page.evaluate(() => localStorage.setItem('shkolny-krug-v3', JSON.stringify({ stage: 'main', user: { name: 'Тестов Тест', phone: '+79000000000', nick: 'new_hero', cls: '9Б', role: 'student', interests: [], color: '#2F80ED', coins: 50, owned: [] }, tab: 'chats' })))
      await page.reload()
      await page.locator('.fab').click()
      const duration = await page.locator('.sheet').evaluate((el) => getComputedStyle(el).animationDuration)
      const delay = await page.locator('.sheet').evaluate((el) => getComputedStyle(el).animationDelay)
      if (reducedMotion === 'reduce') { assert.ok(parseFloat(duration) < .01); assert.equal(parseFloat(delay), 0) }
      else assert.ok(parseFloat(duration) >= .2)
      assert.equal(await page.locator('.sheet h3').innerText(), 'Новая группа')
      await page.close()
    }
    console.log('Motion: sheet transition and reduced-motion override passed.')
  } finally { await browser.close() }
})().catch((e) => { console.error(e); process.exitCode = 1 })
