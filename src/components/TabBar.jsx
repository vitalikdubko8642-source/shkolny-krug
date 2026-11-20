import Icon from './Icon.jsx'

const tabs = [
  { id: 'chats', title: 'Чаты', icon: 'chat' },
  { id: 'events', title: 'События', icon: 'calendar' },
  { id: 'friends', title: 'Друзья', icon: 'friends' },
  { id: 'profile', title: 'Профиль', icon: 'user' },
]

// Нижнее меню. Показывается только на главных экранах, внутри чата его нет.
export default function TabBar({ tab, unread, onTab }) {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => onTab(t.id)}>
          <Icon name={t.icon} />
          {t.title}
          {t.id === 'chats' && unread > 0 && <span className="tbadge">{unread}</span>}
        </button>
      ))}
    </nav>
  )
}
