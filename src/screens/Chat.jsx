import { Fragment, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import Avatar, { Nick } from '../components/Avatar.jsx'
import Sheet from '../components/Sheet.jsx'
import PersonSheet from '../components/PersonSheet.jsx'
import ProfileCard from '../components/ProfileCard.jsx'
import Game from './Game.jsx'
import { people, replies, dmReplies, MEET_PLACES, MAF_PLACE } from '../data/demo.js'
import { commonInterests } from './Friends.jsx'
import { now } from '../store.js'
import { meetingDate, meetingIsFuture, meetingLabel } from '../logic/meeting.js'
import AiSheet from '../components/AiSheet.jsx'
import { hasPersonalData } from '../logic/personal.js'
import { Smile } from 'lucide-react'
import Recorder from '../components/Recorder.jsx'
import MediaMessage from '../components/MediaMessage.jsx'
import { deleteRecording } from '../mediaStore.js'

const REASONS = ['Меня это задело', 'Оскорбляют кого-то', 'Спам или реклама', 'Делятся чужими личными данными', 'Другое']
const REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢']
const EMOJI = ['😀','😃','😄','😁','😆','😅','😂','🤣','🙂','🙃','😉','😊','😍','🥰','😘','😎','🤩','🥳','😏','😒','😔','😢','😭','😤','😡','🤔','🤨','😮','😱','🤯','😴','🤝','👍','👎','👌','✌️','🤞','👏','🙌','🫶','💪','👀','❤️','🧡','💛','💚','💙','💜','🖤','💔','💯','✨','🔥','🎉','🎶','⚽','🎮','🚀','💡','✅']
const TIMES = ['13:30', '14:30', '15:00', '16:00', '17:00']
const memberCount = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'участник' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'участника' : 'участников'}`
const messageDate = (m) => m.createdAt ? new Date(m.createdAt).toLocaleDateString('ru-RU') : 'Демо-сообщения'
const messageDay = (m) => !m.createdAt ? 'Демо-сообщения' : messageDate(m) === new Date().toLocaleDateString('ru-RU') ? 'Сегодня' : messageDate(m)

// Экран одного чата (группа, канал школы или личная переписка).
// Нажатие на сообщение открывает меню действий:
//   чужое — реакция, ответить, копировать, написать лично, скрыть, пожаловаться;
//   своё  — реакция, ответить, изменить, копировать, удалить.
// «+» у поля ввода — позвать на встречу или запустить мини-игру.
// list — сообщения чата; onChange(fn) — изменить их (fn получает старый список).
export default function Chat({ chat, user, settings, list, onBack, onChange, personState, onRequest, onOpenDm, onBlock, onInvite, onGameFinish, toast, onSave, onArchive, archived }) {
  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [recordingOpen, setRecordingOpen] = useState(false)
  const [typing, setTyping] = useState(null)
  const [menu, setMenu] = useState(null)       // сообщение, по которому нажали
  const [report, setReport] = useState(null)   // на что жалуемся
  const [reason, setReason] = useState(null)
  const [reasonDetails, setReasonDetails] = useState('')
  const [personalWarning, setPersonalWarning] = useState(false)
  const [aiTask, setAiTask] = useState(null)
  const [revealed, setRevealed] = useState({})
  const [confirmDel, setConfirmDel] = useState(null)
  const [reply, setReply] = useState(null)     // на что отвечаем
  const [editing, setEditing] = useState(null) // что редактируем
  const [sheet, setSheet] = useState(null)     // 'plus' | 'meet' | 'info' | 'block'
  const [person, setPerson] = useState(null)   // чей профиль открыт
  const [game, setGame] = useState(null)       // запущенная игра { msgId }
  const bottom = useRef(null)
  const input = useRef(null)
  const isChannel = chat.type === 'channel'
  const isDm = chat.type === 'dm'
  const isSaved = chat.type === 'saved'
  const dmPerson = isDm ? people[chat.nick] : null

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [list.length, typing])

  const update = (id, p) => onChange((l) => l.map((m) => (m.id === id ? { ...m, ...p } : m)))
  const nickOf = (m) => (m.own ? user.nick : people[m.from]?.nick || m.from)
  const preview = (m) => (m.media ? (m.media.kind === 'audio' ? 'Голосовое сообщение' : 'Видеокружок') : m.meet ? `Встреча: ${m.meet.place}, ${m.meet.time}` : m.game ? `Мини-игра «${m.game.title}»` : m.text)
  const summaryText = () => {
    const aliases = new Map()
    return list.filter((m) => m.text && !m.hidden).slice(-30).map((m) => {
      if (!m.own && !aliases.has(m.from)) aliases.set(m.from, aliases.size + 1)
      return `${m.own ? 'Вы' : `Участник ${aliases.get(m.from)}`}: ${m.text}`
    }).join('\n')
  }

  const insertEmoji = (emoji) => {
    const element = input.current
    const start = element?.selectionStart ?? text.length, end = element?.selectionEnd ?? text.length
    setText(text.slice(0, start) + emoji + text.slice(end))
    requestAnimationFrame(() => { element?.focus(); element?.setSelectionRange(start + emoji.length, start + emoji.length) })
  }

  const sendMedia = (media) => {
    const r = reply && { nick: nickOf(reply), text: preview(reply) }
    onChange(l => [...l, { id: 'u' + Date.now(), from: user.nick, own: true, text: '', time: now(), createdAt: new Date().toISOString(), reply: r, media }])
    setReply(null); setRecordingOpen(false)
  }

  // Кто-нибудь из (выдуманных) ребят отвечает через пару секунд
  const botAnswer = (message = '') => {
    if (isSaved) return
    if (!isDm && ((chat.own && !chat.invited?.length) || chat.id.startsWith('class:') || chat.id.startsWith('parallel:'))) return
    if (hasPersonalData(message) || /дурак|урод|травл/i.test(message)) return
    let who, phrase
    if (isDm) { who = chat.nick; phrase = dmReplies } else {
      const nicks = [...new Set([...list.filter((m) => !m.own && people[m.from]?.cls).map((m) => m.from), ...(chat.invited || [])])]
      who = nicks[Math.floor(Math.random() * nicks.length)] || 'pixel_cat'
      phrase = /привет|здравствуй/i.test(message) ? ['привет! рад тебя видеть 🙂'] : /встрет|пойд[её]м|погуля|поигра/i.test(message) ? ['давай! во сколько встречаемся?'] : /\?/.test(message) ? ['интересный вопрос, давайте обсудим'] : replies
    }
    setTimeout(() => setTyping(who), 700)
    setTimeout(() => {
      setTyping(null)
      onChange((l) => [...l, { id: 'r' + Date.now(), from: who, text: phrase[Math.floor(Math.random() * phrase.length)], time: now(), createdAt: new Date().toISOString() }])
    }, 2300)
  }

  const send = (confirmed = false) => {
    const t = text.trim()
    if (!t) { if (editing) toast('Пустое сообщение нельзя сохранить. Можно удалить его через меню.') ; return }
    if (!isDm && !confirmed && hasPersonalData(t)) { setPersonalWarning(true); return }
    if (editing) {
      update(editing.id, { text: t, edited: true })
      setEditing(null); setText('')
      return
    }
    const r = reply && { nick: nickOf(reply), text: preview(reply) }
    onChange((l) => [...l, { id: 'u' + Date.now(), from: user.nick, own: true, text: t, time: now(), createdAt: new Date().toISOString(), reply: r }])
    setText(''); setReply(null)
    botAnswer(t)
  }

  const react = (m, e) => {
    const r = { ...(m.reactions || {}) }
    if (m.myReaction) { r[m.myReaction]--; if (!r[m.myReaction]) delete r[m.myReaction] }
    const mine = m.myReaction === e ? null : e
    if (mine) r[mine] = (r[mine] || 0) + 1
    update(m.id, { reactions: r, myReaction: mine })
  }

  const writePersonally = (nick) => {
    const st = personState(nick)
    if (st === 'blocked') return toast('Сначала разблокируй пользователя в настройках')
    if (st === 'friend') return onOpenDm(nick)
    if (st === 'pending') return toast(`Запрос ${nick} уже отправлен — ждём ответа`)
    if (st === 'incoming') return toast(`${nick} уже прислал тебе запрос — ответь во вкладке «Друзья»`)
    onRequest(nick)
    toast(`Запрос отправлен ${nick}. Если он согласится, откроется личный чат.`)
  }

  // Действия из меню сообщения
  const act = (what) => {
    const m = menu
    setMenu(null)
    if (what === 'reply') { setReply(m); setEditing(null); input.current?.focus() }
    if (what === 'edit') { setEditing(m); setReply(null); setText(m.text); input.current?.focus() }
    if (what === 'copy') { navigator.clipboard?.writeText(preview(m)).catch(() => {}); toast('Текст скопирован') }
    if (what === 'hide') update(m.id, { hidden: true })
    if (what === 'report') setReport(m)
    if (what === 'delete') setConfirmDel(m)
    if (what === 'dm') writePersonally(m.from)
    if (what === 'save') onSave(m)
  }

  const sendReport = () => {
    update(report.id, { hidden: true, reported: true, reportReason: reason, reportDetails: reason === 'Другое' ? reasonDetails.trim() : '' })
    setReport(null); setReason(null); setReasonDetails('')
    toast('Демо: сообщение скрыто в этом браузере. Жалоба не отправлена модератору.')
  }

  const postMeet = (meet) => {
    onChange((l) => [...l, { id: 'u' + Date.now(), from: user.nick, own: true, text: '', time: now(), createdAt: new Date().toISOString(), meet: { ...meet, going: 0, me: true } }])
    setSheet(null)
    botAnswer()
  }

  const startGame = () => {
    const id = 'u' + Date.now()
    onChange((l) => [...l, { id, from: user.nick, own: true, text: '', time: now(), createdAt: new Date().toISOString(), game: { id, title: 'Быстрый счёт', by: user.nick, players: 1 } }])
    setSheet(null)
    setGame({ msgId: id })
  }

  const canDm = (m) => !isChannel && !isDm && !m.own && people[m.from]?.cls
  const actions = menu && [...(menu.own
    ? [['reply', 'reply', 'Ответить'], !menu.meet && !menu.game && !menu.media && ['edit', 'edit', 'Изменить'], !menu.media && ['copy', 'copy', 'Копировать'], ['delete', 'trash', 'Удалить', true]]
    : [!isChannel && ['reply', 'reply', 'Ответить'], !menu.media && ['copy', 'copy', 'Копировать'], canDm(menu) && ['dm', 'mail', 'Написать лично'], ['hide', 'eyeoff', 'Скрыть'], ['report', 'flag', 'Пожаловаться', true]]
  ), !isSaved && menu.text && !menu.media && !menu.meet && !menu.game && ['save', 'copy', 'Сохранить в избранном']].filter(Boolean)

  const gameMsg = game && list.find((m) => m.id === game.msgId)
  if (gameMsg) {
    // Соперники: кто писал в этом чате, плюс ещё ребята, чтобы набралось 5 человек
    const fromChat = [...new Set(list.filter((m) => !m.own && people[m.from]?.cls).map((m) => m.from))]
    const extra = Object.keys(people).filter((n) => people[n].cls && !fromChat.includes(n))
    const players = [...fromChat, ...extra].slice(0, 5)
    return (
      <Game title={gameMsg.game.title} chatTitle={chat.title} players={players} user={user}
        onExit={() => { update(gameMsg.id, { game: { ...gameMsg.game, cancelled: true } }); setGame(null) }}
        onFinish={(res) => { onGameFinish(gameMsg.id, res); setGame(null) }} />
    )
  }

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Назад"><Icon name="back" /></button>
        <button className="chat-head-btn" onClick={() => setSheet('info')}>
          {isDm ? <Avatar p={dmPerson} size="sm" /> : <Avatar size="sm" color={chat.color} text={chat.letter} />}
          <div className="chat-head">
            <div className="t">{isDm ? <Nick p={dmPerson} /> : chat.title}</div>
            {typing
              ? <div className="typing">{isDm ? 'печатает…' : `${people[typing]?.nick} печатает…`}</div>
              : <div className="s">{isSaved ? 'Личные заметки на этом устройстве' : isDm ? 'личная переписка' : isChannel ? `${chat.members} подписчиков` : memberCount(chat.members)}</div>}
          </div>
        </button>
        <button className="icon-btn" aria-label="О чате" onClick={() => setSheet('info')}><Icon name="more" /></button>
      </div>

      <div className="messages">
        {isDm && <div className="day">Вы оба согласились на переписку 🤝</div>}
        {list.map((m, index) => {
          const p = people[m.from]
          const reacts = Object.entries(m.reactions || {})
          const MessageElement = m.media ? 'div' : 'button'
          return (
            <Fragment key={m.id}>
            {(index === 0 || messageDate(list[index - 1]) !== messageDate(m)) && <div className="day">{messageDay(m)}</div>}
            <div className={'msg-wrap' + (m.own ? ' own' : '')}>
              {m.hidden ? (
                <div className="msg">
                  <div className="hidden-msg">
                    {m.reported ? 'Скрыто — жалоба отправлена' : 'Сообщение скрыто'}
                    <button onClick={() => update(m.id, { hidden: false })}>показать</button>
                  </div>
                </div>
              ) : (
                <MessageElement className={'msg' + (m.media ? ' media-bubble' : '') + (m.meet || m.game ? ' meet' : '') + (menu?.id === m.id ? ' pressed' : '')} role={m.media ? 'button' : undefined} tabIndex={m.media ? 0 : undefined} onKeyDown={m.media ? (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setMenu(m) } } : undefined} onClick={() => setMenu(m)}>
                  {!m.own && !isChannel && !isDm && (
                    <span role="button" className="from" style={{ color: p?.nickColor || p?.color }}
                      onClick={(e) => { if (p?.cls) { e.stopPropagation(); setPerson(p) } }}>
                      {p?.nick || m.from}{p?.badge && <span className="nick-badge">{p.badge}</span>}
                    </span>
                  )}
                  {m.reply && <div className="quote"><b>{m.reply.nick}</b><span>{m.reply.text}</span></div>}
                  {m.forwardedFrom && <div className="quote"><b>От: {m.forwardedFrom}</b></div>}

                  {m.media && <button className="media-menu" aria-label="Действия с записью" onClick={(e) => { e.stopPropagation(); setMenu(m) }}><Icon name="more" /></button>}

                  {m.media ? <MediaMessage media={m.media} /> : m.meet ? (
                    <>
                      <div className="meet-heading"><span className="meet-symbol"><Icon name="pin" /></span><span className="lbl">Встреча</span></div>
                      <div className="what">{m.meet.place}</div>
                      <div className="who">{meetingLabel(m.meet)}{m.meet.note ? ` · ${m.meet.note}` : ''}{m.meet.at && new Date(m.meet.at) <= new Date() ? ' · прошла' : ''}</div>
                      <div className="who">идут {m.meet.going + (m.meet.me ? 1 : 0)}</div>
                      {!m.own && m.meet.at && new Date(m.meet.at) > new Date() && <span role="button" className={'go' + (m.meet.me ? ' on' : '')}
                        onClick={(e) => { e.stopPropagation(); update(m.id, { meet: { ...m.meet, me: !m.meet.me } }) }}>
                        {m.meet.me ? 'Ты идёшь ✓' : 'Я иду'}
                      </span>}
                      {m.own && <span role="button" className="go" onClick={(e) => { e.stopPropagation(); setConfirmDel(m) }}>Отменить встречу</span>}
                    </>
                  ) : m.game ? (
                    <GameCard g={m.game} onPlay={(e) => { e.stopPropagation(); setGame({ msgId: m.id }) }} />
                  ) : (
                    <div className="text">{settings?.blurProfanity ? (m.text || '').split(/((?:бля|хуй|пизд|еба)[а-яё]*)/iu).map((part, i) => /^(?:бля|хуй|пизд|еба)/iu.test(part) && !revealed[`${m.id}:${i}`] ? <span key={i} role="button" aria-label="Показать скрытое слово" onClick={(e) => { e.stopPropagation(); setRevealed((prev) => ({ ...prev, [`${m.id}:${i}`]: true })) }} style={{ background: 'var(--text-2)', color: 'transparent', borderRadius: 4 }}>{part}</span> : part) : m.text}</div>
                  )}

                  {reacts.length > 0 && (
                    <div className="reacts">
                      {reacts.map(([e, c]) => (
                        <span key={e} role="button" className={'react' + (m.myReaction === e ? ' mine' : '')}
                          onClick={(ev) => { ev.stopPropagation(); react(m, e) }}>{e} {c}</span>
                      ))}
                    </div>
                  )}
                  <div className="meta"><span className="tm">{m.edited && 'изменено '}{m.time}{m.own && isDm && ' ✓✓'}</span></div>
                </MessageElement>
              )}
            </div>
            </Fragment>
          )
        })}
        <div ref={bottom} />
      </div>

      {isChannel ? (
        <div className="composer readonly">Здесь пишет только школа</div>
      ) : (
        <div className="composer-wrap">
          {emojiOpen && !recordingOpen && <div className="emoji-picker" role="region" aria-label="Выбор эмодзи"><div className="emoji-picker-head"><b>Эмодзи</b><button onClick={() => setEmojiOpen(false)} aria-label="Закрыть эмодзи"><Icon name="x" /></button></div><div className="emoji-grid">{EMOJI.map(e => <button key={e} aria-label={`Добавить ${e}`} onClick={() => insertEmoji(e)}>{e}</button>)}</div></div>}
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
            {!editing && !isSaved && <button className="icon-btn plus" aria-label="Встреча или игра" onClick={() => setSheet('plus')}><Icon name="plus" /></button>}
            <button className="icon-btn emoji-toggle" aria-label="Эмодзи" aria-expanded={emojiOpen} onClick={() => { setEmojiOpen(!emojiOpen); setRecordingOpen(false) }}><Smile size={22} /></button>
            <textarea
              ref={input} rows={1} value={text} placeholder="Сообщение"
              onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px` }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            />
            {text.trim() || editing ? <button className="send" onClick={() => send()} aria-label={editing ? 'Сохранить' : 'Отправить'}><Icon name={editing ? 'check' : 'send'} /></button> : <Recorder onSend={sendMedia} toast={toast} onActive={(active) => { setRecordingOpen(active); if (active) setEmojiOpen(false) }} />}
          </div>
        </div>
      )}

      {/* Меню действий над сообщением */}
      {menu && (
        <Sheet onClose={() => setMenu(null)}>
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
        </Sheet>
      )}

      {report && (
        <Sheet onClose={() => setReport(null)} title="Пожаловаться">
          <p>В учебном прототипе жалоба никому не отправляется. Сообщение будет скрыто на этом устройстве.</p>
          {REASONS.map((r) => <button key={r} className={'opt' + (reason === r ? ' on' : '')} onClick={() => setReason(r)}>{r}</button>)}
          {reason === 'Другое' && <textarea className="sheet-input" value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)} placeholder="Что случилось?" maxLength={300} />}
          <button className="btn" disabled={!reason || (reason === 'Другое' && !reasonDetails.trim())} onClick={sendReport}>Отправить жалобу</button>
          <button className="btn ghost" onClick={() => { setAiTask({ task: 'complaint', title: 'Разбор жалобы — демо', text: report.text || '' }); setReport(null) }}>Посмотреть разбор ИИ</button>
        </Sheet>
      )}
      {personalWarning && <Sheet onClose={() => setPersonalWarning(false)} title="Личные данные в чате"><p>Похоже, в сообщении есть телефон или адрес. В групповом чате это смогут увидеть все участники.</p><button className="btn" onClick={() => setPersonalWarning(false)}>Изменить</button><button className="btn ghost" onClick={() => { setPersonalWarning(false); send(true) }}>Всё равно отправить</button></Sheet>}

      {confirmDel && (
        <Sheet onClose={() => setConfirmDel(null)} title="Удалить сообщение?">
          <p>В демоверсии оно удалится из этого браузера.</p>
          <button className="btn danger" onClick={async () => { if (confirmDel.media) { try { await deleteRecording(confirmDel.media.id) } catch { toast('Не удалось удалить запись. Попробуй ещё раз.'); return } }; onChange((l) => l.filter((x) => x.id !== confirmDel.id)); setConfirmDel(null) }}>Удалить</button>
          <button className="btn ghost" onClick={() => setConfirmDel(null)}>Отмена</button>
        </Sheet>
      )}

      {/* «+»: встреча или мини-игра */}
      {sheet === 'plus' && (
        <Sheet onClose={() => setSheet(null)}>
          <div className="menu-list">
            <button className="menu-item" onClick={() => setSheet('meet')}><Icon name="pin" />Позвать на встречу</button>
            {!isDm && <button className="menu-item" onClick={startGame}><Icon name="game" />Мини-игра «Быстрый счёт»</button>}
            <button className="menu-item" onClick={() => { setSheet(null); setAiTask({ task: 'summary', title: 'Что я пропустил?', text: summaryText() }) }}><Icon name="chat" />Пересказать чат с ИИ</button>
          </div>
          {!isDm && <p className="sheet-note">В мини-игре участвует кто хочет. За первые места — монеты на оформление профиля. Общего рейтинга нет: итоги видны только в этом раунде.</p>}
        </Sheet>
      )}
      {sheet === 'meet' && <QuickMeet onClose={() => setSheet(null)} onSend={postMeet} />}

      {/* Информация о чате */}
      {sheet === 'info' && (
        <Sheet onClose={() => setSheet(null)}>
          {isDm ? (
            <>
              <ProfileCard user={dmPerson} settings={{ showClass: true, showInterests: true }} />
              <div className="menu-list">
                <button className="menu-item danger" onClick={() => setSheet('block')}><Icon name="block" />Заблокировать</button>
              </div>
            </>
          ) : (
            <>
              <div className="info-head">
                <Avatar color={chat.color} text={chat.letter} />
                <div><b>{chat.title}</b><span>{isSaved ? 'Только на этом устройстве' : isChannel ? `${chat.members} подписчиков` : memberCount(chat.members)}</span></div>
              </div>
              <p style={{ color: 'var(--text)' }}>{chat.about}</p>
              {!isChannel && !isSaved && (
                <div className="menu-list">
                  {chat.own && <button className="menu-item" onClick={() => setSheet('invite')}><Icon name="user" />Пригласить участника</button>}
                  <button className="menu-item" onClick={() => setSheet('meet')}><Icon name="pin" />Позвать на встречу</button>
                  <button className="menu-item" onClick={startGame}><Icon name="game" />Мини-игра «Быстрый счёт»</button>
                </div>
              )}
              {!isSaved && <p className="sheet-note">{isChannel ? 'Здесь пишет только администрация школы.' : 'В этом чате нет учителей. Если что-то задело — нажми на сообщение и пожалуйся.'}</p>}
            </>
          )}
          {!isSaved && <div className="menu-list"><button className="menu-item" onClick={onArchive}><Icon name="download" />{archived ? 'Вернуть из архива' : 'Убрать в архив'}</button></div>}
        </Sheet>
      )}
      {sheet === 'block' && (
        <Sheet onClose={() => setSheet(null)} title={`Заблокировать ${chat.nick}?`}>
          <p>{chat.nick} больше не сможет тебе писать и не увидит, что ты в сети. Он не получит уведомления о блокировке.</p>
          <button className="btn danger" onClick={() => { setSheet(null); onBlock(chat.nick) }}>Заблокировать</button>
          <button className="btn ghost" onClick={() => setSheet(null)}>Отмена</button>
        </Sheet>
      )}
      {sheet === 'invite' && <Sheet onClose={() => setSheet('info')} title="Пригласить в группу" tall><p>В демоверсии это вымышленные участники: настоящие приглашения не отправляются.</p>{Object.values(people).filter((person) => person.cls && personState(person.nick) !== 'blocked').map((person) => <button className="row" key={person.nick} disabled={chat.invited?.includes(person.nick)} onClick={() => { onInvite(person.nick); toast(`${person.nick} добавлен в демонстрационную группу`) }}><Avatar p={person} size="sm" /><span className="rt">{person.nick}</span><span className="rv">{chat.invited?.includes(person.nick) ? 'Добавлен' : 'Добавить'}</span></button>)}</Sheet>}

      {person && (
        <PersonSheet person={person} state={personState(person.nick)} common={commonInterests(user, person)}
          onClose={() => setPerson(null)}
          onRequest={() => { writePersonally(person.nick); setPerson(null) }}
          onOpenDm={() => { setPerson(null); onOpenDm(person.nick) }} />
      )}
      {aiTask && <AiSheet {...aiTask} onClose={() => setAiTask(null)} />}
    </>
  )
}

// Карточка мини-игры в чате
function GameCard({ g, onPlay }) {
  return (
    <>
      <div className="meet-heading"><span className="meet-symbol"><Icon name="game" /></span><span className="lbl">Мини-игра</span></div>
      <div className="what">{g.title}</div>
      <div className="who">запустил {people[g.by]?.nick || g.by} · 30 секунд на примеры</div>
      {g.cancelled ? <span className="who">Раунд завершён без результата</span> : g.results ? (
        <div className="game-results">
          <span>Участников: {g.results.length} · Победитель: {g.results[0]?.nick}</span>
          {g.my && <span className="my">Ты: {g.my.place} место{g.my.coins ? ` · +${g.my.coins} 🪙` : ''}</span>}
        </div>
      ) : (
        <span role="button" className="go" onClick={onPlay}>Играть</span>
      )}
    </>
  )
}

// Быстро позвать на встречу прямо из чата
function QuickMeet({ onClose, onSend }) {
  const [place, setPlace] = useState(MAF_PLACE)
  const [day, setDay] = useState('Сегодня')
  const [time, setTime] = useState('15:00')
  const [note, setNote] = useState('')
  return (
    <Sheet onClose={onClose} title="Позвать на встречу">
      <div className="chips">{MEET_PLACES.map((p) => <button key={p} className={'chip' + (place === p ? ' on' : '')} onClick={() => setPlace(p)}>{p}</button>)}</div>
      <div className="chips">
        {['Сегодня', 'Завтра'].map((d) => <button key={d} className={'chip' + (day === d ? ' on' : '')} onClick={() => setDay(d)}>{d}</button>)}
        <span className="chip-sep" />
        {TIMES.map((t) => <button key={t} className={'chip' + (time === t ? ' on' : '')} onClick={() => setTime(t)}>{t}</button>)}
      </div>
      <input className="sheet-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Зачем? Например: репетиция" maxLength={40} />
      {!meetingIsFuture(day, time) && <p>Выбери время, которое ещё не прошло.</p>}
      <button className="btn" disabled={!meetingIsFuture(day, time)} onClick={() => onSend({ place, day, time, at: meetingDate(day, time).toISOString(), note: note.trim() })}>Отправить в чат</button>
    </Sheet>
  )
}
