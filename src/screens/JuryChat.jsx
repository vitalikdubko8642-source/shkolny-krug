import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Sheet from '../components/Sheet.jsx'
import { hasPersonalData } from '../logic/personal.js'
import { MAF_PLACE, MEET_PLACES } from '../data/demo.js'
import Recorder from '../components/Recorder.jsx'
import { MediaPlayer } from '../components/MediaMessage.jsx'
import { getRecording, deleteRecording } from '../mediaStore.js'
import ProfileCard from '../components/ProfileCard.jsx'
import { normalizeBanner } from '../components/ProfileBanner.jsx'
import Game from './Game.jsx'

const API = import.meta.env.VITE_JURY_API || 'https://shkolny-krug-jury-demo.okla-school-8642.workers.dev'
const KEY = 'shkolny-krug-jury-session-v1'
const EMOJI = ['😀', '😄', '😂', '🙂', '😉', '😍', '😎', '🥳', '🤔', '😢', '🤝', '👍', '👏', '❤️', '💙', '✨', '🔥', '🎉', '⚽', '🎮', '🚀', '💡']
const REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢']
const REPORT_REASONS = ['Меня это задело', 'Оскорбляют кого-то', 'Спам или реклама', 'Делятся чужими личными данными', 'Другое']
const GIFTS = [
  { id: 'rocket', title: 'Ракета', price: 25 }, { id: 'gamepad', title: 'Игровой пульт', price: 35 }, { id: 'headphones', title: 'Наушники', price: 30 },
  { id: 'basketball', title: 'Золотой мяч', price: 40 }, { id: 'star', title: 'Звезда', price: 15 }, { id: 'planet', title: 'Планета', price: 45 },
]
const BUBBLES = [{ id: 'default', title: 'Обычный', price: 0 }, { id: 'frost', title: 'Мишка', price: 20 }, { id: 'aurora', title: 'Кот', price: 30 }, { id: 'sunset', title: 'Лягушка', price: 25 }]
const bubbleArt = id => id && id !== 'default' ? { '--bubble-art': `url("${import.meta.env.BASE_URL}profile-bubbles/${id}.webp")` } : undefined
const getSession = () => { try { return JSON.parse(localStorage.getItem('shkolny-krug-jury-profile-v1') || sessionStorage.getItem(KEY)) } catch { return null } }
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

export default function JuryChat({ onBack, onSave, profile, onWalletChange, onArchive, archived }) {
  const [session, setSession] = useState(getSession)
  const [nick, setNick] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState('join')
  const [messages, setMessages] = useState([])
  const [meetings, setMeetings] = useState({})
  const [attachments, setAttachments] = useState({})
  const [reactions, setReactions] = useState([])
  const [styles, setStyles] = useState({})
  const [menu, setMenu] = useState(null)
  const [report, setReport] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [editing, setEditing] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [person, setPerson] = useState(null)
  const [personBusy, setPersonBusy] = useState(false)
  const [chatInfo, setChatInfo] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)
  const [bubbleOpen, setBubbleOpen] = useState(false)
  const [giftAnon, setGiftAnon] = useState(false)
  const [giftBusy, setGiftBusy] = useState(false)
  const [giftError, setGiftError] = useState('')
  const [game, setGame] = useState(null)
  const [hidden, setHidden] = useState(() => { try { return JSON.parse(localStorage.getItem('jury-hidden-' + (getSession()?.nick || 'none')) || '[]') } catch { return [] } })
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [attachmentConsent, setAttachmentConsent] = useState(false)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [meetingError, setMeetingError] = useState('')
  const [meetingBusy, setMeetingBusy] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [connection, setConnection] = useState('')
  const [profileError, setProfileError] = useState('')
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
      const data = await call('poll', { token: sessionToken, since: 0 })
      if (activeToken.current !== sessionToken || version < appliedPoll.current) return
      appliedPoll.current = version
      setCurrentTime(Date.now())
      setMeetings(Object.fromEntries((data.meetings || []).map((item) => [item.id, item])))
      setAttachments(Object.fromEntries((data.attachments || []).map((item) => [item.id, item])))
      setReactions(data.reactions || [])
      setStyles(Object.fromEntries((data.styles || []).map(item => [item.nick, item.bubble])))
      setMessages(data.messages)
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
  useEffect(() => {
    if (!sessionToken || !profile?.jury) return
    call('profile-set', { token: sessionToken, banner: normalizeBanner(profile.banner), avatar: profile.avatarImage || null, status: profile.status || '', bio: profile.bio || '' }).then(() => setProfileError('')).catch(e => setProfileError('Не удалось обновить профиль: ' + e.message))
  }, [sessionToken, profile?.jury, profile?.banner, profile?.avatarImage, profile?.status, profile?.bio])

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
    try { if (editing) await call('message-edit', { token: session.token, id: editing.id, text: value }); else await call('send', { token: session.token, text: value, ...(replyTo ? { replyId: replyTo.id } : {}) }); setText(''); setEditing(null); setReplyTo(null); setEmojiOpen(false); await poll() }
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
  const sendAttachment = async () => {
    if (!attachmentFile || !attachmentConsent) return
    if (attachmentFile.size > 1024 * 1024 || !attachmentFile.size) { setError('Файл должен быть размером до 1 МБ.'); return }
    setBusy(true); setError('')
    try {
      const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Не удалось прочитать файл.')); reader.readAsDataURL(attachmentFile) })
      await call('attachment', { token: session.token, name: attachmentFile.name, mime: attachmentFile.type, data: dataUrl.split(',')[1] })
      setAttachmentOpen(false); setAttachmentFile(null); setAttachmentConsent(false); await poll()
    } catch (e) { setError(e.message || 'Не удалось отправить файл.') } finally { setBusy(false) }
  }
  const sendRecording = async (media) => {
    try {
      const blob = await getRecording(media.id)
      if (!blob || blob.size > 1024 * 1024) throw new Error('Для чата жюри запись должна быть меньше 1 МБ. Попробуй короче.')
      const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Не удалось прочитать запись.')); reader.readAsDataURL(blob) })
      const mime = blob.type.split(';')[0].toLowerCase()
      await call('attachment', { token: session.token, name: `${media.kind === 'audio' ? 'voice' : 'circle'}_${media.duration}.${mime.endsWith('mp4') ? 'mp4' : 'webm'}`, mime, data: dataUrl.slice(dataUrl.indexOf('base64,') + 7) })
      await poll()
      return true
    } catch (e) { setError(e.message || 'Не удалось отправить запись.'); return false }
    finally { try { await deleteRecording(media.id) } catch { /* best effort */ } }
  }
  const toggleMeeting = async (meeting) => {
    setMeetingBusy(true); setError('')
    try { await call('meeting-rsvp', { token: session.token, meetingId: meeting.id, going: !meeting.mine }); await poll() }
    catch (e) { setError(e.message || 'Не удалось изменить участие.') } finally { setMeetingBusy(false) }
  }
  const react = async (reaction) => {
    const previous = reactions.find(r => r.messageId === menu.id && r.mine)
    setBusy(true); setError('')
    try { await call('message-react', { token: session.token, id: menu.id, reaction: previous?.reaction === reaction ? null : reaction }); setMenu(null); await poll() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const deleteMessage = async () => {
    setBusy(true); setError('')
    try { await call('message-delete', { token: session.token, id: menu.id }); setMenu(null); await poll() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const hideMessage = () => {
    const next = [...new Set([...hidden, menu.id])]
    setHidden(next); try { localStorage.setItem('jury-hidden-' + session.nick, JSON.stringify(next)) } catch { /* hidden until reload */ }
    setMenu(null)
  }
  const sendReport = async () => {
    if (!report || !reportReason) return
    setBusy(true); setError('')
    try { await call('report', { token: session.token, id: report.id, reason: reportReason, details: reportReason === 'Другое' ? reportDetails : '' }); setReport(null); setReportReason(''); setReportDetails(''); setError('Жалоба отправлена человеку на рассмотрение.') }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const openPerson = async (nick) => {
    setPersonBusy(true); setPerson({ nick }); setError(''); setGiftOpen(false); setBubbleOpen(false); setGiftError('')
    try { const loaded = await call('profile-get', { token: session.token, nick }); setPerson(current => current?.nick === nick ? loaded : current); onWalletChange?.(loaded.viewerCoins) }
    catch (e) { setPerson(null); setError(e.message) } finally { setPersonBusy(false) }
  }
  const sendGift = async (gift) => {
    setGiftBusy(true); setGiftError('')
    try { const nick = person.nick; await call('gift-send', { token: session.token, nick, type: gift.id, anonymous: giftAnon }); const loaded = await call('profile-get', { token: session.token, nick }); setPerson(current => current?.nick === nick ? loaded : current); onWalletChange?.(loaded.viewerCoins); setGiftOpen(false); setGiftAnon(false) }
    catch (e) { setGiftError(e.message) } finally { setGiftBusy(false) }
  }
  const toggleGift = async (gift) => {
    setGiftBusy(true); setGiftError('')
    try { const nick = person.nick; await call('gift-visibility', { token: session.token, id: gift.id, hidden: !gift.hidden }); const loaded = await call('profile-get', { token: session.token, nick }); setPerson(current => current?.nick === nick ? loaded : current) }
    catch (e) { setGiftError(e.message) } finally { setGiftBusy(false) }
  }
  const selectBubble = async (bubble) => {
    setGiftBusy(true); setGiftError('')
    try {
      if (bubble.id !== 'default' && !person.ownedBubbles.includes(bubble.id)) await call('bubble-buy', { token: session.token, bubble: bubble.id })
      await call('bubble-equip', { token: session.token, bubble: bubble.id })
      const loaded = await call('profile-get', { token: session.token, nick: session.nick })
      setPerson(current => current?.nick === session.nick ? loaded : current); onWalletChange?.(loaded.viewerCoins); await poll()
    } catch (e) { setGiftError(e.message) } finally { setGiftBusy(false) }
  }
  const finishGame = async (result) => {
    const roundId = game.id; setGame(null); setError('')
    try { const reward = await call('game-reward', { token: session.token, roundId, coins: result.coins }); onWalletChange?.(reward.coins); setError(reward.awarded ? `Начислено монет: ${reward.awarded}` : 'За этот раунд монеты не начислены.') }
    catch (e) { setError('Не удалось начислить монеты: ' + e.message) }
  }

  if (game) return <Game mode={game.mode} title={game.mode === 'sequence' ? 'Продолжи ряд' : 'Быстрый счёт'} chatTitle="9В — наш класс" players={['pixel_cat', 'sova_tima']} user={{ ...profile, nick: session.nick }} onExit={() => setGame(null)} onFinish={finishGame} />

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
      <div className="topbar"><button className="icon-btn" aria-label="Назад" onClick={onBack}><Icon name="back" /></button><div className="jury-title"><h1>{session.jury ? '9В — наш класс' : 'Тестовый чат'}</h1><span>{session.jury ? 'Демонстрационный чат жюри' : `Ник: ${session.nick} · комната на 24 часа`}</span></div>{session.jury ? <><button className="icon-btn" aria-label="Мой профиль в чате" onClick={() => openPerson(session.nick)}><Icon name="user" /></button><button className="icon-btn" aria-label="О чате" onClick={() => setChatInfo(true)}><Icon name="more" /></button></> : <button className="jury-code-btn" onClick={() => setShowCode(!showCode)} aria-expanded={showCode}>Код</button>}</div>
      {showCode && <div className="jury-invite"><b>Код приглашения</b><span>Передай его только участникам проверки.</span><code>{session.code}</code><button onClick={copy}>Скопировать код</button>{copyStatus && <small role="status">{copyStatus}</small>}</div>}
      {connection && <div className="jury-connection" role="status">{connection}</div>}
      {profileError && <div className="jury-connection" role="status">{profileError}</div>}
      <div className="messages jury-messages">
        <div className="day">Анонимный тест · не отправляйте личные данные</div>
        {!messages.length && <p className="jury-empty">Здесь появятся настоящие сообщения участников этой комнаты.</p>}
        {messages.filter((m) => !hidden.includes(m.id)).map((m) => {
          const meeting = m.text.startsWith('::MEET::') ? meetings[m.text.slice(8)] : null
          const isMeetingMessage = m.text.startsWith('::MEET::')
          const isFile = m.text.startsWith('::FILE::')
          const file = isFile ? attachments[m.text.slice(8)] : null
          const original = messages.find(item => item.id === m.replyId)
          return <div key={m.id} className={'msg-wrap' + (m.author === session.nick ? ' own' : '')}><div className={'msg jury-message jury-bubble-' + (styles[m.author] || 'default')} style={bubbleArt(styles[m.author])} role="button" tabIndex={0} onClick={() => setMenu(m)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setMenu(m) } }}><button className="from jury-author" onClick={e => { e.stopPropagation(); openPerson(m.author) }}>{m.author}</button>{m.replyId && <div className="quote"><b>{original?.author || 'Сообщение'}</b><span>{original?.text || 'Сообщение удалено'}</span></div>}{isMeetingMessage ? meeting && <div className="jury-meeting"><span className="jury-meeting-label"><Icon name="pin" /> ВСТРЕЧА</span><b>{meeting.place}</b><span>{new Date(meeting.startsAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>{meeting.note && <span>{meeting.note}</span>}<span>Идут: {meeting.going}</span>{meeting.startsAt <= currentTime ? <small>Встреча прошла</small> : meeting.isOwner ? <small>Ты организатор и идёшь на встречу</small> : <button className="mini-btn" disabled={meetingBusy} onClick={(e) => { e.stopPropagation(); toggleMeeting(meeting) }}>{meeting.mine ? 'Не пойду' : 'Я иду'}</button>}</div> : isFile ? file && <JuryFileMessage file={file} token={session.token} /> : <div className="text">{m.text}</div>}{reactions.filter(r => r.messageId === m.id).length > 0 && <div className="reacts">{reactions.filter(r => r.messageId === m.id).map(r => <span className={'react' + (r.mine ? ' mine' : '')} key={r.reaction}>{r.reaction} {r.count}</span>)}</div>}<div className="meta"><span className="tm">{m.edited ? 'изменено ' : ''}{new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span></div></div></div>
        })}
        <div ref={bottom} />
      </div>
      {error && <p className="jury-error jury-send-error" role="alert">{error}</p>}
      {(replyTo || editing) && <div className="compose-bar"><Icon name={editing ? 'edit' : 'reply'} /><div className="cb-body"><b>{editing ? 'Редактирование' : `Ответ ${replyTo.author}`}</b><span>{(editing || replyTo).text}</span></div><button className="icon-btn" aria-label="Отменить ответ или изменение" onClick={() => { setEditing(null); setReplyTo(null); setText('') }}><Icon name="x" /></button></div>}
      {emojiOpen && <div className="emoji-picker jury-emoji-picker" role="region" aria-label="Выбор эмодзи"><div className="emoji-grid">{EMOJI.map(e => <button key={e} onClick={() => setText(value => value + e)} aria-label={`Добавить ${e}`}>{e}</button>)}</div></div>}
      <form className="composer jury-composer" onSubmit={send}><button className="icon-btn plus" type="button" aria-label="Добавить" onClick={() => setAttachmentOpen(true)}><Icon name="plus" /></button><button className="icon-btn" type="button" aria-label="Эмодзи" onClick={() => setEmojiOpen(!emojiOpen)}><Icon name="smile" /></button><textarea aria-label="Сообщение" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Сообщение" rows={1} />{text.trim() || editing ? <button className="send" type="submit" aria-label={editing ? 'Сохранить' : 'Отправить'} disabled={busy || !text.trim()}><Icon name={editing ? 'check' : 'send'} /></button> : <Recorder onSend={sendRecording} toast={setError} onActive={(active) => { if (active) setEmojiOpen(false) }} />}</form>
      {!session.jury && <button className="jury-leave" onClick={leave}>Выйти из комнаты</button>}
      {meetingOpen && <JuryMeetingForm onClose={() => setMeetingOpen(false)} onCreate={createMeeting} busy={meetingBusy} error={meetingError} currentTime={currentTime} />}
      {attachmentOpen && <Sheet title="Добавить" onClose={() => { setAttachmentOpen(false); setError('') }}><button className="btn ghost" onClick={() => { setAttachmentOpen(false); setMeetingError(''); setMeetingOpen(true) }}>Назначить встречу</button><button className="btn ghost" onClick={() => { setAttachmentOpen(false); setGame({ id: crypto.randomUUID(), mode: 'math' }) }}>Мини-игра «Быстрый счёт»</button><button className="btn ghost" onClick={() => { setAttachmentOpen(false); setGame({ id: crypto.randomUUID(), mode: 'sequence' }) }}>Мини-игра «Продолжи ряд»</button><p>Игры пока индивидуальные; соперники в них вымышлены.</p><label className="jury-file-pick">{attachmentFile ? attachmentFile.name : 'Выбрать файл'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf,text/plain,application/zip,.docx,.pptx,.xlsx" onChange={e => { setAttachmentFile(e.target.files?.[0] || null); setError('') }} /></label><p>Изображения, видео и документы до 1 МБ. В тест загружай только вымышленные материалы без настоящих имён, телефонов и изображений людей.</p><label className="check"><input type="checkbox" checked={attachmentConsent} onChange={e => setAttachmentConsent(e.target.checked)} />Файл не содержит личных данных</label>{error && <p className="jury-error" role="alert">{error}</p>}<button className="btn" disabled={!attachmentFile || !attachmentConsent || busy} onClick={sendAttachment}>{busy ? 'Отправляем…' : 'Отправить файл'}</button></Sheet>}
      {menu && <Sheet title="Сообщение" onClose={() => setMenu(null)}><div className="react-row">{REACTIONS.map(r => <button key={r} aria-label={`Реакция ${r}`} onClick={() => react(r)} disabled={busy}>{r}</button>)}</div><div className="menu-list"><button className="menu-item" onClick={() => { setReplyTo(menu); setEditing(null); setMenu(null) }}><Icon name="reply" />Ответить</button>{!menu.text.startsWith('::') && <button className="menu-item" onClick={() => { navigator.clipboard?.writeText(menu.text); setMenu(null) }}><Icon name="copy" />Скопировать</button>}{!menu.text.startsWith('::') && onSave && <button className="menu-item" onClick={() => { onSave(menu); setMenu(null) }}><Icon name="copy" />Сохранить в избранном</button>}{menu.author === session.nick && !menu.text.startsWith('::') && <><button className="menu-item" onClick={() => { setEditing(menu); setReplyTo(null); setText(menu.text); setMenu(null) }}><Icon name="edit" />Изменить</button><button className="menu-item danger" onClick={deleteMessage} disabled={busy}><Icon name="trash" />Удалить</button></>}<button className="menu-item" onClick={hideMessage}><Icon name="eyeoff" />Скрыть у себя</button>{menu.author !== session.nick && !menu.text.startsWith('::') && <button className="menu-item danger" onClick={() => { setReport(menu); setMenu(null); setReportReason(''); setReportDetails('') }}><Icon name="flag" />Пожаловаться</button>}</div></Sheet>}
      {report && <Sheet title="Пожаловаться" onClose={() => setReport(null)}><p>Модератор увидит это сообщение, причину и твой вымышленный ник. Решение принимает человек.</p>{REPORT_REASONS.map(reason => <button className={'opt' + (reportReason === reason ? ' on' : '')} key={reason} onClick={() => setReportReason(reason)}>{reason}</button>)}{reportReason === 'Другое' && <textarea className="sheet-input" value={reportDetails} onChange={e => setReportDetails(e.target.value)} maxLength={300} placeholder="Что случилось?" />}{error && <p className="jury-error" role="alert">{error}</p>}<button className="btn" disabled={busy || !reportReason || (reportReason === 'Другое' && !reportDetails.trim())} onClick={sendReport}>Отправить жалобу</button></Sheet>}
      {chatInfo && <Sheet title="О чате" onClose={() => setChatInfo(false)}><p>Общий учебный чат участников демонстрации. Сообщения видны участникам этой комнаты.</p><button className="btn ghost" onClick={() => { setChatInfo(false); onArchive?.() }}>{archived ? 'Вернуть из архива' : 'Убрать в архив'}</button></Sheet>}
      {person && <Sheet title={bubbleOpen ? 'Оформление сообщений' : giftOpen ? 'Выбрать подарок' : 'Профиль'} onClose={() => { setPerson(null); setGiftOpen(false); setBubbleOpen(false) }} tall><button className="jury-profile-close" aria-label="Закрыть профиль" onClick={() => { setPerson(null); setGiftOpen(false); setBubbleOpen(false) }}><Icon name="x" /></button>{personBusy ? <p>Загружаем профиль…</p> : bubbleOpen ? <><p>Выбранный стиль увидят участники чата. Баланс: <b>{person.viewerCoins} монет</b>.</p><div className="bubble-grid">{BUBBLES.map(bubble => { const owned = bubble.id === 'default' || person.ownedBubbles.includes(bubble.id); return <button key={bubble.id} className="bubble-option" disabled={giftBusy || (!owned && person.viewerCoins < bubble.price)} onClick={() => selectBubble(bubble)}><span className={'bubble-sample jury-bubble-' + bubble.id} style={bubbleArt(bubble.id)}>Привет!</span><b>{bubble.title}</b><small>{person.bubble === bubble.id ? 'Выбрано' : owned ? 'Надеть' : `${bubble.price} монет`}</small></button> })}</div><button className="btn ghost" onClick={() => setBubbleOpen(false)}>Назад к профилю</button></> : giftOpen ? <><p>Твой баланс: <b>{person.viewerCoins} монет</b>. Монеты в этой комнате демонстрационные.</p><div className="gift-grid">{GIFTS.map((gift, i) => <button className="gift-option" key={gift.id} disabled={giftBusy || person.viewerCoins < gift.price} onClick={() => sendGift(gift)}><GiftArt index={i} /><b>{gift.title}</b><span>{gift.price} монет</span></button>)}</div><label className="check"><input type="checkbox" checked={giftAnon} onChange={e => setGiftAnon(e.target.checked)} />Скрыть моё имя от других</label><p className="sheet-note">Получатель увидит, кто отправил подарок.</p><button className="btn ghost" onClick={() => setGiftOpen(false)}>Назад к профилю</button></> : <><ProfileCard user={person} settings={{ showClass: true, showInterests: false, showOnline: false }} />{person.own ? <><p>Твой баланс: <b>{person.viewerCoins} монет</b></p><button className="btn ghost" onClick={() => setBubbleOpen(true)}>Оформление сообщений</button></> : <button className="btn" onClick={() => setGiftOpen(true)}>Подарить подарок</button>}<p className="group-title">Подарки</p>{!person.gifts?.length ? <p>Здесь пока нет подарков.</p> : <div className="gift-grid">{person.gifts.map(gift => { const index = GIFTS.findIndex(item => item.id === gift.type), definition = GIFTS[index]; return <div className="gift-option gift-received" key={gift.id}><GiftArt index={index} /><b>{definition?.title || 'Подарок'}</b><span>{gift.sender ? `От ${gift.sender}` : 'Анонимно'}{gift.hidden && ' · скрыт'}</span>{person.own && <button className="mini-btn" disabled={giftBusy} onClick={() => toggleGift(gift)}>{gift.hidden ? 'Показать' : 'Скрыть'}</button>}</div> })}</div>}<p className="sheet-note">Это вымышленный профиль участника демонстрации. В начале каждому даётся 50 монет; награды учебных игр начисляются в демонстрационный баланс.</p></>}{giftError && <p className="jury-error" role="alert">{giftError}</p>}</Sheet>}
    </>
  )
}

function GiftArt({ index }) {
  const x = (index % 3) * 50, y = Math.floor(index / 3) * 100
  return <span className="gift-art" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}profile-banners/gift-collection.webp)`, backgroundPosition: `${x}% ${y}%` }} aria-hidden="true" />
}

function JuryFileMessage({ file, token }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const recording = /^(voice|circle)_(\d+)\.(webm|mp4)$/.exec(file.name)
  const recordingKind = recording?.[1] === 'voice' ? 'audio' : 'video'
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  const open = async () => {
    if (url) return
    setBusy(true); setError('')
    try {
      const data = await call('attachment-get', { token, id: file.id })
      const binary = atob(data.data), bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
      setUrl(URL.createObjectURL(new Blob([bytes], { type: data.mime })))
    } catch (e) { setError(e.message || 'Не удалось загрузить файл.') } finally { setBusy(false) }
  }
  return <div className="jury-file" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>{!recording && <><b>{file.name}</b><small>{Math.ceil(file.size / 1024)} КБ</small></>}{!url ? <button className="mini-btn" onClick={open} disabled={busy}>{busy ? 'Загружаем…' : recording ? (recordingKind === 'audio' ? 'Загрузить голосовое' : 'Загрузить видеосообщение') : 'Открыть файл'}</button> : recording ? <MediaPlayer kind={recordingKind} url={url} duration={Number(recording[2])} /> : <>{file.mime.startsWith('image/') && <img src={url} alt={file.name} />}{file.mime.startsWith('video/') && <video src={url} controls playsInline preload="metadata" />}<a href={url} download={file.name}>Скачать</a></>}{error && <small role="alert">{error}</small>}</div>
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
