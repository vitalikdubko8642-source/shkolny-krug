import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Sheet from '../components/Sheet.jsx'
import { hasPersonalData } from '../logic/personal.js'
import { MAF_PLACE, MEET_PLACES } from '../data/demo.js'

const API = import.meta.env.VITE_JURY_API || 'https://shkolny-krug-jury-demo.okla-school-8642.workers.dev'
const KEY = 'shkolny-krug-jury-session-v1'
const getSession = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) } catch { return null } }
const saveSession = (session) => { try { sessionStorage.setItem(KEY, JSON.stringify(session)) } catch { /* usable until tab closes */ } }
const clearSession = () => { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } }

async function call(action, payload) {
  let response
  try { response = await fetch(`${API}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' }) }
  catch { throw new Error('Нет связи с чатом. Проверь интернет и попробуй снова.') }
  let result
  try { result = await response.json() } catch { throw new Error('Сервер прислал непонятный ответ. Попробуй позже.') }
  if (!response.ok) { const error = new Error(result.error || 'Не удалось связаться с чатом.'); error.status = response.status; throw error }
  return result
}

export default function JuryChat({ onBack }) {
  const [session, setSession] = useState(getSession)
  const [nick, setNick] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState('join')
  const [messages, setMessages] = useState([])
  const [meetings, setMeetings] = useState({})
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [meetingError, setMeetingError] = useState('')
  const [meetingBusy, setMeetingBusy] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [connection, setConnection] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const cursor = useRef(0)
  const activeToken = useRef(session?.token || null)
  const pollVersion = useRef(0)
  const appliedPoll = useRef(0)
  const bottom = useRef(null)
  const sessionToken = session?.token

  const poll = useCallback(async () => {
    if (!sessionToken) return
    const version = ++pollVersion.current
    try {
      const data = await call('poll', { token: sessionToken, since: cursor.current })
      if (activeToken.current !== sessionToken || version < appliedPoll.current) return
      appliedPoll.current = version
      setCurrentTime(Date.now())
      setMeetings(Object.fromEntries((data.meetings || []).map((item) => [item.id, item])))
      if (data.messages.length) {
        cursor.current = Math.max(cursor.current, ...data.messages.map((m) => m.id))
        setMessages((old) => [...new Map([...old, ...data.messages].map((m) => [m.id, m])).values()].sort((a, b) => a.id - b.id))
      }
      setConnection('')
    } catch (e) { if (activeToken.current === sessionToken && version >= appliedPoll.current) setConnection(e.status === 401 ? e.message : 'Нет связи с чатом. Пытаемся подключиться снова.') }
  }, [sessionToken])

  useEffect(() => {
    if (!sessionToken) return
    cursor.current = 0
    void Promise.resolve().then(poll)
    const timer = setInterval(() => { if (document.visibilityState === 'visible') poll() }, 4000)
    const onVisible = () => { if (document.visibilityState === 'visible') poll() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [poll, sessionToken])
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages.length])

  const enter = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const result = await call(mode === 'create' ? 'create' : 'join', { nick: nick.trim(), ...(mode === 'join' ? { code: code.trim() } : {}) })
      activeToken.current = result.token; cursor.current = 0; saveSession(result); setSession(result); setMessages([]); setShowCode(mode === 'create')
    } catch (e) { setError(e.message || 'Не удалось подключиться к чату.') } finally { setBusy(false) }
  }
  const send = async (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    if (hasPersonalData(value) || /[\w.+-]+@[\w.-]+\.[a-zа-яё]{2,}/iu.test(value)) { setError('В тесте нельзя писать личные данные. Используй вымышленные примеры.'); return }
    setBusy(true); setError('')
    try { await call('send', { token: session.token, text: value }); setText(''); await poll() }
    catch (e) { setError(e.message || 'Не удалось отправить сообщение.') } finally { setBusy(false) }
  }
  const leave = () => { activeToken.current = null; pollVersion.current++; clearSession(); cursor.current = 0; setSession(null); setMessages([]); setMeetings({}); setCode(''); setError(''); setConnection(''); setShowCode(false) }
  const copy = async () => {
    try { await navigator.clipboard.writeText(session.code); setCopyStatus('Код скопирован') }
    catch { setCopyStatus('Не удалось скопировать. Выдели код вручную.') }
  }
  const createMeeting = async ({ place, startsAt, note }) => {
    setMeetingBusy(true); setMeetingError('')
    try { await call('meeting', { token: session.token, place, startsAt, note }); setMeetingOpen(false); await poll() }
    catch (e) { setMeetingError(e.message || 'Не удалось создать встречу.') } finally { setMeetingBusy(false) }
  }
  const toggleMeeting = async (meeting) => {
    setMeetingBusy(true); setError('')
    try { await call('meeting-rsvp', { token: session.token, meetingId: meeting.id, going: !meeting.mine }); await poll() }
    catch (e) { setError(e.message || 'Не удалось изменить участие.') } finally { setMeetingBusy(false) }
  }

  if (!session) return (
    <>
      <div className="topbar"><button className="icon-btn" aria-label="Назад" onClick={onBack}><Icon name="back" /></button><h1>Тестовый чат</h1></div>
      <div className="scroll jury-entry">
        <div className="jury-intro"><span className="jury-intro-icon"><Icon name="chat" /></span><h2>Проверьте переписку вместе</h2><p>Создай комнату и передай её код жюри или войди по полученному коду. Комната работает 24 часа.</p></div>
        <div className="seg jury-seg"><button className={mode === 'join' ? 'on' : ''} onClick={() => { setMode('join'); setError('') }}>Войти по коду</button><button className={mode === 'create' ? 'on' : ''} onClick={() => { setMode('create'); setError('') }}>Создать комнату</button></div>
        <form className="jury-form" onSubmit={enter}>
          <label htmlFor="jury-nick">Вымышленный ник</label>
          <input id="jury-nick" value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Например, blue_fox" autoComplete="off" autoCapitalize="off" maxLength={16} required />
          <small>3–16 латинских букв, цифр или подчёркиваний.</small>
          {mode === 'join' && <><label htmlFor="jury-code">Код комнаты</label><input id="jury-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Вставь код приглашения" autoComplete="off" autoCapitalize="off" spellCheck="false" maxLength={32} required /></>}
          <p className="jury-privacy">Только вымышленные ники и сообщения. Не указывай настоящие имена, телефоны, адреса или другие личные данные. Сообщения видны всем, у кого есть код комнаты.</p>
          {error && <p className="jury-error" role="alert">{error}</p>}
          <button className="btn" disabled={busy} type="submit">{busy ? 'Подключаемся…' : mode === 'create' ? 'Создать комнату' : 'Войти в комнату'}</button>
        </form>
      </div>
    </>
  )

  return (
    <>
      <div className="topbar"><button className="icon-btn" aria-label="Назад" onClick={onBack}><Icon name="back" /></button><div className="jury-title"><h1>Тестовый чат</h1><span>Ник: {session.nick} · комната на 24 часа</span></div><button className="jury-code-btn" onClick={() => setShowCode(!showCode)} aria-expanded={showCode}>Код</button></div>
      {showCode && <div className="jury-invite"><b>Код приглашения</b><span>Передай его только участникам проверки.</span><code>{session.code}</code><button onClick={copy}>Скопировать код</button>{copyStatus && <small role="status">{copyStatus}</small>}</div>}
      {connection && <div className="jury-connection" role="status">{connection}</div>}
      <div className="messages jury-messages">
        <div className="day">Анонимный тест · не отправляйте личные данные</div>
        {!messages.length && <p className="jury-empty">Здесь появятся настоящие сообщения участников этой комнаты.</p>}
        {messages.map((m) => {
          const meeting = m.text.startsWith('::MEET::') ? meetings[m.text.slice(8)] : null
          const isMeetingMessage = m.text.startsWith('::MEET::')
          return <div key={m.id} className={'msg-wrap' + (m.author === session.nick ? ' own' : '')}><div className="msg"><div className="from">{m.author}</div>{isMeetingMessage ? meeting && <div className="jury-meeting"><span className="jury-meeting-label"><Icon name="pin" /> ВСТРЕЧА</span><b>{meeting.place}</b><span>{new Date(meeting.startsAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>{meeting.note && <span>{meeting.note}</span>}<span>Идут: {meeting.going}</span>{meeting.startsAt <= currentTime ? <small>Встреча прошла</small> : meeting.isOwner ? <small>Ты организатор и идёшь на встречу</small> : <button className="mini-btn" disabled={meetingBusy} onClick={() => toggleMeeting(meeting)}>{meeting.mine ? 'Не пойду' : 'Я иду'}</button>}</div> : <div className="text">{m.text}</div>}<div className="meta"><span className="tm">{new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span></div></div></div>
        })}
        <div ref={bottom} />
      </div>
      {error && <p className="jury-error jury-send-error" role="alert">{error}</p>}
      <form className="composer jury-composer" onSubmit={send}><button className="icon-btn plus" type="button" aria-label="Назначить встречу" onClick={() => { setMeetingError(''); setMeetingOpen(true) }}><Icon name="plus" /></button><textarea aria-label="Сообщение" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Сообщение" rows={1} /><button className="send" type="submit" aria-label="Отправить" disabled={busy || !text.trim()}><Icon name="send" /></button></form>
      <button className="jury-leave" onClick={leave}>Выйти из комнаты</button>
      {meetingOpen && <JuryMeetingForm onClose={() => setMeetingOpen(false)} onCreate={createMeeting} busy={meetingBusy} error={meetingError} currentTime={currentTime} />}
    </>
  )
}

function JuryMeetingForm({ onClose, onCreate, busy, error, currentTime }) {
  const [place, setPlace] = useState(MAF_PLACE)
  const [note, setNote] = useState('')
  const [when, setWhen] = useState(() => { const d = new Date(Date.now() + 60 * 60 * 1000); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) })
  const startsAt = new Date(when).getTime()
  return <Sheet onClose={onClose} title="Встреча в тестовой комнате" tall>
    <p>Приглашение увидят участники этой комнаты. Это демонстрация, настоящую встречу оно не организует.</p>
    <p>Где</p><div className="chips">{MEET_PLACES.map((p) => <button key={p} className={'chip' + (place === p ? ' on' : '')} onClick={() => setPlace(p)}>{p}</button>)}</div>
    <label className="jury-meeting-date">Когда <input className="sheet-input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
    <input className="sheet-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Зачем встречаемся? Необязательно" maxLength={80} />
    <p>Только вымышленные данные. Встреча должна состояться до закрытия комнаты.</p>
    {error && <p className="err" role="alert">{error}</p>}
    <button className="btn" disabled={busy || !Number.isFinite(startsAt) || startsAt <= currentTime} onClick={() => onCreate({ place, startsAt, note })}>{busy ? 'Отправляем…' : 'Позвать на встречу'}</button>
  </Sheet>
}
