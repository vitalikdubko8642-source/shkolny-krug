// Вкладка «Друзья»: найти ребят с похожими интересами и начать переписку.
// Личка работает только по согласию: ты отправляешь запрос — человек принимает или отклоняет.
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Avatar, { Nick } from '../components/Avatar.jsx'
import PersonSheet from '../components/PersonSheet.jsx'
import { people } from '../data/demo.js'

export const commonInterests = (a, b) => (a.interests || []).filter((i) => (b.interests || []).includes(i))

export default function Friends({ user, friends, outgoing, incoming, blocked, onRequest, onAccept, onDecline, onOpenDm }) {
  const [seg, setSeg] = useState(incoming.length ? 'requests' : 'match')
  const [filter, setFilter] = useState('Все')
  const [person, setPerson] = useState(null)

  if (user.role === 'teacher') {
    return (
      <>
        <div className="topbar"><h1>Друзья</h1></div>
        <div className="scroll"><div className="empty"><Icon name="shield" /><b>Раздел для учеников</b><span>Здесь ученики находят друзей по интересам. Учителям он не нужен — и так спокойнее для ребят.</span></div></div>
      </>
    )
  }

  const stateOf = (nick) => friends.includes(nick) ? 'friend' : outgoing.includes(nick) ? 'pending' : incoming.some((r) => r.nick === nick) ? 'incoming' : null
  const others = Object.values(people).filter((p) => p.cls && p.nick !== user.nick && !blocked.includes(p.nick))
  const allTags = [...new Set(others.flatMap((p) => p.interests))]
  const tags = ['Все', ...(user.interests || []), ...allTags.filter((t) => !(user.interests || []).includes(t))]
  const matches = others
    .map((p) => ({ p, common: commonInterests(user, p), sameClass: p.cls === user.cls }))
    .filter((x) => filter === 'Все' || x.p.interests.includes(filter))
    .sort((a, b) => b.common.length - a.common.length || b.sameClass - a.sameClass)

  const Row = ({ p, sub, right }) => (
    <div className="person-row" onClick={() => setPerson(p)} role="button">
      <Avatar p={p} />
      <div className="pr-body">
        <b><Nick p={p} /></b>
        <span>{sub}</span>
      </div>
      {right}
    </div>
  )

  const action = (p) => {
    const st = stateOf(p.nick)
    if (st === 'friend') return <button className="mini-btn" onClick={(e) => { e.stopPropagation(); onOpenDm(p.nick) }}>Написать</button>
    if (st === 'pending') return <span className="pending">ждём ответа</span>
    if (st === 'incoming') return <span className="pending">прислал запрос</span>
    return <button className="mini-btn on" onClick={(e) => { e.stopPropagation(); onRequest(p.nick) }}>Запрос</button>
  }

  return (
    <>
      <div className="topbar"><h1>Друзья</h1></div>
      <div className="seg" style={{ margin: '10px 12px 6px' }}>
        <button className={seg === 'match' ? 'on' : ''} onClick={() => setSeg('match')}>Подбор</button>
        <button className={seg === 'requests' ? 'on' : ''} onClick={() => setSeg('requests')}>Запросы{incoming.length > 0 && <span className="seg-badge">{incoming.length}</span>}</button>
        <button className={seg === 'friends' ? 'on' : ''} onClick={() => setSeg('friends')}>Мои{friends.length > 0 && ` · ${friends.length}`}</button>
      </div>
      <div className="scroll" style={{ paddingBottom: 20 }}>
        {seg === 'match' && (
          <>
            {!(user.interests || []).length && <p className="muted-line">Добавь интересы в профиле — тогда подбор станет точнее.</p>}
            <div className="chips scroll-x">{tags.map((t) => <button key={t} className={'chip' + (filter === t ? ' on' : '')} onClick={() => setFilter(t)}>{t}</button>)}</div>
            {matches.map(({ p, common, sameClass }) => (
              <Row key={p.nick} p={p}
                sub={<>{p.cls}{sameClass && ' · твой класс'}{common.length > 0 && <> · <em>общее: {common.join(', ')}</em></>}</>}
                right={action(p)} />
            ))}
          </>
        )}

        {seg === 'requests' && (
          <>
            {incoming.length === 0 && outgoing.length === 0 && <div className="empty"><Icon name="mail" /><b>Запросов нет</b><span>Когда кто-то захочет тебе написать, запрос появится здесь. Ты решаешь, принять его или нет.</span></div>}
            {incoming.length > 0 && <p className="group-title">Хотят с тобой переписываться</p>}
            {incoming.map((r) => {
              const p = people[r.nick]
              return (
                <div key={r.nick} className="request-card">
                  <div className="rq-top" onClick={() => setPerson(p)} role="button">
                    <Avatar p={p} size="sm" />
                    <div><b><Nick p={p} /></b><span>{p.cls} · {r.time}</span></div>
                  </div>
                  {r.text && <p className="rq-text">«{r.text}»</p>}
                  {commonInterests(user, p).length > 0 && <p className="rq-common">Общие интересы: {commonInterests(user, p).join(', ')}</p>}
                  <div className="rq-btns">
                    <button className="btn" onClick={() => onAccept(r.nick)}>Принять</button>
                    <button className="btn ghost" onClick={() => onDecline(r.nick)}>Отклонить</button>
                  </div>
                </div>
              )
            })}
            {outgoing.length > 0 && <p className="group-title">Ты отправил запрос</p>}
            {outgoing.map((nick) => <Row key={nick} p={people[nick]} sub="ждём, пока примет" right={<span className="pending">⏳</span>} />)}
            <p className="group-note" style={{ marginTop: 10 }}>Если отклонить запрос, человек не получит уведомления об этом. Кто может присылать запросы — в «Профиль → Конфиденциальность».</p>
          </>
        )}

        {seg === 'friends' && (
          <>
            {friends.length === 0 && <div className="empty"><Icon name="friends" /><b>Пока никого</b><span>Найди ребят с общими интересами во вкладке «Подбор» и отправь запрос.</span></div>}
            {friends.map((nick) => <Row key={nick} p={people[nick]} sub={people[nick].status || people[nick].cls} right={action(people[nick])} />)}
          </>
        )}
      </div>

      {person && (
        <PersonSheet person={person} state={stateOf(person.nick)} common={commonInterests(user, person)}
          onClose={() => setPerson(null)}
          onRequest={() => { onRequest(person.nick); setPerson(null) }}
          onOpenDm={() => { setPerson(null); onOpenDm(person.nick) }} />
      )}
    </>
  )
}
