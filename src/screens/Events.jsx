// Вкладка «События»:
// • «Срочно в школе» — быстро сообщить всем о проблеме (не работает туалет, нет воды…)
// • «Мероприятия» — их создают учителя, ученики записываются зрителем или участником
// • «Встречи» — договориться встретиться у МАФа или в другом месте (встреча уходит в чат)
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Sheet from '../components/Sheet.jsx'
import { teachers, people, ALERT_PRESETS, PLACES, MEET_PLACES, MAF_PLACE } from '../data/demo.js'
import { meetingDate, meetingIsFuture, meetingLabel } from '../logic/meeting.js'
import AiSheet from '../components/AiSheet.jsx'

const KINDS = ['Спорт', 'Культура', 'Учёба', 'Двор', 'Праздник']
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const WEEK = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const TIMES = ['13:30', '14:30', '15:00', '16:00', '17:00']
const kindColor = { 'Спорт': '#2F80ED', 'Культура': '#BB6BD9', 'Учёба': '#27AE60', 'Двор': '#F2994A', 'Праздник': '#EB5757' }

const plural = (n, a, b, c) => {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c
}

export default function Events({ user, events, alerts, meets, groups, onEvent, onCreateEvent, onUpdateEvent, onDeleteEvent, onAlert, onAlertAct, onCreateMeet, onMeetGo, onOpenChat, toast }) {
  const isTeacher = user.role === 'teacher'
  const [seg, setSeg] = useState('events')
  const [open, setOpen] = useState(null)      // открытое мероприятие
  const [sheet, setSheet] = useState(null)    // 'alert' | 'meet' | 'event'
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [reportAlert, setReportAlert] = useState(null)
  const [reportReason, setReportReason] = useState('')

  const active = alerts.filter((a) => !a.resolved)

  return (
    <>
      <div className="topbar"><h1>События</h1></div>
      <div className="scroll" style={{ paddingBottom: 90 }}>
        {/* ----- Срочно ----- */}
        <div className="urgent-head">
          <span><Icon name="bolt" /> Срочно в школе</span>
          <button className="mini-btn" onClick={() => setSheet('alert')}>Сообщить</button>
        </div>
        {active.length === 0 && <p className="muted-line">Сейчас всё в порядке 👌</p>}
        {active.map((a) => (
          <div key={a.id} className="alert-card">
            <div className="alert-text">{a.text}</div>
            <div className="alert-meta">{a.place} · {a.time} · {a.own ? 'ты' : people[a.from]?.nick || a.from}</div>
            <div className="alert-acts">
              <button disabled={a.own} className={a.confirmed ? 'on' : ''} onClick={() => onAlertAct(a.id, 'confirm')}>
                {a.confirmed ? '✓ Тоже вижу' : 'Тоже вижу'} · {a.confirms + (a.confirmed ? 1 : 0)}
              </button>
              <button onClick={() => onAlertAct(a.id, 'resolve')}>{a.own ? 'Уже исправили' : `${a.resolveVoted ? '✓ ' : ''}Исправили · ${(a.resolveVotes || 0) + (a.resolveVoted ? 1 : 0)}/3`}</button>
              {!a.own && <button aria-label="Пожаловаться на сообщение" onClick={() => { setReportAlert(a.id); setReportReason('') }}>Жалоба</button>}
            </div>
          </div>
        ))}

        <div className="seg" style={{ margin: '14px 12px 10px' }}>
          <button className={seg === 'events' ? 'on' : ''} onClick={() => setSeg('events')}>Мероприятия</button>
          {!isTeacher && <button className={seg === 'meets' ? 'on' : ''} onClick={() => setSeg('meets')}>Встречи</button>}
        </div>

        {/* ----- Мероприятия ----- */}
        {seg === 'events' && (
          <>
            {!isTeacher && <p className="muted-line">Мероприятия создают учителя. Есть своя идея — предложи её во вкладке «Идеи».</p>}
            {isTeacher && <button className="btn add-wide" onClick={() => setSheet('event')}><Icon name="plus" /> Создать мероприятие</button>}
            {events.map((e) => {
              const sp = e.spectators + (e.me === 'spectator' ? 1 : 0)
              const pa = e.participants + (e.me === 'participant' ? 1 : 0)
              return (
              <button key={e.id} className="event-card" style={{ '--event-color': kindColor[e.kind] }} onClick={() => setOpen(e)}>
                <div className="date-box">
                  <b>{e.day}</b><span>{e.month}</span>
                </div>
                <div className="ev-body">
                  <span className="ev-kind">{e.kind}</span>
                  <b>{e.title}</b>
                  <span className="ev-line">{e.weekday}, {e.time} · {e.place}</span>
                  <span className="ev-line">
                    {!e.onlyJoin && `${sp} ${plural(sp, 'зритель', 'зрителя', 'зрителей')}`}
                    {!e.onlyJoin && e.allowJoin && ' · '}
                    {e.allowJoin && `${pa} ${plural(pa, 'участник', 'участника', 'участников')}`}
                  </span>
                </div>
                {e.me && <span className="ev-me">{e.me === 'spectator' ? 'Зритель' : 'Участник'}</span>}
              </button>
              )
            })}
          </>
        )}

        {/* ----- Встречи ----- */}
        {!isTeacher && seg === 'meets' && (
          <>
            {!isTeacher && <button className="btn add-wide" onClick={() => setSheet('meet')}><Icon name="pin" /> Договориться о встрече</button>}
            <p className="muted-line">Встреча отправляется в выбранный чат. Самое удобное место — {MAF_PLACE.toLowerCase()}: там можно сесть и укрыться от дождя.</p>
            {meets.length === 0 && <p className="muted-line">Пока никто не встречается.</p>}
            {meets.map((x) => (
              <div key={x.msgId} className="meet-row">
                <div className="mr-icon"><Icon name="pin" /></div>
                <div className="mr-body">
                  <b>{x.meet.place}</b>
                  <span>{meetingLabel(x.meet)}{x.meet.note ? ` · ${x.meet.note}` : ''}{x.meet.at && new Date(x.meet.at) <= new Date() ? ' · прошла' : ''}</span>
                  <span>в чате «{x.chatTitle}» · идут {x.meet.going + (x.meet.me ? 1 : 0)}</span>
                </div>
                <div className="mr-acts">
                  {!x.own && x.meet.at && new Date(x.meet.at) > new Date() && <button className={'mini-btn' + (x.meet.me ? ' on' : '')} onClick={() => onMeetGo(x.chatId, x.msgId)}>{x.meet.me ? 'Иду ✓' : 'Я иду'}</button>}
                  {!isTeacher && <button className="link" onClick={() => onOpenChat(x.chatId)}>в чат</button>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {open && <EventSheet e={events.find((x) => x.id === open.id)} isTeacher={isTeacher} onEvent={onEvent} onClose={() => setOpen(null)} onEdit={() => { setEditing(open); setOpen(null) }} onDelete={() => { setDeleting(open); setOpen(null) }} />}
      {sheet === 'alert' && <AlertSheet onClose={() => setSheet(null)} onSend={(a) => { onAlert(a); setSheet(null); toast('Тестовое сообщение сохранено только в этом браузере') }} />}
      {sheet === 'meet' && <MeetSheet groups={groups} onClose={() => setSheet(null)} onSend={(m) => { onCreateMeet(m); setSheet(null); toast(`Встреча отправлена в «${groups.find((g) => g.id === m.chatId).title}»`) }} />}
      {sheet === 'event' && <EventForm user={user} onClose={() => setSheet(null)} onSend={(e) => { onCreateEvent(e); setSheet(null); toast('Мероприятие опубликовано — ученики увидят его во вкладке «События»') }} />}
      {editing && <EventForm initial={editing} onClose={() => setEditing(null)} onSend={(e) => { onUpdateEvent(editing.id, e); setEditing(null); toast('Мероприятие обновлено в этом браузере') }} />}
      {deleting && <Sheet title="Удалить мероприятие?" onClose={() => setDeleting(null)}><p>Это удалит демонстрационную карточку на этом устройстве.</p><button className="btn danger" onClick={() => { onDeleteEvent(deleting.id); setDeleting(null) }}>Удалить</button><button className="btn ghost" onClick={() => setDeleting(null)}>Отмена</button></Sheet>}
      {reportAlert && <Sheet title="Жалоба на сообщение" onClose={() => setReportAlert(null)}><p>Это демонстрация: сообщение скроется на твоём устройстве, жалоба никуда не отправится.</p><textarea className="sheet-input" placeholder="Причина жалобы" value={reportReason} onChange={(e) => setReportReason(e.target.value)} maxLength={300} /><button className="btn" disabled={!reportReason.trim()} onClick={() => { onAlertAct(reportAlert, 'report'); setReportAlert(null); toast('Скрыто на этом устройстве') }}>Подтвердить</button></Sheet>}
    </>
  )
}

// ---------- карточка мероприятия ----------
function EventSheet({ e, isTeacher, onEvent, onClose, onEdit, onDelete }) {
  const full = e.maxParticipants && e.participants >= e.maxParticipants && e.me !== 'participant'
  return (
    <Sheet onClose={onClose} title={e.title}>
      <div className="ev-detail">
        <span><Icon name="calendar" /> {e.weekday}, {e.day} {e.month}, {e.time}</span>
        <span><Icon name="pin" /> {e.place}</span>
        <span><Icon name="user" /> {isTeacher && e.mine ? 'Вы (демо)' : teachers[e.by] || e.by}</span>
      </div>
      <p style={{ color: 'var(--text)' }}>{e.desc}</p>
      {isTeacher ? (
        <><p>Записались: {e.spectators} {plural(e.spectators, 'зритель', 'зрителя', 'зрителей')}{e.allowJoin && `, ${e.participants} ${plural(e.participants, 'участник', 'участника', 'участников')}`}.</p>{e.mine && <><button className="btn" onClick={onEdit}>Изменить</button><button className="btn ghost" onClick={onDelete}>Удалить</button></>}</>
      ) : e.me ? (
        <>
          <p>Ты записан как {e.me === 'spectator' ? 'зритель' : 'участник'}. В прототипе запись сохраняется только в этом браузере, напоминания пока не отправляются.</p>
          <button className="btn ghost" onClick={() => onEvent(e.id, null)}>Отменить запись</button>
        </>
      ) : (
        <>
          {!e.onlyJoin && <button className="btn" onClick={() => onEvent(e.id, 'spectator')}>Буду зрителем</button>}
          {e.allowJoin && (
            <button className={'btn' + (e.onlyJoin ? '' : ' ghost')} disabled={full} onClick={() => onEvent(e.id, 'participant')}>
              {full ? 'Мест для участников нет' : e.onlyJoin ? 'Участвую' : 'Хочу участвовать'}
            </button>
          )}
          {e.maxParticipants > 0 && !full && <p className="sheet-note">Мест для участников: {e.maxParticipants - e.participants} из {e.maxParticipants}</p>}
        </>
      )}
    </Sheet>
  )
}

// ---------- «Сообщить о проблеме» ----------
function AlertSheet({ onClose, onSend }) {
  const [text, setText] = useState('')
  const [place, setPlace] = useState(null)
  const [showAi, setShowAi] = useState(false)
  const [verdict, setVerdict] = useState(null)
  const [reviewed, setReviewed] = useState(false)
  const ok = text.trim().length >= 4 && place
  const emergency = /пожар|горит|дым|эвакуац|взрыв|драка|нападен|плохо человеку|без сознания/i.test(text)
  const checked = verdict && verdict.text === text && verdict.place === place ? verdict.decision : null
  return (
    <Sheet onClose={onClose} title="Сообщить всем">
      <p>Это демонстрация: сообщение не отправляется ученикам или администрации. При опасности немедленно обратись к взрослому или в экстренные службы.</p>
      <div className="chips">
        {ALERT_PRESETS.map((p) => <button key={p} className={'chip' + (text === p ? ' on' : '')} onClick={() => { setText(p); setReviewed(false) }}>{p}</button>)}
      </div>
      <input className="sheet-input" value={text} onChange={(e) => { setText(e.target.value); setReviewed(false) }} placeholder="Или напиши своими словами" maxLength={80} />
      {emergency && <p className="err">При возможной опасности немедленно обратись к взрослому или позвони 112. Прототип не передаёт тревоги и не вызывает помощь.</p>}
      <p>Где?</p>
      <div className="chips">
        {PLACES.map((p) => <button key={p} className={'chip' + (place === p ? ' on' : '')} onClick={() => { setPlace(p); setReviewed(false) }}>{p}</button>)}
      </div>
      {checked && <><p className={checked === 'allow' ? 'fine' : 'err'}>{checked === 'allow' ? 'ИИ рекомендует сохранить сообщение. Решение принимает человек.' : checked === 'urgent' ? 'Возможна чрезвычайная ситуация. Обратись к взрослому или позвони 112 — приложение никого не уведомляет.' : 'ИИ не распознал сообщение как проблему школы и рекомендует не сохранять его. Решение принимает человек.'}</p><p className="fine">Это только проверка на этом устройстве: настоящего кабинета модератора и общей публикации пока нет.</p><label className="check"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> Я проверил сообщение и хочу сохранить его в демо</label></>}
      <button className="btn" disabled={!ok || emergency || !checked || !reviewed} onClick={() => onSend({ text: text.trim(), place })}>Сохранить демо-сообщение</button>
      <button className="btn ghost" disabled={!ok} onClick={() => setShowAi(true)}>Проверить с ИИ</button>
      {showAi && <AiSheet task="alert" title="Проверка сообщения — демо" text={`${text} · ${place}`} onDecision={(decision) => { setVerdict({ decision, text, place }); setReviewed(false) }} onClose={() => setShowAi(false)} />}
    </Sheet>
  )
}

// ---------- «Договориться о встрече» ----------
function MeetSheet({ groups, onClose, onSend }) {
  const [place, setPlace] = useState(MAF_PLACE)
  const [day, setDay] = useState('Сегодня')
  const [time, setTime] = useState('15:00')
  const [chatId, setChatId] = useState(null)
  const [note, setNote] = useState('')
  return (
    <Sheet onClose={onClose} title="Встреча" tall>
      <p>Где</p>
      <div className="chips">{MEET_PLACES.map((p) => <button key={p} className={'chip' + (place === p ? ' on' : '')} onClick={() => setPlace(p)}>{p}</button>)}</div>
      <p>Когда</p>
      <div className="chips">
        {['Сегодня', 'Завтра'].map((d) => <button key={d} className={'chip' + (day === d ? ' on' : '')} onClick={() => setDay(d)}>{d}</button>)}
        <span className="chip-sep" />
        {TIMES.map((t) => <button key={t} className={'chip' + (time === t ? ' on' : '')} onClick={() => setTime(t)}>{t}</button>)}
      </div>
      <input className="sheet-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Зачем встречаемся? Например: репетиция" maxLength={40} />
      <p>В какой чат отправить</p>
      <div className="chips">{groups.map((g) => <button key={g.id} className={'chip' + (chatId === g.id ? ' on' : '')} onClick={() => setChatId(g.id)}>{g.title}</button>)}</div>
      {!meetingIsFuture(day, time) && <p>Выбери время, которое ещё не прошло.</p>}
      <button className="btn" disabled={!chatId || !meetingIsFuture(day, time)} onClick={() => onSend({ chatId, place, day, time, at: meetingDate(day, time).toISOString(), note: note.trim() })}>Позвать</button>
    </Sheet>
  )
}

// ---------- учитель создаёт мероприятие ----------
function EventForm({ initial, onClose, onSend }) {
  const [f, setF] = useState(initial ? { ...initial, date: initial.date || '', max: initial.maxParticipants || 10 } : { title: '', kind: 'Спорт', date: '', time: '15:00', place: '', desc: '', allowJoin: false, max: 10, onlyJoin: false })
  const set = (k, v) => setF({ ...f, [k]: v })
  const eventTime = new Date(`${f.date}T${f.time}`)
  const ok = f.title.trim().length >= 4 && f.date && f.time && f.place.trim() && eventTime > new Date() && (!f.allowJoin || (Number.isInteger(Number(f.max)) && Number(f.max) >= 1 && Number(f.max) <= 200))
  const send = () => {
    const d = new Date(f.date + 'T12:00:00')
    onSend({
      title: f.title.trim(), kind: f.kind, date: f.date, day: d.getDate(), month: MONTHS[d.getMonth()], weekday: WEEK[d.getDay()],
      time: f.time, place: f.place.trim(), desc: f.desc.trim() || 'Подробности расскажем позже.',
      spectators: initial?.spectators || 0, participants: initial?.participants || 0, allowJoin: f.allowJoin, maxParticipants: f.allowJoin ? Number(f.max) || 0 : 0, mine: true,
    })
  }
  return (
    <Sheet onClose={onClose} title="Новое мероприятие" tall>
      <input className="sheet-input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Название: футбол 9Б против 9В" maxLength={50} />
      <div className="chips">{KINDS.map((k) => <button key={k} className={'chip' + (f.kind === k ? ' on' : '')} onClick={() => set('kind', k)}>{k}</button>)}</div>
      <div className="two">
        <label>Дата<input className="sheet-input" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></label>
        <label>Время<input className="sheet-input" type="time" value={f.time} onChange={(e) => set('time', e.target.value)} /></label>
      </div>
      <input className="sheet-input" value={f.place} onChange={(e) => set('place', e.target.value)} placeholder="Где: актовый зал" maxLength={40} />
      <textarea className="sheet-input" rows={3} value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Описание для учеников" maxLength={200} />
      <button className="row plain" onClick={() => set('allowJoin', !f.allowJoin)}>
        <span className="rt">Можно записаться участником</span><span className={'toggle' + (f.allowJoin ? ' on' : '')} />
      </button>
      {f.allowJoin && <label className="inline">Мест для участников <input className="sheet-input small" type="number" min="1" max="200" value={f.max} onChange={(e) => set('max', e.target.value)} /></label>}
      <button className="btn" disabled={!ok} onClick={send}>Опубликовать</button>
    </Sheet>
  )
}
