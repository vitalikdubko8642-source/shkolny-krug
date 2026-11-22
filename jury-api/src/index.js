const PRODUCTION_ORIGIN = 'https://vitalikdubko8642-source.github.io'
const ROOM_TTL = 24 * 60 * 60 * 1000
const secretPattern = /^[A-Za-z0-9_-]{32}$/
const nickPattern = /^[a-zA-Z0-9_]{3,16}$/
const places = ['У навеса во дворе', 'У главного входа', 'У велопарковки', 'В библиотеке', 'В столовой']
const meetingPrefix = '::MEET::'
const filePrefix = '::FILE::'
const fileMaxBytes = 1024 * 1024
const fileTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf', 'text/plain', 'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
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
      const maxLength = new URL(request.url).pathname === '/attachment' ? 1450000 : 4096
      if (Number(request.headers.get('Content-Length') || 0) > maxLength) return reply({ error: 'Запрос слишком большой.' }, 413)
      const text = await request.text()
      if (text.length > maxLength) return reply({ error: 'Запрос слишком большой.' }, 413)
      data = JSON.parse(text)
    } catch { return reply({ error: 'Неверный запрос.' }, 400) }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return reply({ error: 'Неверный запрос.' }, 400)
    const action = new URL(request.url).pathname
    try {
      if (action === '/jury-enter') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
        if (!(await env.ENTRY_LIMIT.limit({ key: ip })).success || !(await env.JURY_GLOBAL_LIMIT.limit({ key: 'jury-entry' })).success) return reply({ error: 'Слишком много попыток. Попробуйте через минуту.' }, 429)
        const code = typeof data.code === 'string' ? data.code.trim().toUpperCase() : ''
        if (!/^[A-Z0-9]{4}$/.test(code)) return reply({ error: 'Введите четыре английские буквы или цифры.' }, 400)
        const token = randomSecret()
        const tokenHash = await hash(token)
        await env.DB.batch([
          env.DB.prepare('UPDATE jury_codes SET token_hash = ? WHERE code_hash = ? AND token_hash IS NULL AND expires_at > ?').bind(tokenHash, await hash(code), Date.now()),
          env.DB.prepare('INSERT INTO demo_members (token_hash, room_id, nick) SELECT token_hash, room_id, nick FROM jury_codes WHERE token_hash = ?').bind(tokenHash),
        ])
        const claimed = await env.DB.prepare('SELECT room_id, nick, expires_at FROM jury_codes WHERE token_hash = ?').bind(tokenHash).first()
        if (!claimed) return reply({ error: 'Код не подходит или уже использован.' }, 403)
        return reply({ token, nick: claimed.nick, expiresAt: claimed.expires_at, jury: true })
      }
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
      if (!['/poll', '/send', '/meeting', '/meeting-rsvp', '/attachment', '/attachment-get'].includes(action)) return reply({ error: 'Маршрут не найден.' }, 404)
      if (typeof data.token !== 'string' || !secretPattern.test(data.token)) return reply({ error: 'Сессия недействительна.' }, 401)
      const tokenHash = await hash(data.token)
      if (!(await env.SESSION_LIMIT.limit({ key: tokenHash })).success) return reply({ error: 'Слишком много запросов. Подожди немного.' }, 429)
      const member = await env.DB.prepare('SELECT m.room_id, m.nick, r.expires_at FROM demo_members m JOIN demo_rooms r ON r.id = m.room_id WHERE m.token_hash = ? AND r.expires_at > ?').bind(tokenHash, Date.now()).first()
      if (!member) return reply({ error: 'Комната закрыта или время её работы истекло.' }, 401)
      if (action === '/send') {
        const text = typeof data.text === 'string' ? data.text.trim() : ''
        if (!text || text.length > 500) return reply({ error: 'Сообщение должно содержать от 1 до 500 символов.' }, 400)
        if (text.startsWith(meetingPrefix) || text.startsWith(filePrefix)) return reply({ error: 'Неверный формат сообщения.' }, 400)
        if (sensitive.test(text)) return reply({ error: 'В тесте нельзя отправлять номера, адреса, почту и ссылки. Используй вымышленные данные.' }, 400)
        const entry = await env.DB.prepare('INSERT INTO demo_messages (room_id, author, text, created_at) VALUES (?, ?, ?, ?)').bind(member.room_id, member.nick, text, Date.now()).run()
        return reply({ id: entry.meta.last_row_id })
      }
      if (action === '/attachment') {
        const name = typeof data.name === 'string' ? data.name.trim() : ''
        const mime = data.mime
        const encoded = data.data
        if (!name || name.length > 100 || /[\\/\x00-\x1f]/.test(name) || sensitive.test(name) || !fileTypes.has(mime) || typeof encoded !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) return reply({ error: 'Проверь формат и имя файла; личные данные использовать нельзя.' }, 400)
        let size
        try { size = atob(encoded).length } catch { return reply({ error: 'Не удалось прочитать файл.' }, 400) }
        if (!size || size > fileMaxBytes) return reply({ error: 'Размер файла — не больше 1 МБ.' }, 400)
        const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM demo_attachments WHERE room_id = ?').bind(member.room_id).first()
        if (count.n >= 30) return reply({ error: 'В этой тестовой комнате уже 30 файлов.' }, 409)
        const id = crypto.randomUUID(), now = Date.now()
        await env.DB.batch([
          env.DB.prepare('INSERT INTO demo_attachments (id, room_id, name, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, member.room_id, name, mime, size, encoded, now),
          env.DB.prepare('INSERT INTO demo_messages (room_id, author, text, created_at) VALUES (?, ?, ?, ?)').bind(member.room_id, member.nick, filePrefix + id, now),
        ])
        return reply({ id })
      }
      if (action === '/attachment-get') {
        if (typeof data.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.id)) return reply({ error: 'Файл не найден.' }, 404)
        const file = await env.DB.prepare('SELECT name, mime, size, data FROM demo_attachments WHERE id = ? AND room_id = ?').bind(data.id, member.room_id).first()
        if (!file) return reply({ error: 'Файл не найден.' }, 404)
        return reply(file)
      }
      if (action === '/meeting') {
        const now = Date.now()
        const note = typeof data.note === 'string' ? data.note.trim() : ''
        if (!places.includes(data.place) || !Number.isSafeInteger(data.startsAt) || data.startsAt <= now || data.startsAt >= member.expires_at || note.length > 80) return reply({ error: 'Проверь место и время: встреча должна пройти до закрытия комнаты.' }, 400)
        if (sensitive.test(note)) return reply({ error: 'Не указывай в приглашении личные данные или ссылки.' }, 400)
        const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM demo_meetings WHERE room_id = ?').bind(member.room_id).first()
        if (count.n >= 50) return reply({ error: 'В комнате уже достаточно встреч.' }, 409)
        const id = crypto.randomUUID()
        await env.DB.batch([
          env.DB.prepare('INSERT INTO demo_meetings (id, room_id, owner_token_hash, place, note, starts_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, member.room_id, tokenHash, data.place, note, data.startsAt, now),
          env.DB.prepare('INSERT INTO demo_meeting_attendees (meeting_id, token_hash) VALUES (?, ?)').bind(id, tokenHash),
          env.DB.prepare('INSERT INTO demo_messages (room_id, author, text, created_at) VALUES (?, ?, ?, ?)').bind(member.room_id, member.nick, meetingPrefix + id, now),
        ])
        return reply({ id })
      }
      if (action === '/meeting-rsvp') {
        if (typeof data.meetingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.meetingId) || typeof data.going !== 'boolean') return reply({ error: 'Неверные данные встречи.' }, 400)
        const meeting = await env.DB.prepare('SELECT owner_token_hash, starts_at FROM demo_meetings WHERE id = ? AND room_id = ?').bind(data.meetingId, member.room_id).first()
        if (!meeting) return reply({ error: 'Встреча не найдена.' }, 404)
        if (meeting.starts_at <= Date.now()) return reply({ error: 'Эта встреча уже прошла.' }, 400)
        if (!data.going && meeting.owner_token_hash === tokenHash) return reply({ error: 'Автор участвует в своей встрече.' }, 400)
        const query = data.going ? 'INSERT OR IGNORE INTO demo_meeting_attendees (meeting_id, token_hash) VALUES (?, ?)' : 'DELETE FROM demo_meeting_attendees WHERE meeting_id = ? AND token_hash = ?'
        await env.DB.prepare(query).bind(data.meetingId, tokenHash).run()
        return reply({ ok: true })
      }
      const since = Number.isSafeInteger(data.since) && data.since >= 0 ? data.since : 0
      const result = await env.DB.prepare('SELECT id, author, text, created_at AS createdAt FROM demo_messages WHERE room_id = ? AND id > ? ORDER BY id ASC LIMIT 100').bind(member.room_id, since).all()
      const meetings = await env.DB.prepare('SELECT m.id, m.place, m.note, m.starts_at AS startsAt, m.owner_token_hash = ? AS isOwner, (SELECT COUNT(*) FROM demo_meeting_attendees a WHERE a.meeting_id = m.id) AS going, EXISTS(SELECT 1 FROM demo_meeting_attendees a WHERE a.meeting_id = m.id AND a.token_hash = ?) AS mine FROM demo_meetings m WHERE m.room_id = ?').bind(tokenHash, tokenHash, member.room_id).all()
      const attachments = await env.DB.prepare('SELECT id, name, mime, size FROM demo_attachments WHERE room_id = ?').bind(member.room_id).all()
      return reply({ messages: result.results, meetings: meetings.results, attachments: attachments.results, expiresAt: member.expires_at })
    } catch {
      return reply({ error: 'Тестовый чат временно недоступен. Попробуй позже.' }, 503)
    }
  },
}
