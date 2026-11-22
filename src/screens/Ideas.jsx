// Вкладка «Идеи» — полезные инициативы учеников.
// Идею можно поддержать голосом и записаться участником.
// Набрала нужное число голосов — уходит администрации, и школа отвечает прямо здесь.
// Перед публикацией ИИ-помощник проверяет, нет ли уже такой же идеи (чтобы не было сто одинаковых).
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Sheet from '../components/Sheet.jsx'
import { people, IDEA_TAGS } from '../data/demo.js'
import { findSimilar, checkNew } from '../logic/moderation.js'
import { ThumbsUp, UsersRound } from 'lucide-react'

const tagColor = { 'Школа': '#3390EC', 'Двор': '#F2994A', 'Досуг': '#9B51E0', 'Добро': '#EB5757', 'Учёба': '#27AE60' }

export default function Ideas({ user, ideas, onSupport, onJoin, onCreate, onReport, onAnswer, toast }) {
  const [tag, setTag] = useState('Все')
  const [open, setOpen] = useState(null)
  const [creating, setCreating] = useState(false)
  const [report, setReport] = useState(null)
  const [reason, setReason] = useState('')
  const [answer, setAnswer] = useState(null)

  const list = ideas
    .filter((i) => tag === 'Все' || (tag === 'Мои' ? i.own : i.tag === tag))
    .sort((a, b) => (a.status === 'done') - (b.status === 'done'))

  return (
    <>
      <div className="topbar"><h1>Идеи</h1></div>
      <div className="scroll" style={{ paddingBottom: 90 }}>
        <div className="intro-card">
          <Icon name="bulb" />
          <span>Предложи, как сделать школу лучше. В демо после <b>30 голосов</b> идея получает статус «на рассмотрении». Реальной отправки администрации нет.</span>
        </div>
        <div className="chips scroll-x">
          {['Все', 'Мои', ...IDEA_TAGS].map((t) => <button key={t} className={'chip' + (tag === t ? ' on' : '')} onClick={() => setTag(t)}>{t}</button>)}
        </div>
        {list.length === 0 && <p className="muted-line">{tag === 'Мои' ? 'Ты ещё ничего не предлагал. Нажми «+», чтобы предложить идею.' : 'Здесь пока пусто.'}</p>}
        {list.map((i) => <IdeaCard key={i.id} i={i} user={user} onOpen={() => setOpen(i.id)} onSupport={onSupport} onJoin={onJoin} />)}
      </div>
      <button className="fab" aria-label="Предложить идею" onClick={() => setCreating(true)}><Icon name="plus" /></button>

      {open && (() => {
        const i = ideas.find((x) => x.id === open)
        return (
          <Sheet onClose={() => setOpen(null)} title={i.title}>
            <span className="tag" style={{ background: tagColor[i.tag] }}>{i.tag}</span>
            <p style={{ color: 'var(--text)' }}>{i.desc}</p>
            <p>Автор: {i.own ? 'ты' : people[i.author]?.nick || i.author} · {i.time}</p>
            {i.answer && <div className="answer"><b>Ответ школы</b>{i.answer}</div>}
            <IdeaButtons i={i} user={user} onSupport={onSupport} onJoin={onJoin} />
            {user.role === 'teacher' && i.status === 'sent' && <button className="btn" onClick={() => { setAnswer({ id: i.id, text: '' }); setOpen(null) }}>Ответить от школы (демо)</button>}
            {!i.own && <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={() => { setReport(i.id); setOpen(null); setReason('') }}>Пожаловаться на идею</button>}
          </Sheet>
        )
      })()}

      {creating && <IdeaForm ideas={ideas} onClose={() => setCreating(false)}
        onSupportOther={(id) => { const idea = ideas.find((item) => item.id === id); onSupport(id, true); setCreating(false); setOpen(id); toast(idea?.own ? 'Это твоя идея' : idea?.status ? 'Голосование уже завершено' : 'Идея открыта') }}
        onSend={(idea) => { onCreate(idea); setCreating(false); setTag('Мои'); toast('Идея опубликована! Расскажи о ней в чате, чтобы собрать голоса') }} />}
      {report && <Sheet title="Пожаловаться на идею" onClose={() => setReport(null)}><p>Что случилось? В прототипе идея скроется только на этом устройстве; жалоба никому не отправляется.</p><textarea className="sheet-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина жалобы" maxLength={300} /><button className="btn" disabled={!reason.trim()} onClick={() => { onReport(report); setReport(null); toast('Идея скрыта на этом устройстве') }}>Скрыть и подтвердить</button></Sheet>}
      {answer && <Sheet title="Ответ школы — демонстрация" onClose={() => setAnswer(null)}><textarea className="sheet-input" value={answer.text} onChange={(e) => setAnswer({ ...answer, text: e.target.value })} placeholder="Текст ответа" maxLength={300} /><button className="btn" disabled={!answer.text.trim()} onClick={() => { onAnswer(answer.id, answer.text.trim()); setAnswer(null); toast('Демо-ответ сохранён') }}>Сохранить ответ</button></Sheet>}
    </>
  )
}

function Progress({ i }) {
  const sup = i.supports + (i.supported ? 1 : 0)
  const pct = Math.min(100, Math.round((sup / i.goal) * 100))
  return (
    <div className="progress">
      <div className="bar"><i style={{ width: pct + '%' }} /></div>
      <span>{i.status === 'done' ? 'Демо-ответ школы' : i.status === 'sent' ? 'На рассмотрении · демо' : `${sup} из ${i.goal} голосов`}</span>
    </div>
  )
}

function IdeaButtons({ i, user, onSupport, onJoin }) {
  const sup = i.supports + (i.supported ? 1 : 0)
  if (i.status === 'done') return null
  return (
    <div className="idea-btns">
      <button className={'mini-btn' + (i.supported ? ' on' : '')} disabled={i.own || !!i.status} onClick={(e) => { e.stopPropagation(); onSupport(i.id) }}>
        <ThumbsUp size={16} aria-hidden="true" /> {i.own ? sup : i.supported ? `Поддержал · ${sup}` : `Поддержать · ${sup}`}
      </button>
      {i.needPeople && user.role !== 'teacher' && (
        <button className={'mini-btn' + (i.joinedMe ? ' on' : '')} onClick={(e) => { e.stopPropagation(); onJoin(i.id) }}>
          <UsersRound size={16} aria-hidden="true" /> Участвую · {i.joined + (i.joinedMe ? 1 : 0)}
        </button>
      )}
    </div>
  )
}

function IdeaCard({ i, user, onOpen, onSupport, onJoin }) {
  return (
    <div className={'idea-card' + (i.status === 'done' ? ' done' : '')} onClick={onOpen} role="button">
      <div className="idea-top">
        <span className="tag" style={{ background: tagColor[i.tag] }}>{i.tag}</span>
        {i.status === 'sent' && <span className="pill">📨 На рассмотрении · демо</span>}
        {i.status === 'done' && <span className="pill ok">✓ Сделано</span>}
        {i.own && <span className="pill">Твоя идея</span>}
      </div>
      <b className="idea-title">{i.title}</b>
      <p className="idea-desc">{i.desc}</p>
      <span className="idea-author">{i.own ? 'ты' : people[i.author]?.nick || i.author} · {i.time}</span>
      <Progress i={i} />
      <IdeaButtons i={i} user={user} onSupport={onSupport} onJoin={onJoin} />
    </div>
  )
}

// ---------- новая идея + проверка ИИ-помощником ----------
function IdeaForm({ ideas, onClose, onSend, onSupportOther }) {
  const [f, setF] = useState({ title: '', desc: '', tag: 'Школа', needPeople: false })
  const [check, setCheck] = useState(null) // результат проверки: { similar, notes }
  const [difference, setDifference] = useState('')
  const set = (k, v) => { setF({ ...f, [k]: v }); setCheck(null) }

  const runCheck = () => {
    const similar = findSimilar(f.title, `${f.title} ${f.desc}`, ideas.filter((i) => i.status !== 'done').map((i) => ({ id: i.id, title: i.title, text: `${i.title} ${i.desc}` })))
    const notes = checkNew(f.title, f.desc)
    if (!similar && notes.length === 0) return onSend(f)
    setCheck({ similar, notes })
  }
  const blocked = check?.notes.length > 0

  return (
    <Sheet onClose={onClose} title="Новая идея" tall>
      <input className="sheet-input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Коротко: что предлагаешь?" maxLength={60} />
      <textarea className="sheet-input" rows={3} value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Подробнее: зачем это и что нужно сделать" maxLength={240} />
      <div className="chips">{IDEA_TAGS.map((t) => <button key={t} className={'chip' + (f.tag === t ? ' on' : '')} onClick={() => set('tag', t)}>{t}</button>)}</div>
      <button className="row plain" onClick={() => set('needPeople', !f.needPeople)}>
        <span className="rt">Нужны участники<small>Ребята смогут нажать «Участвую»</small></span><span className={'toggle' + (f.needPeople ? ' on' : '')} />
      </button>

      {check && (
        <div className="ai-box">
          <b>Проверка похожих идей</b>
          {check.notes.map((n) => <span key={n}>• {n}</span>)}
          {check.similar && (
            <>
              <span>Похожая идея уже есть: «{check.similar.title}». Если поддержать её, голоса не разделятся и у идеи будет больше шансов.</span>
              <button className="btn" onClick={() => onSupportOther(check.similar.id)}>Поддержать похожую</button>
              {!blocked && <><input className="sheet-input" value={difference} onChange={(e) => setDifference(e.target.value)} placeholder="Чем твоя идея отличается?" maxLength={100} /><button className="btn ghost" disabled={difference.trim().length < 4} onClick={() => onSend({ ...f, desc: [f.desc, difference].filter(Boolean).join(' · ') })}>У меня другое — опубликовать</button></>}
            </>
          )}
          <small>В прототипе похожие идеи ищет простой алгоритм по словам. Решение за тобой.</small>
        </div>
      )}
      {!check?.similar && <button className="btn" disabled={f.title.trim().length < 4 || blocked} onClick={runCheck}>Опубликовать</button>}
    </Sheet>
  )
}
