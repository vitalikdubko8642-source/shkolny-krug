// Сценарий новенького: короткая экскурсия по школе + знакомство с ребятами с похожими интересами.
// Показывается сразу после регистрации, если отметить «Я новенький». Потом — в «Профиль → Гид по школе».
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Avatar, { Nick } from '../components/Avatar.jsx'
import { people, tour } from '../data/demo.js'
import { commonInterests } from './Friends.jsx'

export default function Tour({ user, personState, onRequest, onDone, onFriends, fromProfile }) {
  const [step, setStep] = useState(0)

  // Кого предложить: сначала одноклассники с общими интересами, потом остальные
  const suggest = Object.values(people)
    .filter((p) => p.cls && p.nick !== user.nick)
    .map((p) => ({ p, common: commonInterests(user, p), sameClass: p.cls === user.cls }))
    .filter((x) => x.common.length || x.sameClass)
    .sort((a, b) => b.sameClass - a.sameClass || b.common.length - a.common.length)
    .slice(0, 4)

  const steps = [
    {
      icon: '👋', title: `Привет, ${user.nick}!`,
      body: <p>Новая школа — это нормально, что пока ничего не понятно. За минуту покажем, где что находится и с кем можно познакомиться.</p>,
    },
    {
      icon: '🏫', title: 'Школа по этажам',
      body: (
        <div className="tour-floors">
          {tour.filter((f) => f.title !== 'Двор').map((f) => (
            <div key={f.title} className="tour-floor"><b>{f.title}</b>{f.items.map((i) => <span key={i}>{i}</span>)}</div>
          ))}
          <p className="sheet-note">План условный: школа в «Окле» ещё строится.</p>
        </div>
      ),
    },
    {
      icon: '🌳', title: 'Школьный двор',
      body: (
        <div className="tour-floors">
          <div className="tour-floor"><b>Двор</b>{tour.find((f) => f.title === 'Двор').items.map((i) => <span key={i}>{i}</span>)}</div>
          <p>Позвать на встречу к объекту во дворе можно кнопкой «+» в чате. Место и внешний вид ещё выбираются.</p>
        </div>
      ),
    },
    {
      icon: '💬', title: 'Куда писать',
      body: (
        <div className="tour-floors">
          <div className="tour-tip"><Icon name="chat" /><span><b>«Новенькие»</b> — спроси что угодно, тут все такие же.</span></div>
          <div className="tour-tip"><Icon name="users" /><span><b>Чат класса</b> — домашка, расписание, новости класса.</span></div>
          <div className="tour-tip"><Icon name="bolt" /><span><b>«События» → «Сообщить»</b> — если что-то сломалось или случилось.</span></div>
          <div className="tour-tip"><Icon name="flag" /><span>Если кто-то задел — нажми на сообщение и пожалуйся.</span></div>
        </div>
      ),
    },
    {
      icon: '🤝', title: 'С кем познакомиться',
      body: (
        <div className="tour-people">
          {suggest.length === 0 && <p>Добавь интересы в профиле — и мы подберём ребят.</p>}
          {suggest.map(({ p, common, sameClass }) => {
            const st = personState(p.nick)
            return (
              <div key={p.nick} className="person-row flat">
                <Avatar p={p} />
                <div className="pr-body">
                  <b><Nick p={p} /></b>
                  <span>{p.cls}{sameClass && ' · твой класс'}{common.length > 0 && <> · <em>{common.join(', ')}</em></>}</span>
                </div>
                {st === 'incoming' ? <button className="mini-btn on" onClick={onFriends}>Ответить</button> : st ? <span className="pending">{st === 'friend' ? 'друзья' : st === 'blocked' ? 'заблокирован' : 'запрос отправлен'}</span>
                  : <button className="mini-btn on" onClick={() => onRequest(p.nick)}>Запрос</button>}
              </div>
            )
          })}
          <p className="sheet-note">Переписка начнётся, только когда человек примет запрос.</p>
        </div>
      ),
    },
  ]
  const s = steps[step]
  const last = step === steps.length - 1

  return (
    <>
      <div className="topbar">
        {step > 0 ? <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Назад"><Icon name="back" /></button> : <span style={{ width: 36 }} />}
        <h1>Гид по школе</h1>
        <button className="link" onClick={onDone}>{fromProfile ? 'Закрыть' : 'Пропустить'}</button>
      </div>
      <div className="scroll">
        <div className="tour">
          <div className="dots">{steps.map((_, i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
          <div className="tour-icon">{s.icon}</div>
          <h2>{s.title}</h2>
          {s.body}
          <div className="spacer" />
          <button className="btn" onClick={() => (last ? onDone() : setStep(step + 1))}>{last ? 'Готово' : 'Дальше'}</button>
        </div>
      </div>
    </>
  )
}
