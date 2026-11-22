import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import Sheet from '../components/Sheet.jsx'
import { folders, people } from '../data/demo.js'
import { INTERESTS } from './Register.jsx'
import { findSimilar, checkNew } from '../logic/moderation.js'

const GROUP_COLORS = ['#F2994A', '#9B51E0', '#27AE60', '#EB5757', '#2F80ED', '#56CCF2', '#BB6BD9']

// Список чатов как в Telegram: плашка срочного, папки, строки чатов, кнопка «создать группу».
export default function ChatList({ user, chats, messages, unread, alerts, onOpen, onCreateGroup, onGoEvents }) {
  const [folder, setFolder] = useState('all')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const foldersRef = useRef(null)
  const [moreFolders, setMoreFolders] = useState(false)
  useEffect(() => {
    const element = foldersRef.current
    if (!element) return
    const update = () => setMoreFolders(element.scrollLeft + element.clientWidth < element.scrollWidth - 2)
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(element)
    element.addEventListener('scroll', update, { passive: true })
    return () => { observer?.disconnect(); element.removeEventListener('scroll', update) }
  }, [user?.role])

  if (user?.role === 'teacher') {
    return (
      <>
        <div className="topbar"><h1>Чаты</h1></div>
        <div className="scroll">
          <div className="empty">
            <Icon name="shield" />
            <b>Чаты — пространство учеников</b>
            <span>Учителя не видят переписку — так ребята общаются свободно. Во вкладке «События» вы можете создать мероприятие для учеников, а в «Идеях» — посмотреть, что они предлагают.</span>
          </div>
        </div>
      </>
    )
  }

  const alert = alerts.find((a) => !a.resolved)
  const list = chats
    .filter((c) => folder === 'all' || c.folder === folder)
    .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || (messages[c.id] || []).some((m) => !m.hidden && m.text?.toLowerCase().includes(q.toLowerCase())))
    .map((c) => ({ c, msgs: messages[c.id] || [] }))
    .sort((a, b) => (b.c.pinned ? 1 : 0) - (a.c.pinned ? 1 : 0) || (b.msgs.at(-1)?.time || '').localeCompare(a.msgs.at(-1)?.time || ''))

  return (
    <>
      <div className="topbar chat-list-header">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div className="brand-heading"><h1>Школьный круг</h1><span>Общение начинается здесь</span></div>
        <button className="create-chat" aria-label="Создать группу" onClick={() => setCreating(true)}><Icon name="pencil" /></button>
      </div>
      {alert && (
        <button className="alert-banner" onClick={onGoEvents}>
          <Icon name="bolt" /><span><b>Срочно:</b> {alert.text} · {alert.place}</span><Icon name="chevron" />
        </button>
      )}
      <div className="search">
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" aria-label="Поиск чатов и сообщений" />
      </div>
      <div className="folders-wrap">
        <div className="folders" ref={foldersRef} role="group" aria-label="Папки чатов">
          {folders.map((f) => (
            <button key={f.id} className={folder === f.id ? 'on' : ''} aria-pressed={folder === f.id} onClick={() => setFolder(f.id)}>{f.title}</button>
          ))}
        </div>
        {moreFolders && <button className="folders-more" aria-label="Показать остальные папки" onClick={() => foldersRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}><Icon name="chevron" /></button>}
      </div>
      <div className="scroll" style={{ paddingBottom: 80 }}>
        {list.length === 0 && q.trim() && <div className="empty"><b>Ничего не нашли</b><span>Попробуй другой запрос.</span></div>}
        {list.length === 0 && !q.trim() && folder === 'dm' && (
          <div className="empty"><Icon name="mail" /><b>Личных чатов пока нет</b><span>Найди ребят во вкладке «Друзья» и отправь запрос. Чат появится, когда его примут.</span></div>
        )}
        {list.map(({ c, msgs }) => {
          const last = msgs[msgs.length - 1]
          const who = last && (last.own ? 'Вы' : c.type === 'channel' || c.type === 'dm' ? null : people[last.from]?.nick)
          const text = last ? (last.hidden ? 'Сообщение скрыто' : last.media ? (last.media.kind === 'audio' ? 'Голосовое сообщение' : 'Видеокружок') : last.meet ? `📍 Встреча: ${last.meet.place}, ${last.meet.time}` : last.game ? `🎮 ${last.game.title}` : last.text) : (c.type === 'dm' ? 'Напиши первым 👋' : 'Пока тихо')
          const p = c.type === 'dm' ? people[c.nick] : null
          return (
            <button key={c.id} className="chat-row" onClick={() => onOpen(c.id)}>
              {p ? <Avatar p={p} /> : <Avatar color={c.color} text={c.letter} />}
              <div className="body">
                <div className="row1">
                  <span className="title">{c.title}{c.own && <span className="own-tag">моя</span>}</span>
                  <span className="time">{last?.time}</span>
                </div>
                <div className="row2">
                  <span className="last">{who && <em>{who}: </em>}{text}</span>
                  {unread[c.id] > 0 && <span className={'badge' + (c.type === 'channel' ? ' muted' : '')}>{unread[c.id]}</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {creating && (
        <GroupForm chats={chats} onClose={() => setCreating(false)}
          onOpen={(id) => { setCreating(false); onOpen(id) }}
          onCreate={(g) => { setCreating(false); onCreateGroup({ ...g, color: GROUP_COLORS[g.title.length % GROUP_COLORS.length] }) }} />
      )}
    </>
  )
}

// Новая группа. ИИ-помощник проверяет, нет ли уже похожей — чтобы не было «миллиарда групп».
function GroupForm({ chats, onClose, onCreate, onOpen }) {
  const [f, setF] = useState({ title: '', about: '', interest: null })
  const [check, setCheck] = useState(null)
  const [difference, setDifference] = useState('')
  const set = (k, v) => { setF({ ...f, [k]: v }); setCheck(null) }

  const run = () => {
    const groups = chats.filter((c) => c.type === 'group')
    const similar =
      findSimilar(f.title, `${f.title} ${f.about}`, groups.map((g) => ({ id: g.id, title: g.title, text: `${g.title} ${g.about || ''}` }))) ||
      (f.interest && groups.find((g) => g.interest === f.interest) && { ...groups.find((g) => g.interest === f.interest), byInterest: true })
    const notes = checkNew(f.title, f.about)
    if (!similar && !notes.length) return onCreate(f)
    setCheck({ similar, notes })
  }

  return (
    <Sheet onClose={onClose} title="Новая группа" tall>
      <input className="sheet-input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Название: Шахматный клуб" maxLength={30} />
      <input className="sheet-input" value={f.about} onChange={(e) => set('about', e.target.value)} placeholder="О чём группа?" maxLength={100} />
      <p>Тема (по желанию)</p>
      <div className="chips">{INTERESTS.map((i) => <button key={i} className={'chip' + (f.interest === i ? ' on' : '')} onClick={() => set('interest', f.interest === i ? null : i)}>{i}</button>)}</div>
      {check && (
        <div className="ai-box">
          <b>Проверка похожих групп</b>
          {check.notes.map((n) => <span key={n}>• {n}</span>)}
          {check.similar && (
            <>
              <span>Похожая группа уже есть: «{check.similar.title}»{check.similar.byInterest ? ` — тоже про «${f.interest}»` : ''}. Может, лучше присоединиться к ней? Так людей будет больше, а групп — меньше.</span>
              <button className="btn" onClick={() => onOpen(check.similar.id)}>Открыть «{check.similar.title}»</button>
              {!check.notes.length && <><input className="sheet-input" value={difference} onChange={(e) => setDifference(e.target.value)} placeholder="Чем твоя группа отличается?" maxLength={100} /><button className="btn ghost" disabled={difference.trim().length < 4} onClick={() => onCreate({ ...f, about: [f.about, difference].filter(Boolean).join(' · ') })}>У меня другое — создать</button></>}
            </>
          )}
          <small>В прототипе похожие группы ищет простой алгоритм по словам и интересам. Решение за тобой.</small>
        </div>
      )}
      {!check?.similar && <button className="btn" disabled={f.title.trim().length < 4 || check?.notes.length > 0} onClick={run}>Создать</button>}
    </Sheet>
  )
}
