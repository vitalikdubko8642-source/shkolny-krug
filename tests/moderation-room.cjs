const { chromium } = require('playwright-core')
const assert = require('node:assert/strict')
const origin = process.env.MOD_TEST_URL || 'http://127.0.0.1:5194/'
const apiUrl = process.env.MOD_TEST_API || 'http://127.0.0.1:8794'
const secret = process.env.MOD_TEST_SECRET || 'local-test-only-secret-1234567890'
async function api(action, payload) {
  const r = await fetch(`${apiUrl}/${action}`, { method: 'POST', headers: { Origin: new URL(origin).origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  return { status: r.status, data: await r.json() }
}
;(async () => {
  const a = await api('create', { nick: 'reporter_demo' })
  const b = await api('join', { nick: 'author_demo', code: a.data.code })
  const message = await api('send', { token: b.data.token, text: 'Учебный пример для жалобы' })
  assert.equal((await api('report', { token: a.data.token, id: message.data.id, reason: 'Другое', details: 'Проверяем жалобы' })).status, 200)
  assert.equal((await api('report', { token: b.data.token, id: message.data.id, reason: 'Спам или реклама' })).status, 400)
  assert.equal((await api('moderator-list', { secret: 'wrong-secret' })).status, 403)
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu'] })
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Начать', exact: true }).click(); await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Дальше' }).click()
    await page.getByRole('button', { name: /Заполнить пустые поля/ }).click(); await page.getByRole('button', { name: 'Готово', exact: true }).click(); await page.getByRole('button', { name: 'Пропустить' }).click()
    await page.locator('.tabbar button', { hasText: 'Профиль' }).click(); await page.getByRole('button', { name: /Модерация/ }).click()
    await page.getByLabel('Код модератора').fill(secret); await page.getByRole('button', { name: 'Войти', exact: true }).click()
    const report = page.locator('.moderator-report').filter({ hasText: 'Учебный пример для жалобы' })
    await report.waitFor(); assert.match(await report.innerText(), /Проверяем жалобы/)
    if (process.env.MOD_SCREENSHOT) await page.screenshot({ path: process.env.MOD_SCREENSHOT })
    await report.getByRole('button', { name: 'Удалить сообщение' }).click(); await report.waitFor({ state: 'detached' })
    const after = await api('poll', { token: a.data.token, since: 0 })
    assert.equal(after.data.messages.some(m => m.id === message.data.id), false)
    const changed = await api('send', { token: b.data.token, text: 'Изначальный текст' })
    await api('report', { token: a.data.token, id: changed.data.id, reason: 'Спам или реклама' })
    const queue = await api('moderator-list', { secret })
    const changedReport = queue.data.reports.find(r => r.snapshot === 'Изначальный текст')
    assert.ok(changedReport)
    await api('message-edit', { token: b.data.token, id: changed.data.id, text: 'Изменённый текст' })
    assert.equal((await api('moderator-decision', { secret, id: changedReport.id, decision: 'remove' })).status, 409)
    assert.equal((await api('moderator-decision', { secret, id: changedReport.id, decision: 'keep' })).status, 200)
    console.log('Reported message is visible only with moderator code and can be removed by human decision.')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exit(1) })
