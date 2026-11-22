const PRODUCTION_ORIGIN = 'https://vitalikdubko8642-source.github.io'
const ROOM_TTL = 24 * 60 * 60 * 1000
const secretPattern = /^[A-Za-z0-9_-]{32}$/
const nickPattern = /^[a-zA-Z0-9_]{3,16}$/
const sensitive = /(?:\+?\d[\d\s()-]{5,}\d)|[\w.+-]+@[\w.-]+\.[a-zа-яё]{2,}|https?:\/\/|(?:ул\.|улица|проспект|переулок|дом\s+\d)\s*\S+/iu

function randomSecret() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), (v) => v.toString(16).padStart(2, '0')).join('')
}
const validNick = (nick) => typeof nick === 'string' && nickPattern.test(nick) && !/\d{7,}/.test(nick)

export default {
  async scheduled(_event, env) {
    await env.DB.prepare('DELETE FROM demo_rooms WHERE expires_at <= ?').bind(Date.now()).run()
  },
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    const local = env.ALLOW_LOCAL === 'true' && /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin || '')
    if (origin !== PRODUCTION_ORIGIN && !local) return new Response('Forbidden', { status: 403 })
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' }
    const reply = (body, status = 200) => Response.json(body, { status, headers })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply({ error: 'Метод недоступен.' }, 405)
    let data
    try {
      if (Number(request.headers.get('Content-Length') || 0) > 4096) return reply({ error: 'Запрос слишком большой.' }, 413)
      const text = await request.text()
      if (text.length > 4096) return reply({ error: 'Запрос слишком большой.' }, 413)
      data = JSON.parse(text)
    } catch { return reply({ error: 'Неверный запрос.' }, 400) }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return reply({ error: 'Неверный запрос.' }, 400)
    const action = new URL(request.url).pathname
    try {
      if (action === '/create' || action === '/join') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
        if (!(await env.ENTRY_LIMIT.limit({ key: ip })).success) return reply({ error: 'Слишком много попыток. Попробуй через минуту.' }, 429)
        if (!validNick(data.nick)) return reply({ error: 'Ник: 3–16 латинских букв, цифр или подчёркиваний.' }, 400)
        let code = data.code
        if (action === '/create') {
          code = randomSecret()
          const id = await hash(code)
          await env.DB.prepare('INSERT INTO demo_rooms (id, expires_at) VALUES (?, ?)').bind(id, Date.now() + ROOM_TTL).run()
        }
        if (typeof code !== 'string' || !secretPattern.test(code)) return reply({ error: 'Проверь код комнаты.' }, 400)
        const room = await hash(code)
        const found = await env.DB.prepare('SELECT expires_at FROM demo_rooms WHERE id = ? AND expires_at > ?').bind(room, Date.now()).first()
        if (!found) return reply({ error: 'Комната не найдена или время её работы истекло.' }, 404)
        const token = randomSecret()
        try {
          const inserted = await env.DB.prepare('INSERT INTO demo_members (token_hash, room_id, nick) SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM demo_members WHERE room_id = ?) < 12').bind(await hash(token), room, data.nick, room).run()
          if (!inserted.meta.changes) return reply({ error: 'В комнате уже 12 участников. Создай новую.' }, 409)
        }
        catch (e) { if (String(e).includes('UNIQUE')) return reply({ error: 'Этот ник в комнате уже занят.' }, 409); throw e }
        return reply({ code, token, nick: data.nick, expiresAt: found.expires_at })
      }
      if (action !== '/poll' && action !== '/send') return reply({ error: 'Маршрут не найден.' }, 404)
      if (typeof data.token !== 'string' || !secretPattern.test(data.token)) return reply({ error: 'Сессия недействительна.' }, 401)
      const tokenHash = await hash(data.token)
      if (!(await env.SESSION_LIMIT.limit({ key: tokenHash })).success) return reply({ error: 'Слишком много запросов. Подожди немного.' }, 429)
      const member = await env.DB.prepare('SELECT m.room_id, m.nick, r.expires_at FROM demo_members m JOIN demo_rooms r ON r.id = m.room_id WHERE m.token_hash = ? AND r.expires_at > ?').bind(tokenHash, Date.now()).first()
      if (!member) return reply({ error: 'Комната закрыта или время её работы истекло.' }, 401)
      if (action === '/send') {
        const text = typeof data.text === 'string' ? data.text.trim() : ''
        if (!text || text.length > 500) return reply({ error: 'Сообщение должно содержать от 1 до 500 символов.' }, 400)
        if (sensitive.test(text)) return reply({ error: 'В тесте нельзя отправлять номера, адреса, почту и ссылки. Используй вымышленные данные.' }, 400)
        const entry = await env.DB.prepare('INSERT INTO demo_messages (room_id, author, text, created_at) VALUES (?, ?, ?, ?)').bind(member.room_id, member.nick, text, Date.now()).run()
        return reply({ id: entry.meta.last_row_id })
      }
      const since = Number.isSafeInteger(data.since) && data.since >= 0 ? data.since : 0
      const result = await env.DB.prepare('SELECT id, author, text, created_at AS createdAt FROM demo_messages WHERE room_id = ? AND id > ? ORDER BY id ASC LIMIT 100').bind(member.room_id, since).all()
      return reply({ messages: result.results, expiresAt: member.expires_at })
    } catch {
      return reply({ error: 'Тестовый чат временно недоступен. Попробуй позже.' }, 503)
    }
  },
}
