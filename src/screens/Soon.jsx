import Icon from '../components/Icon.jsx'

// Временная заглушка для вкладок, которые ещё делаем
export default function Soon({ title, icon, text }) {
  return (
    <>
      <div className="topbar"><h1>{title}</h1></div>
      <div className="scroll">
        <div className="empty">
          <Icon name={icon} />
          <b>Скоро</b>
          <span>{text}</span>
        </div>
      </div>
    </>
  )
}
