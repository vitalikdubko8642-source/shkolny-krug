// Главный компонент: решает, какой экран показать, и хранит общее состояние приложения.
// Все действия (записаться, поддержать идею, отправить запрос…) — это функции ниже,
// они меняют состояние, а оно автоматически сохраняется в памяти телефона (store.js).
import { useEffect, useRef, useState } from 'react'
import { usePersisted, reset, now } from './store.js'
import * as demo from './data/demo.js'
import Welcome from './screens/Welcome.jsx'
import Rules from './screens/Rules.jsx'
import Register from './screens/Register.jsx'
import Tour from './screens/Tour.jsx'
import ChatList from './screens/ChatList.jsx'
import Chat from './screens/Chat.jsx'
import Events from './screens/Events.jsx'
import Ideas from './screens/Ideas.jsx'
import Friends from './screens/Friends.jsx'
import Profile from './screens/Profile.jsx'
import TabBar from './components/TabBar.jsx'
import { clearRecordings } from './mediaStore.js'

export const defaultSettings = {
  theme: 'classic',     // classic | dark | clean
  accent: null,         // свой цвет кнопок или null = как в теме
  wall: 'theme',        // обои чата
  textSize: 'md',       // sm | md | lg | xl
  dmFrom: 'all',        // кто может прислать запрос в личку: all | class | nobody
  showClass: true,
  showInterests: true,
  showOnline: true,
  blurProfanity: false,
  notif: { groups: true, dm: true, requests: true, events: true, urgent: true, sound: true, quiet: false },
}

const initial = {
  stage: 'welcome',      // welcome → rules → register → (tour, если новенький) → main
  user: null,
  settings: defaultSettings,
  tab: 'chats',          // вкладка нижнего меню
  openChat: null,        // открытый чат — тогда нижнего меню нет, как в Telegram
  profilePage: null,     // открытый раздел профиля — тоже без нижнего меню
  tourOpen: false,       // гид по школе, открытый из профиля
  messages: demo.messages,
  unread: { news: 1, class: 3, guitar: 2, new: 1 },
  customChats: [],       // группы, которые создал пользователь
  friends: [],           // с кем есть личная переписка (обе стороны согласились)
  outgoing: [],          // кому мы отправили запрос
  incoming: demo.incomingRequests,
  blocked: [],
  events: demo.events,
  alerts: demo.alerts,
  seenAlerts: [],
  ideas: demo.ideas,
}

export default function App() {
  const [s, set] = usePersisted(initial)
  const previousTab = useRef(s.tab)
  const tabOrder = ['chats', 'events', 'ideas', 'friends', 'profile']
  const tabDirection = tabOrder.indexOf(s.tab) < tabOrder.indexOf(previousTab.current) ? -1 : 1
  useEffect(() => { previousTab.current = s.tab }, [s.tab])
  const stateRef = useRef(s)
  stateRef.current = s
  const [toastText, setToastText] = useState(null)
  const patch = (p) => set((prev) => ({ ...prev, ...(typeof p === 'function' ? p(prev) : p) }))
  const settings = { ...defaultSettings, ...s.settings, notif: { ...defaultSettings.notif, ...s.settings?.notif } }
  const setSettings = (p) => patch((prev) => ({ settings: { ...settings, ...prev.settings, ...p } }))
  const toast = (t) => setToastText(t)

  useEffect(() => { if (!toastText) return; const t = setTimeout(() => setToastText(null), 3400); return () => clearTimeout(t) }, [toastText])

  // ----- Оформление = атрибуты у <html>; все цвета и размеры берутся из CSS-переменных -----
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

  // ----- Кнопка «назад» на телефоне закрывает чат или раздел, а не сайт -----
  const overlay = s.openChat || s.profilePage || (s.tourOpen && 'tour')
  useEffect(() => {
    if (!overlay) return
    history.pushState({ overlay }, '')
    const onPop = (event) => {
      const previous = event.state?.overlay
      if (previous && (previous.startsWith('dm:') || demo.chats.some((c) => c.id === previous) || s.customChats.some((c) => c.id === previous) || previous.startsWith('class:') || previous.startsWith('parallel:'))) patch({ openChat: previous, profilePage: null, tourOpen: false })
      else patch({ openChat: null, profilePage: null, tourOpen: false })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [!!overlay])

  // ----- Запросы на переписку: выдуманные ребята «принимают» запрос через несколько секунд -----
  const scheduled = useRef(new Set())
  useEffect(() => {
    for (const nick of s.outgoing) {
      if (scheduled.current.has(nick)) continue
      scheduled.current.add(nick)
      setTimeout(() => {
        scheduled.current.delete(nick)
        if (stateRef.current.blocked.includes(nick) || !stateRef.current.outgoing.includes(nick)) return
        patch((prev) => prev.outgoing.includes(nick) && !prev.blocked.includes(nick) ? {
          outgoing: prev.outgoing.filter((x) => x !== nick),
          friends: [...new Set([...prev.friends, nick])],
          messages: { ...prev.messages, ['dm:' + nick]: [...(prev.messages['dm:' + nick] || []), { id: 'r' + Date.now(), from: nick, text: 'привет! принял запрос 🙂', time: now() }] },
          unread: { ...prev.unread, ['dm:' + nick]: 1 },
        } : {})
        if (stateRef.current.settings?.notif?.requests !== false) toast(`${nick} принял запрос — теперь можно переписываться`)
      }, 4000 + Math.random() * 2000)
    }
  }, [s.outgoing])

  // ----- Все чаты: группы школы + созданные + личные -----
  const dmChat = (nick) => ({ id: 'dm:' + nick, type: 'dm', nick, title: nick, folder: 'dm', color: demo.people[nick]?.color })
  const chats = [
    ...demo.chats.filter((c) => (c.id !== 'class' || s.user?.cls === '9Б') && (c.id !== 'par9' || /^9[А-ЯЁ]$/i.test(s.user?.cls || ''))),
    ...(s.user?.role === 'student' && s.user.cls && s.user.cls !== '9Б' ? [{ id: `class:${s.user.cls}`, title: `${s.user.cls} — наш класс`, type: 'group', color: '#27AE60', letter: s.user.cls, members: 1, folder: 'class', about: 'Демонстрационный чат класса' }] : []),
    ...(s.user?.role === 'student' && s.user.cls && !/^9[А-ЯЁ]$/i.test(s.user.cls) ? [{ id: `parallel:${parseInt(s.user.cls, 10)}`, title: `Параллель ${parseInt(s.user.cls, 10)}-х`, type: 'group', color: '#9B51E0', letter: String(parseInt(s.user.cls, 10)), members: 1, folder: 'class', about: 'Демонстрационный чат параллели' }] : []),
    ...s.customChats,
    ...s.friends.filter((n) => !s.blocked.includes(n)).map(dmChat),
  ]
  const groups = chats.filter((c) => c.type === 'group')
  const visibleIncoming = s.incoming.filter((r) => !s.blocked.includes(r.nick) && settings.dmFrom !== 'nobody' && (settings.dmFrom !== 'class' || demo.people[r.nick]?.cls === s.user?.cls))

  // ----- Действия -----
  const a = {
    openChat: (id) => patch((prev) => ({ openChat: id, unread: { ...prev.unread, [id]: 0 } })),
    request: (nick) => patch((prev) => prev.blocked.includes(nick) ? {} : ({ outgoing: [...new Set([...prev.outgoing, nick])] })),
    accept: (nick) => {
      const r = s.incoming.find((x) => x.nick === nick)
      patch((prev) => ({
        incoming: prev.incoming.filter((x) => x.nick !== nick),
        friends: [...new Set([...prev.friends, nick])],
        messages: { ...prev.messages, ['dm:' + nick]: [{ id: 'q' + Date.now(), from: nick, text: r?.text || 'привет!', time: r?.time || now() }] },
        openChat: 'dm:' + nick,
      }))
    },
    decline: (nick) => { patch((prev) => ({ incoming: prev.incoming.filter((x) => x.nick !== nick) })); toast(`Запрос отклонён. ${nick} не получит уведомления`) },
    openDm: (nick) => { const id = 'dm:' + nick; if (s.openChat && s.openChat !== id) history.pushState({ overlay: id }, ''); a.openChat(id) },
    block: (nick) => {
      patch((prev) => ({ blocked: [...new Set([...prev.blocked, nick])], friends: prev.friends.filter((x) => x !== nick), outgoing: prev.outgoing.filter((x) => x !== nick), incoming: prev.incoming.filter((x) => x.nick !== nick), openChat: null }))
      history.back()
      toast(`${nick} заблокирован`)
    },
    unblock: (nick) => patch((prev) => ({ blocked: prev.blocked.filter((x) => x !== nick) })),
    personState: (nick) => s.blocked.includes(nick) ? 'blocked' : s.friends.includes(nick) ? 'friend' : s.outgoing.includes(nick) ? 'pending' : visibleIncoming.some((r) => r.nick === nick) ? 'incoming' : null,

    createGroup: (g) => {
      const id = 'c' + Date.now()
      const chat = { id, title: g.title.trim(), type: 'group', color: g.color, letter: g.title.trim()[0].toUpperCase(), members: 1, folder: g.interest ? 'interests' : 'school', interest: g.interest, about: g.about.trim() || 'Группа без описания', own: true }
      patch((prev) => ({ customChats: [...prev.customChats, chat], messages: { ...prev.messages, [id]: [] }, openChat: id }))
      toast('Группа создана. Позови ребят — например, в общем чате параллели')
    },
    inviteToGroup: (chatId, nick) => patch((prev) => ({ customChats: prev.customChats.map((c) => c.id === chatId && c.own && !(c.invited || []).includes(nick) ? { ...c, members: c.members + 1, invited: [...(c.invited || []), nick] } : c) })),

    event: (id, role) => {
      patch((prev) => ({ events: prev.events.map((e) => (e.id === id ? { ...e, me: role } : e)) }))
      if (role) toast('Демо-запись сохранена на этом устройстве')
    },
    createEvent: (e) => patch((prev) => ({ events: [{ ...e, id: 'e' + Date.now(), by: prev.user.name || prev.user.nick }, ...prev.events] })),
    updateEvent: (id, e) => patch((prev) => ({ events: prev.events.map((item) => item.id === id && item.mine ? { ...item, ...e } : item) })),
    deleteEvent: (id) => patch((prev) => ({ events: prev.events.filter((item) => item.id !== id || !item.mine) })),
    alert: ({ text, place }) => patch((prev) => ({ alerts: [{ id: 'a' + Date.now(), text, place, from: prev.user.nick, own: true, time: now(), confirms: 0 }, ...prev.alerts] })),
    alertAct: (id, what) => {
      patch((prev) => ({ alerts: prev.alerts.map((x) => {
        if (x.id !== id) return x
        if (what === 'confirm' && !x.own) return { ...x, confirmed: !x.confirmed }
        if (what === 'report') return { ...x, hidden: true }
        if (what === 'resolve' && x.own) return { ...x, resolved: true }
        if (what === 'resolve' && !x.own) { const voted = !x.resolveVoted; return { ...x, resolveVoted: voted, resolved: (x.resolveVotes || 0) + (voted ? 1 : 0) >= 3 } }
        return x
      }) }))
      if (what === 'resolve') toast('Отметка сохранена на этом устройстве')
    },
    createMeet: ({ chatId, ...meet }) => patch((prev) => ({
      messages: { ...prev.messages, [chatId]: [...(prev.messages[chatId] || []), { id: 'u' + Date.now(), from: prev.user.nick, own: true, text: '', time: now(), createdAt: new Date().toISOString(), meet: { ...meet, going: 0, me: true } }] },
    })),
    meetGo: (chatId, msgId) => patch((prev) => ({
      messages: { ...prev.messages, [chatId]: prev.messages[chatId].map((m) => (m.id === msgId ? { ...m, meet: { ...m.meet, me: !m.meet.me } } : m)) },
    })),

    support: (id, force) => {
      const i = s.ideas.find((x) => x.id === id)
      if (!i || i.own || i.status) return
      const on = force ? true : !i.supported
      const reached = on && !i.status && i.supports + 1 >= i.goal
      patch((prev) => ({ ideas: prev.ideas.map((x) => (x.id === id ? { ...x, supported: on, ...(reached ? { status: 'sent' } : {}) } : x)) }))
      if (reached) toast('Демо: идея набрала нужное число голосов')
    },
    join: (id) => patch((prev) => ({ ideas: prev.ideas.map((x) => (x.id === id ? { ...x, joinedMe: !x.joinedMe } : x)) })),
    createIdea: (f) => patch((prev) => ({ ideas: [{ id: 'i' + Date.now(), title: f.title.trim(), desc: f.desc.trim(), tag: f.tag, needPeople: f.needPeople, author: prev.user.nick, own: true, time: 'только что', supports: 0, goal: 30, joined: 0 }, ...prev.ideas] })),
    reportIdea: (id) => patch((prev) => ({ ideas: prev.ideas.map((x) => (x.id === id ? { ...x, reported: true } : x)) })),
    answerIdea: (id, answer) => patch((prev) => ({ ideas: prev.ideas.map((x) => x.id === id && x.status === 'sent' ? { ...x, answer, status: 'done' } : x) })),

    gameFinish: (chatId, msgId, res) => {
      const today = new Date().toLocaleDateString('en-CA')
      const already = s.user.gameRewardDate === today ? s.user.gameRewardTotal || 0 : 0
      const awarded = Math.max(0, Math.min(res.coins, 50 - already))
      patch((prev) => prev.messages[chatId]?.find((m) => m.id === msgId)?.game?.results ? {} : ({
        user: { ...prev.user, coins: (prev.user.coins ?? 0) + awarded, gameRewardDate: today, gameRewardTotal: already + awarded },
        messages: { ...prev.messages, [chatId]: prev.messages[chatId].map((m) => (m.id === msgId ? { ...m, game: { ...m.game, results: res.results, my: { place: res.place, coins: awarded } } } : m)) },
      }))
      toast(awarded ? `+${awarded} 🪙 (за день не больше 50)` : 'Сегодня монеты за этот раунд не начислены')
    },
    role: (role) => { patch((prev) => ({ user: { ...prev.user, role }, profilePage: null, tab: role === 'teacher' ? 'events' : 'chats' })); toast(role === 'teacher' ? 'Теперь ты видишь приложение как учитель' : 'Снова режим ученика') },
  }

  // ----- Какой экран показать -----
  let screen
  if (s.stage === 'welcome') screen = <Welcome onNext={() => patch({ stage: 'rules' })} />
  else if (s.stage === 'rules') screen = <Rules onBack={() => patch({ stage: 'welcome' })} onNext={() => patch({ stage: 'register' })} />
  else if (s.stage === 'register') screen = (
    <Register onBack={() => patch({ stage: 'rules' })}
      onDone={(user) => patch((prev) => ({ user: { ...user, coins: 50, owned: [] }, settings: { ...prev.settings, blurProfanity: !!user.young }, stage: user.newcomer && user.role === 'student' ? 'tour' : 'main', tab: user.role === 'teacher' ? 'events' : 'chats' }))} />
  )
  else if (s.stage === 'tour' || s.tourOpen) screen = (
    <Tour user={s.user} personState={a.personState} onRequest={a.request} fromProfile={s.tourOpen}
      onFriends={() => patch({ tourOpen: false, profilePage: null, stage: 'main', tab: 'friends' })}
      onDone={() => (s.tourOpen ? history.back() : patch({ stage: 'main', tab: 'friends' }))} />
  )
  else if (s.openChat && chats.find((c) => c.id === s.openChat)) {
    const id = s.openChat // запоминаем чат: ответ бота может прийти, когда ты уже вышел
    screen = (
      <Chat
        key={id}
        chat={chats.find((c) => c.id === id)}
        user={s.user}
        settings={settings}
        list={s.messages[id] || []}
        onBack={() => history.back()}
        onChange={(fn) => patch((prev) => ({ messages: { ...prev.messages, [id]: fn(prev.messages[id] || []) } }))}
        personState={a.personState}
        onRequest={a.request}
        onOpenDm={a.openDm}
        onBlock={a.block}
        onInvite={(nick) => a.inviteToGroup(id, nick)}
        onGameFinish={(msgId, res) => a.gameFinish(id, msgId, res)}
        toast={toast}
      />
    )
  } else if (s.tab === 'profile' && s.profilePage) {
    screen = profile()
  } else {
    // Все встречи из всех групп; свои — сверху
    const meets = groups
      .flatMap((c) => (s.messages[c.id] || []).filter((m) => m.meet && !m.hidden).map((m) => ({ chatId: c.id, chatTitle: c.title, msgId: m.id, meet: m.meet, own: m.own })))
      .sort((x, y) => (y.own ? 1 : 0) - (x.own ? 1 : 0))
    let tab
    if (s.tab === 'chats') tab = <ChatList user={s.user} chats={chats} messages={s.messages} unread={s.unread} alerts={s.alerts.filter((a) => !a.hidden)} onOpen={a.openChat} onCreateGroup={a.createGroup} onGoEvents={() => patch((prev) => ({ tab: 'events', seenAlerts: prev.alerts.map((a) => a.id) }))} />
    else if (s.tab === 'events') tab = (
      <Events user={s.user} events={s.events} alerts={s.alerts.filter((a) => !a.hidden)} meets={meets} groups={groups} toast={toast}
        onEvent={a.event} onCreateEvent={a.createEvent} onUpdateEvent={a.updateEvent} onDeleteEvent={a.deleteEvent} onAlert={a.alert} onAlertAct={a.alertAct}
        onCreateMeet={a.createMeet} onMeetGo={a.meetGo} onOpenChat={a.openChat} />
    )
    else if (s.tab === 'ideas') tab = <Ideas user={s.user} ideas={s.ideas.filter((i) => !i.reported)} toast={toast} onSupport={a.support} onJoin={a.join} onCreate={a.createIdea} onReport={a.reportIdea} onAnswer={a.answerIdea} />
    else if (s.tab === 'friends') tab = (
      <Friends user={s.user} friends={s.friends} outgoing={s.outgoing} incoming={visibleIncoming} blocked={s.blocked}
        onRequest={(nick) => { a.request(nick); toast(`Запрос отправлен ${nick}`) }} onAccept={a.accept} onDecline={a.decline} onOpenDm={a.openDm} />
    )
    else tab = profile()

    const isTeacher = s.user?.role === 'teacher'
    const badges = {
      chats: isTeacher ? 0 : Object.entries(s.unread).reduce((n, [id, v]) => n + (chats.some((c) => c.id === id) ? v : 0), 0),
      events: s.alerts.filter((x) => !x.resolved && !x.own && !(s.seenAlerts || []).includes(x.id)).length,
      friends: isTeacher ? 0 : visibleIncoming.length,
    }
    screen = (
      <>
        <div className="tab-content" key={s.tab} style={{ '--section-enter-x': `${tabDirection * 28}px` }}>{tab}</div>
        <TabBar tab={s.tab} badges={badges} onTab={(t) => patch((prev) => ({ tab: t, ...(t === 'events' ? { seenAlerts: prev.alerts.map((a) => a.id) } : {}) }))} />
      </>
    )
  }

  function profile() {
    return (
      <Profile
        user={{ interests: [], coins: 0, owned: [], ...s.user }}
        settings={settings}
        page={s.profilePage}
        blocked={s.blocked}
        onUnblock={a.unblock}
        onPage={(p) => (p ? patch({ profilePage: p }) : history.back())}
        onUser={(p) => patch((prev) => ({ user: { ...prev.user, ...p } }))}
        onSettings={setSettings}
        onRole={a.role}
        onTour={() => patch({ tourOpen: true })}
        onReset={async () => { try { await clearRecordings() } catch { toast('Не удалось очистить записи. Попробуй ещё раз.'); return }; reset(); location.reload() }}
      />
    )
  }

  return (
    <div className="app">
      {screen}
      {toastText && <div className="toast" onClick={() => setToastText(null)}>{toastText}</div>}
    </div>
  )
}
