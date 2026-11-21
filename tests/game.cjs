const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  page.setDefaultTimeout(5000)
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  try {
    await page.goto('http://127.0.0.1:5190/'); await page.evaluate(() => localStorage.clear()); await page.reload()
    await page.getByRole('button', { name: 'Начать', exact: true }).click()
    await page.locator('.check input').check(); await page.getByRole('button', { name: 'Дальше', exact: true }).click()
    await page.getByRole('button', { name: /Заполнить пустые поля/ }).click(); await page.getByRole('button', { name: 'Готово', exact: true }).click(); await page.getByRole('button', { name: 'Пропустить' }).click()
    await page.locator('.tabbar button', { hasText: 'Чаты' }).click()
    await page.locator('.chat-row').filter({ hasText: 'Гитара и музыка' }).first().click()
    await page.locator('button.plus').click(); await page.getByRole('button', { name: /Мини-игра «Быстрый счёт»/ }).click()
    await page.getByRole('button', { name: 'Выйти' }).click()
    assert.match(await page.locator('.messages').innerText(), /Раунд завершён без результата/)
    assert.equal(await page.getByText('Играть', { exact: true }).count(), 0)
    assert.deepEqual(errors, [])
    console.log('Game: abandoned round closes and cannot be replayed.')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
