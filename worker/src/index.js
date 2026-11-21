const allowedOrigin = 'https://vitalikdubko8642-source.github.io'
const tasks = {
  summary: 'Кратко перескажи на русском содержание выдуманного учебного чата в 2–4 пунктах. Не добавляй факты, имена, телефоны или адреса, которых нет в тексте.',
  complaint: 'Это учебная демонстрация жалобы на сообщение. На русском в 1–2 предложениях объясни, что стоит проверить человеку-модератору. Не выноси вердикт и не назначай наказания.',
  alert: 'Это учебная демонстрация школьного сообщения. На русском в 1–2 предложениях предложи сообщить ответственному взрослому. Не утверждай, что сообщил кому-либо. Не давай инструкций по ремонту, электричеству, эвакуации и опасным действиям, не решай, правдиво ли сообщение.'
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    const cors = { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store', 'Vary': 'Origin' }
    if (origin !== allowedOrigin) return new Response('Forbidden', { status: 403 })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    if (!(await env.RATE_LIMIT.limit({ key: ip })).success) return Response.json({ error: 'Слишком много запросов, попробуй позже.' }, { status: 429, headers: cors })
    if (Number(request.headers.get('Content-Length') || 0) > 12000) return Response.json({ error: 'Текст слишком длинный.' }, { status: 413, headers: cors })
    let data
    try { const body = await request.text(); if (body.length > 12000) return Response.json({ error: 'Текст слишком длинный.' }, { status: 413, headers: cors }); data = JSON.parse(body) } catch { return Response.json({ error: 'Неверный запрос.' }, { status: 400, headers: cors }) }
    if (!data || typeof data !== 'object' || !Object.hasOwn(tasks, data.task) || typeof data.text !== 'string' || data.text.length < 2 || data.text.length > 6000) return Response.json({ error: 'Неверные данные.' }, { status: 400, headers: cors })
    try {
      const result = await env.AI.run('@cf/qwen/qwen3.8-27b', { messages: [{ role: 'system', content: tasks[data.task] }, { role: 'user', content: data.text }], max_tokens: 250, temperature: 0.3, chat_template_kwargs: { enable_thinking: false } })
      const answer = (result.response || result.choices?.[0]?.message?.content || '').trim()
      if (!answer) throw new Error('empty response')
      return Response.json({ answer }, { headers: cors })
    } catch {
      return Response.json({ error: 'ИИ временно недоступен. Попробуй позже.' }, { status: 503, headers: cors })
    }
  },
}
