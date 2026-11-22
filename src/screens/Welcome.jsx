import Icon from '../components/Icon.jsx'

// Первый экран после QR-кода. По ТЗ он НЕ открывает чат сразу,
// а рассказывает, что это за сервис и для кого (защита от подменённого QR и прохожих).
export default function Welcome({ onNext, onInstall, installed, onJury }) {
  return (
    <div className="scroll">
      <div className="welcome">
        <img className="logo" src="./icon.svg" alt="" />
        <h2>Школьный круг</h2>
        <p className="lead">Общение, идеи и события школы в квартале «Окла»</p>

        <div className="facts">
          <div className="fact">
            <div className="dot"><Icon name="school" /></div>
            <div><b>Для кого</b><span>Учебный прототип для учеников 1–11 классов и учителей школы.</span></div>
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

        <p className="fine"><b>Правила общения:</b> уважай других, не публикуй личные данные и используй жалобу, если сообщение тебя задело.</p>

        <div className="spacer" />
        <button className="btn" onClick={onNext}>Начать</button>
        <button className="jury-entry-link" onClick={onJury}>Тестовая комната для жюри</button>
        {!installed && <button className="install-link" onClick={onInstall}>Установить на телефон</button>}
        <p className="address">Проверь адрес в браузере: <b>shkolny-krug</b>. Такой же написан на табличке у QR-кода.</p>
      </div>
    </div>
  )
}
