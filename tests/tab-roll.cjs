const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 812 }, reducedMotion })
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5190/')
      await page.evaluate(() => localStorage.setItem('shkolny-krug-v3', JSON.stringify({ stage:'main', user:{nick:'new_hero',cls:'9Б',role:'student',interests:[],color:'#2F80ED',coins:50,owned:[]},tab:'chats' })))
      await page.reload()
      const indicator = page.locator('.tab-indicator')
      const pos = () => indicator.evaluate(el => el.getBoundingClientRect().x)
      const start = await pos()
      await page.locator('.tabbar button', { hasText: 'Профиль' }).click()
      await page.waitForTimeout(reducedMotion === 'reduce' ? 50 : 130)
      const middle = await pos()
      await page.waitForTimeout(700)
      const end = await pos()
      assert.ok(end > start + 150, 'indicator should reach the last tab')
      if (reducedMotion === 'no-preference') assert.ok(middle > start && middle < end, `indicator must visibly travel: ${start}, ${middle}, ${end}`)
      else assert.ok(Math.abs(end - middle) < 1, 'reduced motion should be instant')
      await page.locator('.tabbar button', { hasText: 'Чаты' }).click()
      await page.waitForTimeout(700)
      assert.ok(Math.abs(await pos() - start) < 2, 'indicator should return to first tab')
      await page.close()
    }
    console.log('Navigation indicator travels across tabs and respects reduced motion.')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
