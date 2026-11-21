import { MessageCircleMore, CalendarDays, Lightbulb, UsersRound, CircleUserRound } from 'lucide-react'

// Пять вкладок = четыре направления из ТЗ (общаться, события, инициативы, интересы) + профиль
const tabs = [
  { id: 'chats', title: 'Чаты', icon: MessageCircleMore },
  { id: 'events', title: 'События', icon: CalendarDays },
  { id: 'ideas', title: 'Идеи', icon: Lightbulb },
  { id: 'friends', title: 'Друзья', icon: UsersRound },
  { id: 'profile', title: 'Профиль', icon: CircleUserRound },
]

// Нижнее меню. Показывается только на главных экранах — внутри чата или раздела его нет.
export default function TabBar({ tab, badges = {}, onTab }) {
  return (
    <nav className="tabbar" aria-label="Главная навигация" style={{ '--active-index': Math.max(0, tabs.findIndex((t) => t.id === tab)) }}>
      <span className="tab-indicator" aria-hidden="true"><span key={tab} className="tab-indicator-shape" /></span>
      {tabs.map((t) => (
        <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => onTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          <span className="tab-icon"><t.icon size={23} strokeWidth={2} aria-hidden="true" /></span>
          <span className="tab-label">{t.title}</span>
          {badges[t.id] > 0 && <span className="tbadge">{badges[t.id]}</span>}
        </button>
      ))}
    </nav>
  )
}
