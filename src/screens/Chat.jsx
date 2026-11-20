import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'
import { people, replies } from '../data/demo.js'
import { now } from '../store.js'

const REASONS = ['Меня это задело', 'Оскорбляют кого-то', 'Спам или реклама', 'Делятся чужими личными данными', 'Другое']
const REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢']

// Экран одного чата. Нажатие на сообщение открывает меню действий —
// для чужих: ответить, реакция, копировать, написать лично, скрыть, пожаловаться;
// для своих: ответить, изменить, копировать, удалить.
// list — сообщения чата; onChange(fn) — изменить их (fn получает старый список).
export default function Chat({ chat, user, list, onBack, onChange, onDmRequest }) {
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(null)
  const [menu, setMenu] = useState(null)       // сообщение, по которому нажали
  const [report, setReport] = useState(null)   // на что жалуемся
  const [reason, setReason] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [reply, setReply] = useState(null)     // на что отвечаем
  const [editing, setEditing] = useState(null) // что редактируем
  const [toast, setToast] = useState(null)
  const bottom = useRef(null)
  const input = useRef(null)
  const isChannel = chat.type === 'channel'

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [list.length, typing])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t) }, [toast])

  const update = (id, p) => onChange((l) => l.map((m) => (m.id === id ? { ...m, ...p } : m)))
  const nickOf = (m) => (m.own ? user.nick : people[m.from]?.nick || m.from)
  const preview = (m) => (m.meet ? `Встреча: ${m.meet.place}, ${m.meet.time}` : m.text)

  const send = () => {
    const t = text.trim()
    if (!t) return
    if (editing) {
      update(editing.id, { text: t, edited: true })
      setEditing(null); setText('')
      return
    }
    const r = reply && { nick: nickOf(reply), text: preview(reply) }
    onChange((l) => [...l, { id: 'u' + Date.now(), from: user.nick, own: true, text: t, time: now(), reply: r }])
    setText(''); setReply(null)
    // Через пару секунд кто-нибудь из (выдуманных) ребят отвечает
    const nicks = [...new Set(list.filter((m) => !m.own && people[m.from]).map((m) => m.from))]
    const who = nicks[Math.floor(Math.random() * nicks.length)] || 'pixel_cat'
    setTimeout(() => setTyping(who), 700)
    setTimeout(() => {
      setTyping(null)
      onChange((l) => [...l, { id: 'r' + Date.now(), from: who, text: replies[Math.floor(Math.random() * replies.length)], time: now() }])
    }, 2200)
  }

  const react = (m, e) => {
    const r = { ...(m.reactions || {}) }
    if (m.myReaction) { r[m.myReaction]--; if (!r[m.myReaction]) delete r[m.myReaction] }
    const mine = m.myReaction === e ? null : e
    if (mine) r[mine] = (r[mine] || 0) + 1
    update(m.id, { reactions: r, myReaction: mine })
  }

  // Действия из меню
  const act = (what) => {
    const m = menu
    setMenu(null)
    if (what === 'reply') { setReply(m); setEditing(null); input.current?.focus() }
    if (what === 'edit') { setEditing(m); setReply(null); setText(m.text); input.current?.focus() }
    if (what === 'copy') { navigator.clipboard?.writeText(preview(m)).catch(() => {}); setToast('Текст скопирован') }
    if (what === 'hide') { update(m.id, { hidden: true }) }
    if (what === 'report') { setReport(m) }
    if (what === 'delete') { setConfirmDel(m) }
    if (what === 'dm') { onDmRequest?.(m.from); setToast(`Запрос на переписку отправлен ${nickOf(m)}. Если он согласится, откроется личный чат.`) }
  }

  const sendReport = () => {
    update(report.id, { hidden: true, reported: true })
    setReport(null); setReason(null)
    setToast('Жалоба отправлена. Модератор проверит сообщение, а у тебя оно уже скрыто.')
  }

  const actions = menu && (menu.own
    ? [['reply', 'reply', 'Ответить'], !menu.meet && ['edit', 'edit', 'Изменить'], ['copy', 'copy', 'Копировать'], ['delete', 'trash', 'Удалить', true]]
    : [!isChannel && ['reply', 'reply', 'Ответить'], ['copy', 'copy', 'Копировать'], !isChannel && ['dm', 'mail', 'Написать лично'], ['hide', 'eyeoff', 'Скрыть'], ['report', 'flag', 'Пожаловаться', true]]
  ).filter(Boolean)

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Назад"><Icon name="back" /></button>
        <Avatar size="sm" color={chat.color} text={chat.letter} />
        <div className="chat-head">
          <div className="t">{chat.title}</div>
          {typing
            ? <div className="typing">{people[typing]?.nick} печатает…</div>
            : <div className="s">{isChannel ? `${chat.members} подписчиков` : `${chat.members} участников`}</div>}
        </div>
        <button className="icon-btn" aria-label="Ещё"><Icon name="more" /></button>
      </div>

      <div className="messages">
        <div className="day">Сегодня</div>
        {list.map((m) => {
          const p = people[m.from]
          const reacts = Object.entries(m.reactions || {})
          return (
            <div key={m.id} className={'msg-wrap' + (m.own ? ' own' : '')}>
              {m.hidden ? (
                <div className="msg">
                  <div className="hidden-msg">
                    {m.reported ? 'Скрыто — жалоба отправлена' : 'Сообщение скрыто'}
                    <button onClick={() => update(m.id, { hidden: false })}>показать</button>
                  </div>
                </div>
              ) : (
                <button className={'msg' + (m.meet ? ' meet' : '') + (menu?.id === m.id ? ' pressed' : '')} onClick={() => setMenu(m)}>
                  {!m.own && !isChannel && <div className="from" style={{ color: p?.color }}>{p?.nick || m.from}</div>}
                  {m.reply && (
                    <div className="quote"><b>{m.reply.nick}</b><span>{m.reply.text}</span></div>
                  )}
                  {m.meet ? (
                    <>
                      <div className="lbl">Встреча</div>
                      <div className="what">{m.meet.place}, {m.meet.time}</div>
                      <div className="who">идут {m.meet.going + (m.meet.me ? 1 : 0)} человек</div>
                      <span
                        role="button"
                        className={'go' + (m.meet.me ? ' on' : '')}
                        onClick={(e) => { e.stopPropagation(); update(m.id, { meet: { ...m.meet, me: !m.meet.me } }) }}
                      >
                        {m.meet.me ? 'Ты идёшь ✓' : 'Я иду'}
                      </span>
                    </>
                  ) : (
                    <div className="text">{m.text}</div>
                  )}
                  {reacts.length > 0 && (
                    <div className="reacts">
                      {reacts.map(([e, c]) => (
                        <span key={e} role="button" className={'react' + (m.myReaction === e ? ' mine' : '')}
                          onClick={(ev) => { ev.stopPropagation(); react(m, e) }}>{e} {c}</span>
                      ))}
                    </div>
                  )}
                  <div className="meta">
                    <span className="tm">{m.edited && 'изменено '}{m.time}{m.own && ' ✓✓'}</span>
                  </div>
                </button>
              )}
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      {isChannel ? (
        <div className="composer readonly">Здесь пишет только школа</div>
      ) : (
        <div className="composer-wrap">
          {(reply || editing) && (
            <div className="compose-bar">
              <Icon name={editing ? 'edit' : 'reply'} />
              <div className="cb-body">
                <b>{editing ? 'Редактирование' : `Ответ ${nickOf(reply)}`}</b>
                <span>{preview(editing || reply)}</span>
              </div>
              <button className="icon-btn" aria-label="Отмена" onClick={() => { setReply(null); if (editing) setText(''); setEditing(null) }}><Icon name="x" /></button>
            </div>
          )}
          <div className="composer">
            <textarea
              ref={input}
              rows={1}
              value={text}
              placeholder="Сообщение"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            />
            <button className="send" onClick={send} aria-label={editing ? 'Сохранить' : 'Отправить'}><Icon name={editing ? 'check' : 'send'} /></button>
          </div>
        </div>
      )}

      {/* Меню действий над сообщением */}
      {menu && (
        <div className="sheet-bg" onClick={() => setMenu(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {!isChannel && (
              <div className="react-row">
                {REACTIONS.map((e) => (
                  <button key={e} className={menu.myReaction === e ? 'on' : ''} onClick={() => { react(menu, e); setMenu(null) }}>{e}</button>
                ))}
              </div>
            )}
            <div className="sheet-preview"><b>{nickOf(menu)}</b><span>{preview(menu)}</span></div>
            <div className="menu-list">
              {actions.map(([id, icon, title, danger]) => (
                <button key={id} className={'menu-item' + (danger ? ' danger' : '')} onClick={() => act(id)}>
                  <Icon name={icon} />{title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {report && (
        <div className="sheet-bg" onClick={() => setReport(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>Пожаловаться</h3>
            <p>Что не так с сообщением от {nickOf(report)}? Модератор разберётся, автор не узнает, кто пожаловался.</p>
            {REASONS.map((r) => (
              <button key={r} className={'opt' + (reason === r ? ' on' : '')} onClick={() => setReason(r)}>{r}</button>
            ))}
            <button className="btn" disabled={!reason} onClick={sendReport}>Отправить жалобу</button>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="sheet-bg" onClick={() => setConfirmDel(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>Удалить сообщение?</h3>
            <p>Оно пропадёт у всех участников чата.</p>
            <button className="btn danger" onClick={() => { onChange((l) => l.filter((x) => x.id !== confirmDel.id)); setConfirmDel(null) }}>Удалить</button>
            <button className="btn ghost" onClick={() => setConfirmDel(null)}>Отмена</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
