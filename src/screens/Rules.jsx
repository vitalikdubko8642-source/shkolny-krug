import { useState } from 'react'
import Icon from '../components/Icon.jsx'

// Короткие правила общения. Модерация мягкая: наказывают не за слова,
// а за то, что кого-то задело и на это пожаловались.
const rules = [
  ['Общайся как в жизни', 'Здесь нет запрета на «неправильные» слова. Главное — не задевать других.'],
  ['Задело — пожалуйся', 'Нажми на сообщение — там есть «Скрыть» и «Пожаловаться». Жалобу разбирает модератор.'],
  ['Личка — по согласию', 'Написать лично можно, только если человек принял твой запрос.'],
  ['Не делись личным', 'Не пиши в чатах телефон, адрес и где ты сейчас. Для всех ты — просто ник.'],
]

export default function Rules({ onBack, onNext }) {
  const [ok, setOk] = useState(false)
  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Назад"><Icon name="back" /></button>
        <h1>Правила</h1>
      </div>
      <div className="scroll">
        <div className="rules">
          <h2>Четыре простых правила</h2>
          {rules.map(([title, text], i) => (
            <div className="rule" key={i}>
              <div className="num">{i + 1}</div>
              <div><b>{title}</b><span>{text}</span></div>
            </div>
          ))}
          <div className="spacer" />
          <label className="check">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
            Понятно, буду соблюдать
          </label>
          <button className="btn" disabled={!ok} onClick={onNext}>Дальше</button>
        </div>
      </div>
    </>
  )
}
