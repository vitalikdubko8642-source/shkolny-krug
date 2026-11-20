// Вкладка «Идеи» — полезные инициативы учеников.
// Идею можно поддержать голосом и записаться участником.
// Набрала нужное число голосов — уходит администрации, и школа отвечает прямо здесь.
// Перед публикацией ИИ-помощник проверяет, нет ли уже такой же идеи (чтобы не было сто одинаковых).
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Sheet from '../components/Sheet.jsx'
import { people, IDEA_TAGS } from '../data/demo.js'
import { findSimilar, checkNew } from '../logic/moderation.js'

const tagColor = { 'Школа': '#3390EC', 'Двор': '#F2994A', 'Досуг': '#9B51E0', 'Добро': '#EB5757', 'Учёба': '#27AE60' }

export default function Ideas({ user, ideas, onSupport, onJoin, onCreate, onReport, toast }) {
  const [tag, setTag] = useState('Все')
  const [open, setOpen] = useState(null)
  const [creating, setCreating] = useState(false)

  const list = ideas
    .filter((i) => tag === 'Все' || (tag === 'Мои' ? i.own : i.tag === tag))
    .sort((a, b) => (a.status === 'done') - (b.status === 'done'))

  return (
    <>
      <div className="topbar"><h1>Идеи</h1></div>
      <div className="scroll" style={{ paddingBottom: 90 }}>
        <div className="intro-card">
          <Icon name="bulb" />
          <span>Предложи, как сделать школу лучше. Набрала <b>30 голосов</b> — идея уходит администрации, и школа отвечает здесь же.</span>
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
            {!i.own && <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={() => { onReport(i.id); setOpen(null); toast('Жалоба отправлена модератору') }}>Пожаловаться на идею</button>}
          </Sheet>
        )
      })()}

      {creating && <IdeaForm ideas={ideas} onClose={() => setCreating(false)}
        onSupportOther={(id) => { onSupport(id, true); setCreating(false); setOpen(id); toast('Голос отдан похожей идее — так у неё больше шансов') }}
        onSend={(idea) => { onCreate(idea); setCreating(false); setTag('Мои'); toast('Идея опубликована! Расскажи о ней в чате, чтобы собрать голоса') }} />}
    </>
  )
}

function Progress({ i }) {
  const sup = i.supports + (i.supported ? 1 : 0)
  const pct = Math.min(100, Math.round((sup / i.goal) * 100))
  return (
    <div className="progress">
      <div className="bar"><i style={{ width: pct + '%' }} /></div>
      <span>{i.status === 'done' ? 'Сделано' : i.status === 'sent' ? 'Передано администрации' : `${sup} из ${i.goal} голосов`}</span>
    </div>
  )
}

function IdeaButtons({ i, user, onSupport, onJoin }) {
  const sup = i.supports + (i.supported ? 1 : 0)
  if (i.status === 'done') return null
  return (
    <div className="idea-btns">
      <button className={'mini-btn' + (i.supported ? ' on' : '')} disabled={i.own} onClick={(e) => { e.stopPropagation(); onSupport(i.id) }}>
        {i.own ? `👍 ${sup}` : i.supported ? `👍 Поддержал · ${sup}` : `👍 Поддержать · ${sup}`}
      </button>
      {i.needPeople && user.role !== 'teacher' && (
        <button className={'mini-btn' + (i.joinedMe ? ' on' : '')} onClick={(e) => { e.stopPropagation(); onJoin(i.id) }}>
          {i.joinedMe ? '✓ Участвую' : 'Участвую'} · {i.joined + (i.joinedMe ? 1 : 0)}
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
        {i.status === 'sent' && <span className="pill">📨 У администрации</span>}
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
          <b>🤖 ИИ-помощник</b>
          {check.notes.map((n) => <span key={n}>• {n}</span>)}
          {check.similar && (
            <>
              <span>Похожая идея уже есть: «{check.similar.title}». Если поддержать её, голоса не разделятся и у идеи будет больше шансов.</span>
              <button className="btn" onClick={() => onSupportOther(check.similar.id)}>Поддержать похожую</button>
              {!blocked && <button className="btn ghost" onClick={() => onSend(f)}>У меня другое — опубликовать</button>}
            </>
          )}
          <small>ИИ только подсказывает. Решение за тобой, а спорные случаи смотрит модератор.</small>
        </div>
      )}
      {!check?.similar && <button className="btn" disabled={f.title.trim().length < 4 || blocked} onClick={runCheck}>Опубликовать</button>}
    </Sheet>
  )
}
