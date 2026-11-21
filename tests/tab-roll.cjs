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
      if (reducedMotion === 'no-preference') {
        assert.equal(await page.locator('.tab-content').evaluate(el => el.style.getPropertyValue('--section-enter-x')), '28px', 'forward screen must enter from the right')
        const x = await page.locator('.tab-content').evaluate(el => { const animation = el.getAnimations().find(a => a.animationName === 'section-slide'); animation.currentTime = 50; return new DOMMatrix(getComputedStyle(el).transform).m41 })
        assert.ok(x > 0, `forward screen actually enters from the right: ${x}`)
      }
      await page.waitForTimeout(reducedMotion === 'reduce' ? 50 : 130)
      const middle = await pos()
      await page.waitForTimeout(700)
      const end = await pos()
      assert.ok(end > start + 150, 'indicator should reach the last tab')
      if (reducedMotion === 'no-preference') assert.ok(middle > start && middle < end, `indicator must visibly travel: ${start}, ${middle}, ${end}`)
      else assert.ok(Math.abs(end - middle) < 1, 'reduced motion should be instant')
      await page.locator('.tabbar button', { hasText: 'Чаты' }).click()
      if (reducedMotion === 'no-preference') {
        assert.equal(await page.locator('.tab-content').evaluate(el => el.style.getPropertyValue('--section-enter-x')), '-28px', 'backward screen must enter from the left')
        const x = await page.locator('.tab-content').evaluate(el => { const animation = el.getAnimations().find(a => a.animationName === 'section-slide'); animation.currentTime = 50; return new DOMMatrix(getComputedStyle(el).transform).m41 })
        assert.ok(x < 0, `backward screen actually enters from the left: ${x}`)
        await page.waitForTimeout(130)
        const reverseMiddle = await pos()
        assert.ok(reverseMiddle < end && reverseMiddle > start, `indicator must visibly travel back: ${end}, ${reverseMiddle}, ${start}`)
      }
      await page.waitForTimeout(700)
      assert.ok(Math.abs(await pos() - start) < 2, 'indicator should return to first tab')
      await page.close()
    }
    console.log('Navigation indicator travels across tabs and respects reduced motion.')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
