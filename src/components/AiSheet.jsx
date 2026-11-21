import { useRef, useState } from 'react'
import Sheet from './Sheet.jsx'

const ENDPOINT = 'https://shkolny-krug-ai.okla-school-8642.workers.dev'

export default function AiSheet({ task, title, text, onClose, onDecision }) {
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const aborter = useRef(null)
  const close = () => { aborter.current?.abort(); onClose() }
  const run = async () => {
    setBusy(true); setError(''); setAnswer('')
    if (task === 'alert') onDecision?.(null)
    const controller = new AbortController()
    aborter.current = controller
    let timedOut = false
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 45000)
    try {
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, text: text.slice(0, 6000) }), signal: controller.signal })
      const data = await response.json()
      if (!response.ok || !data.answer) throw new Error(data.error || 'Не удалось получить ответ')
      setAnswer(data.answer)
      if (task === 'alert' && ['allow', 'reject', 'urgent'].includes(data.decision)) onDecision?.(data.decision)
    } catch (e) { if (timedOut) setError('ИИ отвечает слишком долго. Попробуй позже.'); else if (e.name !== 'AbortError') setError('ИИ недоступен. Проверь соединение и попробуй позже.') }
    finally { clearTimeout(timeout); if (!controller.signal.aborted || timedOut) setBusy(false) }
  }
  return <Sheet title={title} onClose={close} tall>
    <p>Это демонстрация: используй только вымышленные сообщения. После подтверждения показанный текст отправится в Cloudflare для обработки ИИ. Пароли, настоящие имена, телефоны и адреса отправлять нельзя.</p>
    <textarea className="sheet-input" rows={6} value={text.slice(0, 6000)} readOnly aria-label="Текст для отправки в ИИ" />
    <label className="check"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> Текст вымышленный и не содержит личных данных</label>
    {error && <p className="err">{error}</p>}
    {answer && <div className="ai-box"><b>Ответ ИИ</b><span style={{ whiteSpace: 'pre-wrap' }}>{answer}</span><small>ИИ может ошибаться. Результат никуда не отправлен и не заменяет решение человека.</small></div>}
    <button className="btn" disabled={!agreed || busy || !text.trim()} onClick={run}>{busy ? 'Обрабатываю…' : answer ? 'Попробовать ещё раз' : 'Отправить в ИИ'}</button>
    <button className="btn ghost" onClick={close}>{answer ? 'Готово' : 'Закрыть'}</button>
  </Sheet>
}
