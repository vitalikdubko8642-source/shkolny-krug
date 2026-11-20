import { useState } from 'react'
import Icon from '../components/Icon.jsx'

export const INTERESTS = ['Музыка', 'Футбол', 'Рисование', 'Игры', 'Программирование', 'Танцы', 'Книги', 'Аниме', 'Баскетбол', 'Кино', 'Шахматы', 'Волонтёрство']
const COLORS = ['#F2994A', '#9B51E0', '#27AE60', '#EB5757', '#2F80ED', '#56CCF2', '#BB6BD9']

// Выдуманный человек — чтобы жюри могло пройти регистрацию за секунду
const DEMO = { name: 'Тестов Тест Тестович', phone: '+7 900 000-00-00', nick: 'new_hero', cls: '9Б', interests: ['Музыка', 'Игры'], newcomer: true, parentPhone: '' }

// Номер класса из строки «9Б» → 9 (или 0, если не похоже на класс)
export const classNum = (cls) => { const m = /^(1[01]|[1-9])\s?[А-ЯA-Z]$/i.exec((cls || '').trim()); return m ? Number(m[1]) : 0 }

// Регистрация. В настоящей версии ФИО и телефон сверяются со списком учеников школы —
// так посторонние не попадут внутрь. Другим пользователям виден ТОЛЬКО ник.
// Для 1–4 классов нужен телефон родителя: ему придёт сообщение, что ребёнок зарегистрировался.
export default function Register({ onBack, onDone }) {
  const [role, setRole] = useState('student')
  const [f, setF] = useState({ name: '', phone: '', nick: '', cls: '', interests: [], newcomer: false, parentPhone: '' })
  const [tried, setTried] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggle = (i) => setF({ ...f, interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i] })
  const young = role === 'student' && classNum(f.cls) >= 1 && classNum(f.cls) <= 4

  const errors = {
    name: f.name.trim().split(/\s+/).length < 2 && 'Нужны фамилия и имя',
    phone: f.phone.replace(/\D/g, '').length < 10 && 'Номер слишком короткий',
    nick: !/^[a-zA-Z0-9_.]{3,20}$/.test(f.nick) && 'От 3 до 20 символов: латиница, цифры, _ и .',
    cls: role === 'student' && !classNum(f.cls) && 'Напиши класс так: 9Б',
    parentPhone: young && f.parentPhone.replace(/\D/g, '').length < 10 && 'Нужен номер родителя',
  }
  const ok = !Object.values(errors).some(Boolean)

  const submit = () => {
    setTried(true)
    if (!ok) return
    const cls = role === 'student' ? f.cls.trim().replace(/\s/g, '').toUpperCase() : ''
    onDone({ ...f, cls, role, young, color: COLORS[f.nick.length % COLORS.length] })
  }

  const err = (k) => tried && errors[k] && <p className="err">{errors[k]}</p>

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Назад"><Icon name="back" /></button>
        <h1>Регистрация</h1>
      </div>
      <div className="scroll">
        <div className="form">
          <div className="seg">
            <button className={role === 'student' ? 'on' : ''} onClick={() => setRole('student')}>Я ученик</button>
            <button className={role === 'teacher' ? 'on' : ''} onClick={() => setRole('teacher')}>Я учитель</button>
          </div>

          <div className="field">
            <label>ФИО полностью</label>
            <input value={f.name} onChange={set('name')} placeholder="Иванов Иван Иванович" autoComplete="off" />
            {err('name')}
          </div>
          <div className="field">
            <label>Номер телефона</label>
            <input value={f.phone} onChange={set('phone')} placeholder="+7 900 123-45-67" inputMode="tel" autoComplete="off" />
            {err('phone')}
          </div>
          <p className="fine">Указывай настоящие ФИО и телефон — так мы проверим, что ты из нашей школы, и не пустим посторонних. Эти данные видит только администратор школы, другим они не показываются.</p>

          <div className="field">
            <label>Никнейм — его будут видеть все</label>
            <input value={f.nick} onChange={set('nick')} placeholder="pixel_cat" autoCapitalize="off" autoComplete="off" />
            {err('nick')}
          </div>

          {role === 'student' && (
            <>
              <div className="field">
                <label>Класс</label>
                <input value={f.cls} onChange={set('cls')} placeholder="9Б" autoComplete="off" />
                {err('cls')}
              </div>
              {young && (
                <div className="field">
                  <label>Телефон родителя</label>
                  <input value={f.parentPhone} onChange={set('parentPhone')} placeholder="+7 900 765-43-21" inputMode="tel" autoComplete="off" />
                  {err('parentPhone')}
                  <p className="hint">Для 1–4 классов: родителю придёт сообщение, что ты зарегистрировался, и раз в неделю — короткая сводка от ИИ-помощника. Переписку родитель не читает.</p>
                </div>
              )}
              <label className="check">
                <input type="checkbox" checked={f.newcomer} onChange={(e) => setF({ ...f, newcomer: e.target.checked })} />
                Я новенький — первый год в этой школе
              </label>
              <div className="field">
                <label>Интересы — по желанию, помогут найти друзей</label>
                <div className="chips">
                  {INTERESTS.map((i) => (
                    <button key={i} className={'chip' + (f.interests.includes(i) ? ' on' : '')} onClick={() => toggle(i)}>{i}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          {role === 'teacher' && (
            <p className="fine">Учителя не видят чаты учеников. В приложении учитель создаёт мероприятия, а ученики записываются на них. В настоящей версии учительский аккаунт подтверждает администрация школы.</p>
          )}

          <button className="btn" onClick={submit}>Готово</button>
          <button className="btn ghost" onClick={() => setF(DEMO)}>Заполнить выдуманными данными</button>
          <p className="demo-note">Это учебный прототип: данные никуда не отправляются и хранятся только на этом телефоне.</p>
        </div>
      </div>
    </>
  )
}
