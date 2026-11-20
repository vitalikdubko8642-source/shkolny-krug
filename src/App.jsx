// Главный компонент: решает, какой экран показать, и хранит общее состояние.
import { useEffect } from 'react'
import { usePersisted, reset } from './store.js'
import * as demo from './data/demo.js'
import Welcome from './screens/Welcome.jsx'
import Rules from './screens/Rules.jsx'
import Register from './screens/Register.jsx'
import ChatList from './screens/ChatList.jsx'
import Chat from './screens/Chat.jsx'
import Profile from './screens/Profile.jsx'
import Soon from './screens/Soon.jsx'
import TabBar from './components/TabBar.jsx'

export const defaultSettings = {
  theme: 'classic',     // classic | dark | clean
  accent: null,         // свой цвет кнопок или null = как в теме
  wall: 'theme',        // обои чата
  textSize: 'md',       // sm | md | lg | xl
  dmFrom: 'all',        // кто может прислать запрос в личку: all | class | nobody
  showClass: true,
  showInterests: true,
  showOnline: true,
  notif: { groups: true, dm: true, requests: true, events: true, urgent: true, sound: true, quiet: false },
}

const initial = {
  stage: 'welcome',      // welcome → rules → register → main
  user: null,
  settings: defaultSettings,
  tab: 'chats',          // вкладка нижнего меню
  openChat: null,        // открытый чат — тогда нижнего меню нет, как в Telegram
  profilePage: null,     // открытый раздел профиля — тоже без нижнего меню
  messages: demo.messages,
  unread: { news: 1, class: 3, guitar: 2, new: 1 },
  dmRequests: [],        // кому мы отправили запрос на переписку
}

export default function App() {
  const [s, set] = usePersisted(initial)
  const patch = (p) => set((prev) => ({ ...prev, ...(typeof p === 'function' ? p(prev) : p) }))
  const settings = { ...defaultSettings, ...s.settings, notif: { ...defaultSettings.notif, ...s.settings?.notif } }
  const setSettings = (p) => patch((prev) => ({ settings: { ...settings, ...prev.settings, ...p } }))

  // Оформление = атрибуты у <html>; все цвета и размеры берутся из CSS-переменных
  useEffect(() => {
    const html = document.documentElement
    html.dataset.theme = settings.theme
    html.dataset.wall = settings.wall
    html.dataset.textsize = settings.textSize
    for (const v of ['--accent', '--badge', '--own']) html.style.removeProperty(v)
    if (settings.accent) {
      html.style.setProperty('--accent', settings.accent)
      html.style.setProperty('--badge', settings.accent)
      if (settings.theme !== 'classic') html.style.setProperty('--own', settings.accent)
    }
    const meta = document.querySelector('meta[name=theme-color]')
    if (meta) meta.content = getComputedStyle(html).getPropertyValue('--bg').trim()
  }, [settings.theme, settings.wall, settings.textSize, settings.accent])

  // Кнопка «назад» на телефоне закрывает чат или раздел, а не сайт
  const overlay = s.openChat || s.profilePage
  useEffect(() => {
    if (!overlay) return
    history.pushState({ overlay }, '')
    const onPop = () => patch({ openChat: null, profilePage: null })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [overlay])

  let screen
  if (s.stage === 'welcome') screen = <Welcome onNext={() => patch({ stage: 'rules' })} />
  else if (s.stage === 'rules') screen = <Rules onBack={() => patch({ stage: 'welcome' })} onNext={() => patch({ stage: 'register' })} />
  else if (s.stage === 'register') screen = <Register onBack={() => patch({ stage: 'rules' })} onDone={(user) => patch({ user, stage: 'main' })} />
  else if (s.openChat) {
    const id = s.openChat // запоминаем чат: ответ бота может прийти, когда ты уже вышел
    screen = (
      <Chat
        chat={demo.chats.find((c) => c.id === id)}
        user={s.user}
        list={s.messages[id] || []}
        onBack={() => history.back()}
        onChange={(fn) => patch((prev) => ({ messages: { ...prev.messages, [id]: fn(prev.messages[id] || []) } }))}
        onDmRequest={(nick) => patch((prev) => ({ dmRequests: [...new Set([...(prev.dmRequests || []), nick])] }))}
      />
    )
  } else if (s.tab === 'profile' && s.profilePage) {
    screen = profile()
  } else {
    const unreadTotal = Object.values(s.unread).reduce((a, b) => a + b, 0)
    let tab
    if (s.tab === 'chats') tab = (
      <ChatList
        user={s.user}
        messages={s.messages}
        unread={s.unread}
        onOpen={(id) => patch((prev) => ({ openChat: id, unread: { ...prev.unread, [id]: 0 } }))}
      />
    )
    else if (s.tab === 'profile') tab = profile()
    else if (s.tab === 'events') tab = <Soon title="События" icon="calendar" text="Здесь будут мероприятия школы: можно записаться зрителем или участником." />
    else tab = <Soon title="Друзья" icon="friends" text="Здесь ты найдёшь ребят с похожими интересами и сможешь отправить запрос на переписку." />

    screen = (
      <>
        {tab}
        <TabBar tab={s.tab} unread={unreadTotal} onTab={(t) => patch({ tab: t })} />
      </>
    )
  }

  function profile() {
    return (
      <Profile
        user={{ interests: [], ...s.user }}
        settings={settings}
        page={s.profilePage}
        onPage={(p) => (p ? patch({ profilePage: p }) : history.back())}
        onUser={(p) => patch((prev) => ({ user: { ...prev.user, ...p } }))}
        onSettings={setSettings}
        onReset={() => { reset(); location.reload() }}
      />
    )
  }

  return <div className="app">{screen}</div>
}
