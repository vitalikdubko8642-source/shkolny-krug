import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { chats, folders, people } from '../data/demo.js'

// Список чатов как в Telegram: папки сверху, строки чатов, кнопка «создать».
export default function ChatList({ user, messages, unread, onOpen }) {
  const [folder, setFolder] = useState('all')
  const [q, setQ] = useState('')

  if (user?.role === 'teacher') {
    return (
      <>
        <div className="topbar"><h1>Чаты</h1></div>
        <div className="scroll">
          <div className="empty">
            <Icon name="shield" />
            <b>Чаты — пространство учеников</b>
            <span>Учителя не видят переписку. Во вкладке «События» вы можете создать мероприятие для учеников.</span>
          </div>
        </div>
      </>
    )
  }

  const list = chats
    .filter((c) => folder === 'all' || c.folder === folder)
    .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <div className="topbar">
        <h1>Школьный круг</h1>
      </div>
      <div className="search">
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" />
      </div>
      <div className="folders">
        {folders.map((f) => (
          <button key={f.id} className={folder === f.id ? 'on' : ''} onClick={() => setFolder(f.id)}>{f.title}</button>
        ))}
      </div>
      <div className="scroll">
        {list.map((c) => {
          const msgs = messages[c.id] || []
          const last = msgs[msgs.length - 1]
          const who = last && (last.own ? 'Вы' : c.type === 'channel' ? null : people[last.from]?.nick)
          const text = last ? (last.meet ? 'Встреча: ' + last.meet.place + ', ' + last.meet.time : last.text) : ''
          return (
            <button key={c.id} className="chat-row" onClick={() => onOpen(c.id)}>
              <div className="avatar" style={{ background: c.color }}>{c.letter}</div>
              <div className="body">
                <div className="row1">
                  <span className="title">{c.title}</span>
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
      <button className="fab" aria-label="Создать группу"><Icon name="pencil" /></button>
    </>
  )
}
