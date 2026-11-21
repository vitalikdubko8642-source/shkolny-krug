import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { people } from '../data/demo.js'

export const INTERESTS = ['Музыка', 'Футбол', 'Рисование', 'Игры', 'Программирование', 'Танцы', 'Книги', 'Аниме', 'Баскетбол', 'Кино', 'Шахматы', 'Волонтёрство']
const COLORS = ['#F2994A', '#9B51E0', '#27AE60', '#EB5757', '#2F80ED', '#56CCF2', '#BB6BD9']

// Выдуманный человек — чтобы жюри могло пройти регистрацию за секунду
const DEMO = { name: 'Тестов Тест Тестович', phone: '+7 900 000-00-00', nick: 'new_hero', cls: '9Б', interests: ['Музыка', 'Игры'], newcomer: true }

// Номер класса из строки «9Б» → 9 (или 0, если не похоже на класс)
export const classNum = (cls) => { const m = /^(1[01]|[1-9])\s?[А-ЯЁ]$/i.exec((cls || '').trim()); return m ? Number(m[1]) : 0 }
const validPhone = (value) => { const d = value.replace(/\D/g, ''); return /^[78]\d{10}$/.test(d) && !/^(\d)\1+$/.test(d) }

// Регистрация. В настоящей версии ФИО и телефон сверяются со списком учеников школы —
// так посторонние не попадут внутрь. Другим пользователям виден ТОЛЬКО ник.
export default function Register({ onBack, onDone }) {
  const [role, setRole] = useState('student')
  const [f, setF] = useState({ name: '', phone: '', nick: '', cls: '', interests: [], newcomer: false })
  const [tried, setTried] = useState(false)
  const [teacherCode, setTeacherCode] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggle = (i) => setF({ ...f, interests: f.interests.includes(i) ? f.interests.filter((x) => x !== i) : [...f.interests, i] })
  const young = role === 'student' && classNum(f.cls) >= 1 && classNum(f.cls) <= 4

  const errors = {
    name: !/^[А-ЯЁа-яё-]{2,}(?:\s+[А-ЯЁа-яё-]{2,}){1,2}$/.test(f.name.trim()) && 'Укажи выдуманные имя и фамилию',
    phone: !validPhone(f.phone) && 'Нужен выдуманный номер из 11 цифр, начиная с 7 или 8',
    nick: !/^[a-zA-Z0-9_.]{3,20}$/.test(f.nick) ? 'От 3 до 20 символов: латиница, цифры, подчёркивание и точка' : Object.keys(people).some((n) => n.toLowerCase() === f.nick.toLowerCase()) && 'Этот ник уже занят',
    cls: role === 'student' && !classNum(f.cls) && 'Напиши класс так: 9Б',
    teacherCode: role === 'teacher' && teacherCode.trim().toUpperCase() !== 'OKLA2026' && 'Неверный демонстрационный код',
  }
  const ok = !Object.values(errors).some(Boolean)

  const submit = () => {
    setTried(true)
    if (!ok) { setTimeout(() => document.querySelector('.field .err')?.closest('.field')?.querySelector('input')?.focus(), 0); return }
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
          <p className="fine">Для проверки прототипа вводи только выдуманные данные.</p>

          <div className="field">
            <label>Никнейм — его будут видеть все</label>
            <input value={f.nick} onChange={set('nick')} placeholder="Придумай ник" autoCapitalize="off" autoComplete="off" />
            {err('nick')}
          </div>

          {role === 'student' && (
            <>
              <div className="field">
                <label>Класс</label>
                <input value={f.cls} onChange={set('cls')} placeholder="9Б" autoComplete="off" />
                {err('cls')}
              </div>
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
            <div className="field"><label>Демонстрационный код учителя</label><input value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} autoComplete="off" />{err('teacherCode')}<p className="fine">Это проверка для демонстрации, не защита аккаунта. В настоящей версии учителя подтверждает администрация.</p></div>
          )}

          <button className="btn" onClick={submit}>Готово</button>
          <button className="btn ghost" onClick={() => setF((prev) => ({ ...prev, name: prev.name || DEMO.name, phone: prev.phone || DEMO.phone, nick: prev.nick || DEMO.nick, cls: prev.cls || DEMO.cls, interests: prev.interests.length ? prev.interests : DEMO.interests, newcomer: prev.newcomer || DEMO.newcomer }))}>Заполнить пустые поля выдуманными данными</button>
          <p className="demo-note">P.S. Это учебный прототип: вводи только выдуманные данные. Они хранятся в этом браузере и не сверяются со списком школы. В настоящей версии предполагается проверять настоящие данные по школьному списку.</p>
        </div>
      </div>
    </>
  )
}
