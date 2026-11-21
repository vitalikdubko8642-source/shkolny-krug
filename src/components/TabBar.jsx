import Icon from './Icon.jsx'

// Пять вкладок = четыре направления из ТЗ (общаться, события, инициативы, интересы) + профиль
const tabs = [
  { id: 'chats', title: 'Чаты', icon: 'chat' },
  { id: 'events', title: 'События', icon: 'calendar' },
  { id: 'ideas', title: 'Идеи', icon: 'bulb' },
  { id: 'friends', title: 'Друзья', icon: 'friends' },
  { id: 'profile', title: 'Профиль', icon: 'user' },
]

// Нижнее меню. Показывается только на главных экранах — внутри чата или раздела его нет.
export default function TabBar({ tab, badges = {}, onTab }) {
  return (
    <nav className="tabbar" aria-label="Главная навигация">
      {tabs.map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => onTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          <span className="tab-icon"><Icon name={t.icon} /></span>
          <span className="tab-label">{t.title}</span>
          {badges[t.id] > 0 && <span className="tbadge">{badges[t.id]}</span>}
        </button>
      ))}
    </nav>
  )
}
