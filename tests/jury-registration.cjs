const { chromium } = require('playwright-core')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const codes = JSON.parse(fs.readFileSync(process.env.JURY_CODES_FILE, 'utf8'))
const pageUrl = process.env.JURY_TEST_URL || 'http://127.0.0.1:5193/'
const apiUrl = process.env.JURY_API_URL || 'http://127.0.0.1:8792'
async function api(action, data) {
  const r = await fetch(`${apiUrl}/${action}`, { method: 'POST', headers: { Origin: new URL(pageUrl).origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  return { status: r.status, data: await r.json() }
}
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu'] })
  try {
    const contexts = await Promise.all([320, 390].map(width => browser.newContext({ viewport: { width, height: 840 } })))
    const pages = await Promise.all(contexts.map(c => c.newPage()))
    const errors = []
    for (const p of pages) p.on('pageerror', e => errors.push(e.message))
    for (const [i, p] of pages.entries()) {
      await p.goto(pageUrl)
      await p.getByRole('button', { name: 'Начать', exact: true }).click()
      await p.getByRole('checkbox').check()
      await p.getByRole('button', { name: 'Дальше' }).click()
      await p.getByRole('button', { name: 'Жюри', exact: true }).click()
      if (i === 0 && process.env.JURY_SCREENSHOT_DIR) await p.screenshot({ path: `${process.env.JURY_SCREENSHOT_DIR}/jury-code.png` })
      await p.getByLabel('Код жюри').fill(codes[i])
      await p.getByRole('button', { name: 'Продолжить' }).click()
      await p.getByText('Добро пожаловать в 9В!').waitFor()
      await p.getByRole('button', { name: 'Перейти в приложение' }).click()
      await p.getByRole('button', { name: /9В — наш класс/ }).click()
      await p.getByRole('heading', { name: '9В — наш класс' }).waitFor()
      if (i === 0 && process.env.JURY_SCREENSHOT_DIR) await p.screenshot({ path: `${process.env.JURY_SCREENSHOT_DIR}/jury-class.png` })
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    }
    assert.equal((await api('jury-enter', { code: codes[0] })).status, 403)
    assert.equal((await api('jury-enter', { code: 'BAD!' })).status, 400)
    await pages[0].getByRole('textbox', { name: 'Сообщение' }).fill('Привет, проверка чата!')
    await pages[0].getByRole('button', { name: 'Отправить', exact: true }).click()
    await pages[1].getByText('Привет, проверка чата!', { exact: true }).waitFor({ timeout: 12000 })
    await pages[1].getByRole('textbox', { name: 'Сообщение' }).fill('Всё видно!')
    await pages[1].getByRole('button', { name: 'Отправить', exact: true }).click()
    await pages[0].getByText('Всё видно!', { exact: true }).waitFor({ timeout: 12000 })
    await pages[0].reload()
    await pages[0].getByText('Всё видно!', { exact: true }).waitFor({ timeout: 12000 })
    const other = await api('create', { nick: 'outside' })
    const outsider = await api('poll', { token: other.data.token, since: 0 })
    assert.deepEqual(outsider.data.messages, [])
    assert.deepEqual(errors, [])
    console.log('Jury registration: two individual codes, one-time use, shared chat, reload, isolation and mobile widths passed.')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
