const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  page.setDefaultTimeout(5000)
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('https://shkolny-krug-ai.okla-school-8642.workers.dev/', async route => {
    const text = JSON.parse(route.request().postData()).text
    const decision = text.includes('5+5') ? 'reject' : 'allow'
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify({ answer: decision === 'reject' ? 'Это не проблема школы' : 'Проблема школы', decision }) })
  })
  try {
    await page.goto('http://127.0.0.1:5190/'); await page.evaluate(() => localStorage.clear()); await page.reload()
    await page.getByRole('button', { name: 'Начать', exact: true }).click(); await page.locator('.check input').check(); await page.getByRole('button', { name: 'Дальше', exact: true }).click()
    await page.getByRole('button', { name: /Заполнить пустые поля/ }).click(); await page.getByRole('button', { name: 'Готово', exact: true }).click(); await page.getByRole('button', { name: 'Пропустить' }).click()
    await page.locator('.tabbar button', { hasText: 'События' }).click(); await page.getByRole('button', { name: 'Сообщить', exact: true }).click()
    await page.locator('.sheet input[placeholder^="Или напиши"]').fill('5+5=???'); await page.getByRole('button', { name: 'Двор', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Сохранить демо-сообщение' }).isDisabled(), true)
    await page.getByRole('button', { name: 'Проверить с ИИ' }).click(); await page.locator('.sheet .check input').check(); await page.getByRole('button', { name: 'Отправить в ИИ' }).click(); await page.getByText('Это не проблема школы').waitFor()
    await page.locator('.sheet-bg').last().click({ position: { x: 3, y: 3 } })
    assert.equal(await page.getByRole('button', { name: 'Сохранить демо-сообщение' }).isDisabled(), true)
    await page.locator('.sheet input[placeholder^="Или напиши"]').fill('На втором этаже сломался туалет')
    await page.getByRole('button', { name: 'Проверить с ИИ' }).click(); await page.locator('.sheet .check input').check(); await page.getByRole('button', { name: 'Отправить в ИИ' }).click(); await page.getByText('Проблема школы', { exact: true }).waitFor()
    await page.locator('.sheet-bg').last().click({ position: { x: 3, y: 3 } })
    assert.equal(await page.getByRole('button', { name: 'Сохранить демо-сообщение' }).isEnabled(), true)
    await page.getByRole('button', { name: 'Сохранить демо-сообщение' }).click()
    assert.match(await page.locator('.alert-card').first().innerText(), /сломался туалет/)
    assert.deepEqual(errors, [])
    console.log('Alert gate: reject, recheck after edits and allow passed (model mocked).')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
