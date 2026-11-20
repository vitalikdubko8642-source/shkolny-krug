// Окно, которое выезжает снизу (как меню в Telegram). Нажатие на затемнение закрывает его.
export default function Sheet({ onClose, title, children, tall }) {
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className={'sheet' + (tall ? ' tall' : '')} onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  )
}
