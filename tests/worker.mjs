import assert from 'node:assert/strict'
import worker from '../worker/src/index.js'

const origin = 'https://vitalikdubko8642-source.github.io'
const request = (data, suppliedOrigin = origin) => new Request('https://example.test/', { method: 'POST', headers: { Origin: suppliedOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
let calls = 0
const env = { RATE_LIMIT: { limit: async () => ({ success: true }) }, AI: { run: async () => { calls++; return { choices: [{ message: { content: 'Краткий ответ' } }] } } } }
assert.equal((await worker.fetch(request({ task: 'summary', text: 'Тест' }, 'https://bad.test'), env)).status, 403)
assert.equal((await worker.fetch(request({ task: 'unknown', text: 'Тест' }), env)).status, 400)
assert.equal((await worker.fetch(request({ task: 'summary', text: 'x'.repeat(6001) }), env)).status, 400)
assert.equal((await worker.fetch(request({ task: 'summary', text: 'Телефон +79123456789' }), env)).status, 400)
assert.equal((await worker.fetch(request({ task: 'summary', text: 'Почта test@example.com' }), env)).status, 400)
assert.equal(calls, 0, 'obvious personal data must never reach AI')
const response = await worker.fetch(request({ task: 'summary', text: 'Привет всем' }), env)
assert.equal(response.status, 200)
assert.equal((await response.json()).answer, 'Краткий ответ')
assert.equal(calls, 1)
const classifier = { ...env, AI: { run: async () => ({ choices: [{ message: { content: '{"decision":"reject","reason":"Это не школьная проблема"}' } }] }) } }
const verdict = await worker.fetch(request({ task: 'alert', text: '5+5=??? · Двор' }), classifier)
assert.equal((await verdict.json()).decision, 'reject')
const invalidClassifier = { ...env, AI: { run: async () => ({ choices: [{ message: { content: 'непонятный ответ' } }] }) } }
assert.equal((await worker.fetch(request({ task: 'alert', text: 'Пример' }), invalidClassifier)).status, 503)
const limited = { ...env, RATE_LIMIT: { limit: async () => ({ success: false }) } }
assert.equal((await worker.fetch(request({ task: 'summary', text: 'Тест' }), limited)).status, 429)
console.log('Worker: origin, task, input length, AI response shape and rate limiting passed.')
