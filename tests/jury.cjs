// Run with the local jury worker and Vite server, or with explicitly supplied URLs.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')
const assert = require('node:assert/strict')
const pageUrl = process.env.JURY_TEST_URL || 'http://127.0.0.1:5193/'
const apiUrl = process.env.JURY_API_URL || 'http://127.0.0.1:8792'
const origin = new URL(pageUrl).origin

async function api(action, payload, suppliedOrigin = origin) {
  const r = await fetch(`${apiUrl}/${action}`, { method: 'POST', headers: { Origin: suppliedOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  let data = {}; try { data = await r.json() } catch { /* non-JSON errors */ }
  return { status: r.status, data }
}

;(async () => {
  assert.equal((await api('create', { nick: 'fox' }, 'https://untrusted.example')).status, 403)
  assert.equal((await api('poll', { token: 'invalid' })).status, 401)
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu'] })
  try {
    const a = await browser.newContext({ viewport: { width: 320, height: 812 } })
    const b = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const pa = await a.newPage(), pb = await b.newPage()
    const errors = []
    for (const p of [pa, pb]) p.on('pageerror', (error) => errors.push(error.message))
    await Promise.all([pa.goto(pageUrl), pb.goto(pageUrl)])
    for (const p of [pa, pb]) await p.getByRole('button', { name: 'Тестовая комната для жюри' }).click()
    await pa.getByRole('button', { name: 'Создать комнату', exact: true }).first().click()
    await pa.getByLabel('Вымышленный ник').fill('blue_fox')
    await pa.locator('form').getByRole('button', { name: 'Создать комнату' }).click()
    const code = await pa.locator('.jury-invite code').textContent()
    assert.match(code, /^[A-Za-z0-9_-]{32}$/)
    await pb.getByLabel('Вымышленный ник').fill('red_owl')
    await pb.getByLabel('Код комнаты').fill(code)
    await pb.getByRole('button', { name: 'Войти в комнату' }).click()
    await pb.getByRole('textbox', { name: 'Сообщение' }).fill('Привет, это проверка!')
    await pb.getByRole('button', { name: 'Отправить', exact: true }).click()
    await pa.getByText('Привет, это проверка!', { exact: true }).waitFor({ timeout: 12000 })
    await pa.getByRole('textbox', { name: 'Сообщение' }).fill('Отлично, вижу тебя.')
    await pa.getByRole('button', { name: 'Отправить', exact: true }).click()
    await pb.getByText('Отлично, вижу тебя.', { exact: true }).waitFor({ timeout: 12000 })
    await pa.getByRole('textbox', { name: 'Сообщение' }).fill('+79991234567')
    await pa.getByRole('button', { name: 'Отправить', exact: true }).click()
    assert.match(await pa.getByRole('alert').innerText(), /личные данные/i)
    await pa.reload()
    await pa.getByText('Привет, это проверка!', { exact: true }).waitFor({ timeout: 12000 })
    await pa.goBack()
    await pa.getByRole('button', { name: 'Тестовая комната для жюри' }).click()
    await pa.getByText('Привет, это проверка!', { exact: true }).waitFor({ timeout: 12000 })
    assert.equal(await pa.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.equal(await pb.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.deepEqual(errors, [])
    const duplicate = await api('join', { nick: 'RED_OWL', code })
    assert.equal(duplicate.status, 409)
    const other = await api('create', { nick: 'green_fox' })
    const outsider = await api('poll', { token: other.data.token, since: 0 })
    assert.deepEqual(outsider.data.messages, [])
    const blocked = await api('send', { token: other.data.token, text: 'пиши на test@example.com' })
    assert.equal(blocked.status, 400)
    console.log('Jury chat passed: two independent browser sessions, two-way messages, reload, room isolation, nickname uniqueness and personal-data checks.')
    await a.close(); await b.close()
  } finally { await browser.close() }
})().catch((error) => { console.error(error); process.exitCode = 1 })
