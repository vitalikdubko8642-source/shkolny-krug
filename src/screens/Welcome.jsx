import Icon from '../components/Icon.jsx'

// Первый экран после QR-кода. По ТЗ он НЕ открывает чат сразу,
// а рассказывает, что это за сервис и для кого (защита от подменённого QR и прохожих).
export default function Welcome({ onNext }) {
  return (
    <div className="scroll">
      <div className="welcome">
        <img className="logo" src="./icon.svg" alt="" />
        <h2>Школьный круг</h2>
        <p className="lead">Общение, идеи и события школы в квартале «Окла»</p>

        <div className="facts">
          <div className="fact">
            <div className="dot"><Icon name="school" /></div>
            <div><b>Для кого</b><span>Ученики 1–11 классов и учителя школы. Посторонним вход закрыт.</span></div>
          </div>
          <div className="fact">
            <div className="dot"><Icon name="chat" /></div>
            <div><b>Что здесь есть</b><span>Чаты класса и по интересам, встречи у навеса во дворе, события и полезные инициативы.</span></div>
          </div>
          <div className="fact">
            <div className="dot"><Icon name="shield" /></div>
            <div><b>Безопасно</b><span>Все видят только твой ник. Личные сообщения — только если вы оба согласны.</span></div>
          </div>
        </div>

        <div className="spacer" />
        <button className="btn" onClick={onNext}>Начать</button>
        <p className="address">Проверь адрес в браузере: <b>shkolny-krug</b>. Такой же написан на табличке у QR-кода.</p>
      </div>
    </div>
  )
}
