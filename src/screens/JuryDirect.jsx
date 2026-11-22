import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Sheet from '../components/Sheet.jsx'
import Recorder from '../components/Recorder.jsx'
import JuryAttachment from '../components/JuryAttachment.jsx'
import { getRecording, deleteRecording } from '../mediaStore.js'

const EMOJI = ['😀', '😄', '😂', '🙂', '😉', '😍', '😎', '🥳', '🤔', '😢', '🤝', '👍', '👏', '❤️', '💙', '✨', '🔥', '🎉', '⚽', '🎮', '🚀']
const REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢']
const REASONS = ['Меня это задело', 'Оскорбляют кого-то', 'Спам или реклама', 'Делятся чужими личными данными', 'Другое']
const bubbleArt = id => id && id !== 'default' ? { '--bubble-art': `url("${import.meta.env.BASE_URL}profile-bubbles/${id}.webp")` } : undefined

export default function JuryDirect({ call, session, onSave, initialId, initialSettings, onBack }) {
  const [conversations, setConversations] = useState([])
  const [people, setPeople] = useState([])
  const [selected, setSelected] = useState(initialId || null)
  const [messages, setMessages] = useState([])
  const [attachments, setAttachments] = useState({})
  const [styles, setStyles] = useState({})
  const [reactions, setReactions] = useState([])
  const [menu, setMenu] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const [report, setReport] = useState(null)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [hidden, setHidden] = useState(() => { try { return JSON.parse(localStorage.getItem('jury-dm-hidden-' + session.nick) || '[]') } catch { return [] } })
  const [settings, setSettings] = useState(null)
  const [page, setPage] = useState('list')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [fileOpen, setFileOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [fileConsent, setFileConsent] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const token = session.token
  const refresh = useCallback(async () => {
    try {
      const list = await call('dm-list', { token })
      setConversations(list.conversations)
      const active = list.conversations.find(c => c.id === selected)
      if (active?.status === 'accepted') {
        const thread = await call('dm-poll', { token, id: selected })
        setMessages(thread.messages); setBlocked(thread.blocked)
        setAttachments(Object.fromEntries((thread.attachments || []).map(item => [item.id, item])))
        setStyles(Object.fromEntries((thread.styles || []).map(item => [item.nick, item.bubble])))
        setReactions(thread.reactions || [])
      }
    } catch (e) { setError(e.message || 'Не удалось обновить переписку.') }
  }, [call, token, selected])
  useEffect(() => { void Promise.resolve().then(refresh); const timer = setInterval(refresh, 5000); return () => clearInterval(timer) }, [refresh])
  useEffect(() => { if (page !== 'people') return; call('dm-people', { token }).then(result => setPeople(result.people)).catch(e => setError(e.message)) }, [call, token, page])
  useEffect(() => { if (!initialSettings) return; call('dm-settings', { token }).then(value => { setSettings(value); setPage('settings') }).catch(e => setError(e.message)) }, [call, token, initialSettings])
  const active = conversations.find(c => c.id === selected)
  const action = async (name, data, after) => {
    setBusy(true); setError('')
    try { const result = await call(name, { token, ...data }); await refresh(); after?.(result) }
    catch (e) { setError(e.message || 'Не удалось выполнить действие.') } finally { setBusy(false) }
  }
  const start = nick => action('dm-request', { nick }, result => { setSelected(result.id); setPage('list') })
  const chooseSettings = async () => {
    setBusy(true); setError('')
    try { setSettings(await call('dm-settings', { token })); setPage('settings') }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const updateSettings = value => action('dm-settings', value, result => setSettings(result))
  const send = e => {
    e.preventDefault(); const value = text.trim(); if (!value || !active) return
    if (editing) action('dm-message-edit', { id: active.id, messageId: editing.id, text: value }, () => { setText(''); setEditing(null) })
    else action('dm-send', { id: active.id, text: value, ...(replyTo ? { replyId: replyTo.id } : {}) }, () => { setText(''); setReplyTo(null) })
  }
  const react = reaction => {
    const previous = reactions.find(r => r.messageId === menu.id && r.mine)
    action('dm-message-react', { id: active.id, messageId: menu.id, reaction: previous?.reaction === reaction ? null : reaction }, () => setMenu(null))
  }
  const sendReport = () => action('dm-report', { id: active.id, messageId: report.id, reason, details: reason === 'Другое' ? details : '' }, () => { setReport(null); setReason(''); setDetails(''); setError('Жалоба отправлена человеку на рассмотрение.') })
  const upload = async (blob, name) => {
    if (!active || !blob || !blob.size || blob.size > 1024 * 1024) throw new Error('Файл или запись должны быть размером до 1 МБ.')
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Не удалось прочитать файл.')); reader.readAsDataURL(blob) })
    await call('dm-attachment', { token, id: active.id, name, mime: blob.type.split(';')[0].toLowerCase(), data: dataUrl.slice(dataUrl.indexOf('base64,') + 7) })
    await refresh()
  }
  const sendFile = async () => {
    if (!file || !fileConsent) return
    setBusy(true); setError('')
    try { await upload(file, file.name); setFileOpen(false); setFile(null); setFileConsent(false) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const sendRecording = async media => {
    try { const blob = await getRecording(media.id); const mime = blob?.type.split(';')[0] || ''; await upload(blob, `${media.kind === 'audio' ? 'voice' : 'circle'}_${media.duration}.${mime.endsWith('mp4') ? 'mp4' : 'webm'}`); return true }
    catch (e) { setError(e.message); return false } finally { try { await deleteRecording(media.id) } catch { /* best effort */ } }
  }
  const back = () => { if (initialSettings && page === 'settings') onBack(); else if (page !== 'list') setPage('list'); else if (selected) { setSelected(null); setMessages([]) } else onBack() }
  return <>
    <div className="topbar"><button className="icon-btn" onClick={back} aria-label="Назад"><Icon name="back" /></button><h1>{page === 'settings' ? 'Кто может писать' : page === 'people' ? 'Новое сообщение' : selected && active ? active.nick : 'Личные сообщения'}</h1>{page === 'list' && !selected && <button className="icon-btn" onClick={chooseSettings} aria-label="Настройки личных сообщений"><Icon name="lock" /></button>}</div>
    {error && <div className="jury-connection" role="alert">{error}</div>}
    {page === 'settings' && settings ? <div className="scroll direct-settings"><p>Кто может начать новую переписку</p>{[['all', 'Все участники'], ['class', 'Только мой класс'], ['nobody', 'Никто']].map(([id, title]) => <button className="direct-row" key={id} disabled={busy} onClick={() => updateSettings({ ...settings, allowed: id })}><span>{title}</span><span>{settings.allowed === id ? '✓' : ''}</span></button>)}<button className="direct-row" disabled={busy} onClick={() => updateSettings({ ...settings, approval: !settings.approval })}><span>Сначала спрашивать разрешение<small>Если выключить, разрешённые участники смогут написать сразу.</small></span><span>{settings.approval ? 'Вкл.' : 'Выкл.'}</span></button><p>В демонстрационной комнате все участники относятся к 9В.</p></div>
      : page === 'people' ? <div className="scroll direct-list"><p>Выбери участника комнаты</p>{people.map(person => <button className="direct-row" disabled={busy} key={person.nick} onClick={() => start(person.nick)}><span>{person.nick}</span><Icon name="chevron" /></button>)}{!people.length && <div className="empty">Других участников пока нет.</div>}</div>
      : selected && active ? active.status === 'pending' ? <div className="scroll direct-list"><div className="empty"><Icon name="mail" /><b>{active.incoming ? `${active.nick} хочет написать` : `Запрос отправлен ${active.nick}`}</b><span>{active.incoming ? 'Ты решаешь, начинать ли переписку.' : 'Сообщения станут доступны после согласия.'}</span>{active.incoming && <><button className="btn" disabled={busy} onClick={() => action('dm-respond', { id: active.id, accept: true })}>Принять</button><button className="btn ghost" disabled={busy} onClick={() => action('dm-respond', { id: active.id, accept: false }, () => setSelected(null))}>Отклонить</button></>}</div></div>
        : <><div className="direct-block"><button onClick={() => action('dm-block', { nick: active.nick, blocked: !blocked }, () => setBlocked(!blocked))}>{blocked ? 'Разблокировать' : 'Заблокировать'}</button></div><div className="messages jury-messages">{!messages.length && <p className="jury-empty">Здесь появятся ваши личные сообщения.</p>}{messages.filter(m => !hidden.includes(m.id)).map(m => { const isFile = m.text.startsWith('::FILE::'), item = isFile ? attachments[m.text.slice(8)] : null, original = messages.find(x => x.id === m.replyId); return <div key={m.id} className={'msg-wrap' + (m.own ? ' own' : '')}><div className={'msg jury-message jury-bubble-' + (styles[m.author] || 'default')} style={bubbleArt(styles[m.author])} role="button" tabIndex={0} onClick={() => setMenu(m)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setMenu(m) } }}>{m.replyId && <div className="quote"><b>{original?.author || 'Сообщение'}</b><span>{original?.text || 'Сообщение удалено'}</span></div>}{isFile && <button className="media-menu" aria-label="Действия с вложением" onClick={e => { e.stopPropagation(); setMenu(m) }}><Icon name="more" /></button>}{isFile ? item && <JuryAttachment file={item} token={token} call={call} conversationId={active.id} /> : <div className="text">{m.text}</div>}{reactions.filter(r => r.messageId === m.id).length > 0 && <div className="reacts">{reactions.filter(r => r.messageId === m.id).map(r => <span key={r.reaction} className={'react' + (r.mine ? ' mine' : '')}>{r.reaction} {r.count}</span>)}</div>}<div className="meta"><span className="tm">{m.edited ? 'изменено ' : ''}{new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span></div></div></div> })}</div>{(replyTo || editing) && <div className="compose-bar"><Icon name={editing ? 'edit' : 'reply'} /><div className="cb-body"><b>{editing ? 'Редактирование' : `Ответ ${replyTo.author}`}</b><span>{(editing || replyTo).text}</span></div><button className="icon-btn" aria-label="Отменить ответ или изменение" onClick={() => { setEditing(null); setReplyTo(null); setText('') }}><Icon name="x" /></button></div>}{emojiOpen && <div className="emoji-picker jury-emoji-picker" role="region" aria-label="Выбор эмодзи"><div className="emoji-grid">{EMOJI.map(e => <button key={e} onClick={() => setText(value => value + e)} aria-label={`Добавить ${e}`}>{e}</button>)}</div></div>}<form className="composer" onSubmit={send}><button className="icon-btn plus" type="button" disabled={blocked} aria-label="Прикрепить файл" onClick={() => setFileOpen(true)}><Icon name="plus" /></button><button className="icon-btn" type="button" aria-label="Эмодзи" onClick={() => setEmojiOpen(!emojiOpen)}><Icon name="smile" /></button><textarea aria-label="Личное сообщение" value={text} onChange={e => setText(e.target.value)} maxLength={500} placeholder="Сообщение" rows={1} />{text.trim() ? <button className="send" type="submit" aria-label={editing ? 'Сохранить' : 'Отправить личное сообщение'} disabled={busy || blocked}><Icon name={editing ? 'check' : 'send'} /></button> : !blocked && <Recorder onSend={sendRecording} toast={setError} onActive={active => { if (active) setEmojiOpen(false) }} />}</form>{fileOpen && <Sheet title="Прикрепить файл" onClose={() => setFileOpen(false)}><label className="jury-file-pick">{file ? file.name : 'Выбрать файл'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf,text/plain,application/zip,.docx,.pptx,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} /></label><p>Вымышленные изображения, видео и документы до 1 МБ. Личные данные и фотографии людей для проверки не используй.</p><label className="check"><input type="checkbox" checked={fileConsent} onChange={e => setFileConsent(e.target.checked)} />Файл не содержит личных данных</label>{error && <p className="jury-error" role="alert">{error}</p>}<button className="btn" disabled={!file || !fileConsent || busy} onClick={sendFile}>Отправить файл</button></Sheet>}{menu && <Sheet title="Сообщение" onClose={() => setMenu(null)}><div className="react-row">{REACTIONS.map(r => <button key={r} aria-label={`Реакция ${r}`} onClick={() => react(r)} disabled={busy}>{r}</button>)}</div><div className="menu-list"><button className="menu-item" onClick={() => { setReplyTo(menu); setEditing(null); setMenu(null) }}><Icon name="reply" />Ответить</button>{!menu.text.startsWith('::') && <button className="menu-item" onClick={() => { navigator.clipboard?.writeText(menu.text); setMenu(null) }}><Icon name="copy" />Скопировать</button>}{!menu.text.startsWith('::') && onSave && <button className="menu-item" onClick={() => { onSave(menu); setMenu(null) }}><Icon name="copy" />Сохранить в избранном</button>}{menu.own && <>{!menu.text.startsWith('::') && <button className="menu-item" onClick={() => { setEditing(menu); setReplyTo(null); setText(menu.text); setMenu(null) }}><Icon name="edit" />Изменить</button>}<button className="menu-item danger" disabled={busy} onClick={() => action('dm-message-delete', { id: active.id, messageId: menu.id }, () => setMenu(null))}><Icon name="trash" />Удалить</button></>}<button className="menu-item" onClick={() => { const next = [...new Set([...hidden, menu.id])]; setHidden(next); try { localStorage.setItem('jury-dm-hidden-' + session.nick, JSON.stringify(next)) } catch { /* hidden until reload */ }; setMenu(null) }}><Icon name="eyeoff" />Скрыть у себя</button>{!menu.own && !menu.text.startsWith('::') && <button className="menu-item danger" onClick={() => { setReport(menu); setReason(''); setDetails(''); setMenu(null) }}><Icon name="flag" />Пожаловаться</button>}</div></Sheet>}{report && <Sheet title="Пожаловаться" onClose={() => setReport(null)}><p>Модератор увидит только это сообщение, причину и вымышленные ники. Решение принимает человек.</p>{REASONS.map(r => <button key={r} className={'opt' + (reason === r ? ' on' : '')} onClick={() => setReason(r)}>{r}</button>)}{reason === 'Другое' && <textarea className="sheet-input" value={details} onChange={e => setDetails(e.target.value)} maxLength={300} placeholder="Что случилось?" />}{error && <p className="jury-error" role="alert">{error}</p>}<button className="btn" disabled={busy || !reason || (reason === 'Другое' && !details.trim())} onClick={sendReport}>Отправить жалобу</button></Sheet>}</>
      : <div className="scroll direct-list"><p>Личные сообщения видят только два участника. Используй вымышленные данные.</p><button className="btn" onClick={() => setPage('people')}>Новое сообщение</button>{conversations.map(c => <button className="direct-row" key={c.id} onClick={() => setSelected(c.id)}><span><b>{c.nick}</b><small>{c.status === 'accepted' ? c.lastText || 'Можно написать' : c.incoming ? 'Хочет написать тебе' : 'Ожидает ответа'}</small></span><Icon name="chevron" /></button>)}{!conversations.length && <div className="empty">Личных переписок пока нет.</div>}</div>}
  </>
}
