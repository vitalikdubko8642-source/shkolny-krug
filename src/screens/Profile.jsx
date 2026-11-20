// Профиль и настройки — устроены как «Настройки» в Telegram:
// главная страница со списком разделов, каждый раздел открывается отдельным экраном.
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Avatar, { Nick } from '../components/Avatar.jsx'
import ProfileCard from '../components/ProfileCard.jsx'
import { INTERESTS } from './Register.jsx'
import { shop } from '../data/demo.js'

export const AVATAR_COLORS = ['#F2994A', '#EB5757', '#E0557F', '#BB6BD9', '#9B51E0', '#2F80ED', '#3390EC', '#56CCF2', '#27AE60', '#6FCF97', '#828282', '#333333']
const EMOJIS = ['😎', '🦊', '🐱', '🐼', '🐸', '🦄', '🐙', '👾', '🎸', '⚽', '🏀', '🎨', '📚', '🎮', '🚀', '⭐']
const STATUS_PRESETS = ['🎸 ищу группу', '📚 готовлюсь к ОГЭ', '⚽ кто в футбол?', '🎮 играю после уроков', '😴 не беспокоить']
const ACCENTS = [null, '#3390EC', '#8774E1', '#E0557F', '#F2994A', '#27AE60', '#00A3A3']
const THEMES = [
  { id: 'classic', title: 'Классика', bg: '#DCE8D2', a: '#ffffff', b: '#EFFDDE' },
  { id: 'dark', title: 'Тёмная', bg: '#0F0F0F', a: '#2B2B2B', b: '#766AC8' },
  { id: 'clean', title: 'Чистая', bg: '#F3F4F6', a: '#ffffff', b: '#2AABEE' },
]
const WALLS = [
  { id: 'theme', title: 'Как в теме', css: 'var(--chat-bg)' },
  { id: 'plain', title: 'Однотонные', css: 'var(--bg-2)' },
  { id: 'dots', title: 'Точки', css: 'radial-gradient(rgba(127,127,127,0.3) 1.2px, transparent 1.3px) 0 0 / 12px 12px, var(--chat-bg)' },
  { id: 'sunset', title: 'Закат', css: 'linear-gradient(165deg, #f7d2ad, #eab0c8)' },
  { id: 'mint', title: 'Мята', css: 'linear-gradient(165deg, #c4ead8, #b2d6f0)' },
  { id: 'night', title: 'Ночь', css: 'linear-gradient(165deg, #1d2742, #3b4f6d)' },
]
const SIZES = [['sm', 'Мелкий'], ['md', 'Обычный'], ['lg', 'Крупный'], ['xl', 'Очень крупный']]
const DM = [['all', 'Все ученики школы'], ['class', 'Только мой класс'], ['nobody', 'Никто']]

// ---------- мелкие кирпичики ----------
const Toggle = ({ on }) => <span className={'toggle' + (on ? ' on' : '')} />

function Row({ icon, color, title, sub, value, onClick, right }) {
  return (
    <button className="row" onClick={onClick}>
      {icon && <span className="ri" style={{ background: color }}><Icon name={icon} /></span>}
      <span className="rt">{title}{sub && <small>{sub}</small>}</span>
      {value && <span className="rv">{value}</span>}
      {right ?? <Icon name="chevron" className="ch" />}
    </button>
  )
}

function Page({ title, onBack, children }) {
  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Назад"><Icon name="back" /></button>
        <h1>{title}</h1>
      </div>
      <div className="scroll" style={{ paddingTop: 12, paddingBottom: 24 }}>{children}</div>
    </>
  )
}

// ---------- главная страница профиля ----------
export default function Profile({ user, settings, page, onPage, onUser, onSettings, onReset, onRole, onTour, blocked, onUnblock }) {
  const back = () => onPage(null)
  if (page === 'me') return <MePage user={user} settings={settings} onUser={onUser} onBack={back} />
  if (page === 'look') return <LookPage settings={settings} onSettings={onSettings} onBack={back} />
  if (page === 'privacy') return <PrivacyPage user={user} settings={settings} onSettings={onSettings} blocked={blocked} onUnblock={onUnblock} onBack={back} />
  if (page === 'notif') return <NotifPage settings={settings} onSettings={onSettings} onBack={back} />
  if (page === 'shop') return <ShopPage user={user} onUser={onUser} onBack={back} />
  if (page === 'about') return <AboutPage user={user} onBack={back} onReset={onReset} onRole={onRole} />

  const theme = THEMES.find((t) => t.id === settings.theme)?.title
  const dm = DM.find(([id]) => id === settings.dmFrom)?.[1]
  const isTeacher = user.role === 'teacher'
  return (
    <>
      <div className="topbar"><h1>Профиль</h1>{!isTeacher && <button className="coins" onClick={() => onPage('shop')}>{user.coins ?? 0} 🪙</button>}</div>
      <div className="scroll">
        <div className="p-head">
          <Avatar p={user} />
          <b><Nick p={user} /></b>
          <span className="st">{user.status || (isTeacher ? 'Учитель' : `Ученик, ${user.cls}`)}</span>
          <button className="link-btn" onClick={() => onPage('me')}>Изменить профиль</button>
        </div>

        <div className="group">
          <Row icon="user" color="#F2994A" title="Мой профиль" sub="Аватар, ник, статус, о себе, интересы" onClick={() => onPage('me')} />
          {!isTeacher && <Row icon="coin" color="#E2A400" title="Монеты и оформление" sub="Рамки, значки и цвет ника за победы в мини-играх" value={`${user.coins ?? 0} 🪙`} onClick={() => onPage('shop')} />}
          <Row icon="palette" color="#9B51E0" title="Оформление приложения" sub={`Тема «${theme}», цвет, обои, размер текста`} onClick={() => onPage('look')} />
        </div>
        <div className="group">
          <Row icon="lock" color="#27AE60" title="Конфиденциальность" sub={isTeacher ? 'Что видят ученики' : `Пишут лично: ${dm.toLowerCase()}`} onClick={() => onPage('privacy')} />
          <Row icon="bell" color="#EB5757" title="Уведомления" sub="Чаты, события, новости школы" onClick={() => onPage('notif')} />
        </div>
        <div className="group">
          {!isTeacher && <Row icon="map" color="#56CCF2" title="Гид по школе" sub="Что где находится и с кем познакомиться" onClick={onTour} />}
          <Row icon="info" color="#828282" title="О приложении" sub="Правила, модерация, режим демонстрации" onClick={() => onPage('about')} />
        </div>
      </div>
    </>
  )
}

// ---------- Мой профиль ----------
function MePage({ user, settings, onUser, onBack }) {
  const [nick, setNick] = useState(user.nick)
  const nickOk = /^[a-zA-Z0-9_.]{3,20}$/.test(nick)
  const toggle = (i) => onUser({ interests: user.interests.includes(i) ? user.interests.filter((x) => x !== i) : [...user.interests, i] })

  return (
    <Page title="Мой профиль" onBack={onBack}>
      <p className="group-title">Так тебя видят другие</p>
      <ProfileCard user={{ ...user, nick: nickOk ? nick : user.nick }} settings={settings} />

      <p className="group-title">Аватар</p>
      <div className="group pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="swatches">
          {AVATAR_COLORS.map((c) => (
            <button key={c} className={'sw' + (user.color === c ? ' on' : '')} style={{ background: c }} onClick={() => onUser({ color: c })} aria-label="Цвет" />
          ))}
        </div>
        <div className="emojis">
          <button className={!user.emoji ? 'on' : ''} onClick={() => onUser({ emoji: null })} style={{ fontSize: 16, fontWeight: 600 }}>{user.nick[0].toUpperCase()}</button>
          {EMOJIS.slice(0, 15).map((e) => (
            <button key={e} className={user.emoji === e ? 'on' : ''} onClick={() => onUser({ emoji: e })}>{e}</button>
          ))}
        </div>
      </div>

      <p className="group-title">Никнейм</p>
      <div className="group pad">
        <input className="field-in" value={nick} onChange={(e) => { setNick(e.target.value); if (/^[a-zA-Z0-9_.]{3,20}$/.test(e.target.value)) onUser({ nick: e.target.value }) }} autoCapitalize="off" />
      </div>
      <p className="group-note" style={{ color: nickOk ? undefined : 'var(--danger)' }}>От 3 до 20 символов: латиница, цифры, _ и точка. Фамилию лучше не писать.</p>

      <p className="group-title">Статус</p>
      <div className="group pad">
        <input className="field-in" value={user.status || ''} maxLength={40} placeholder="Чем занят прямо сейчас?" onChange={(e) => onUser({ status: e.target.value })} />
        <div className="chips" style={{ marginTop: 4 }}>
          {STATUS_PRESETS.map((s) => <button key={s} className={'chip' + (user.status === s ? ' on' : '')} style={{ background: user.status === s ? undefined : 'var(--bg)' }} onClick={() => onUser({ status: user.status === s ? '' : s })}>{s}</button>)}
        </div>
      </div>

      <p className="group-title">О себе</p>
      <div className="group pad">
        <textarea className="field-in" rows={3} maxLength={120} value={user.bio || ''} placeholder="Пару слов о себе: что любишь, чем занимаешься" onChange={(e) => onUser({ bio: e.target.value })} />
        <div className="counter">{(user.bio || '').length}/120</div>
      </div>

      {user.role !== 'teacher' && (
        <>
          <p className="group-title">Интересы</p>
          <div className="group pad">
            <div className="chips">
              {INTERESTS.map((i) => (
                <button key={i} className={'chip' + (user.interests?.includes(i) ? ' on' : '')} style={{ background: user.interests?.includes(i) ? undefined : 'var(--bg)' }} onClick={() => toggle(i)}>{i}</button>
              ))}
            </div>
          </div>
          <p className="group-note">По интересам тебе будут предлагать ребят и группы во вкладке «Друзья».</p>
        </>
      )}
    </Page>
  )
}

// ---------- Оформление ----------
function LookPage({ settings, onSettings, onBack }) {
  return (
    <Page title="Оформление приложения" onBack={onBack}>
      <div className="mini-chat">
        <div className="msg"><div className="from" style={{ color: '#F2994A' }}>pixel_cat</div><div className="text">так будут выглядеть сообщения</div></div>
        <div className="own-row own"><div className="msg"><div className="text">выглядит круто 🔥</div><div className="meta"><span className="tm">14:05 ✓✓</span></div></div></div>
      </div>

      <p className="group-title">Тема</p>
      <div className="group pad">
        <div className="themes">
          {THEMES.map((t) => (
            <button key={t.id} className={'theme-opt' + (settings.theme === t.id ? ' on' : '')} onClick={() => onSettings({ theme: t.id })}>
              <div className="pv" style={{ background: t.bg }}><i style={{ background: t.a }} /><i style={{ background: t.b }} /></div>
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <p className="group-title">Цвет кнопок и акцентов</p>
      <div className="group pad">
        <div className="swatches">
          {ACCENTS.map((c) => (
            <button key={c || 'auto'} className={'sw' + (settings.accent === c ? ' on' : '') + (c ? '' : ' auto')} style={c ? { background: c } : undefined}
              onClick={() => onSettings({ accent: c })} aria-label={c ? 'Цвет' : 'Как в теме'} />
          ))}
        </div>
      </div>
      <p className="group-note">Разноцветный кружок — цвет, который задумала тема.</p>

      <p className="group-title">Обои чата</p>
      <div className="group pad">
        <div className="walls">
          {WALLS.map((w) => (
            <button key={w.id} className={'wall' + (settings.wall === w.id ? ' on' : '')} style={{ background: w.css }} onClick={() => onSettings({ wall: w.id })}>
              <span>{w.title}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="group-title">Размер текста сообщений</p>
      <div className="group">
        {SIZES.map(([id, title]) => (
          <Row key={id} title={title} onClick={() => onSettings({ textSize: id })} right={<span className={'radio' + (settings.textSize === id ? ' on' : '')} />} />
        ))}
      </div>
    </Page>
  )
}

// ---------- Конфиденциальность ----------
function PrivacyPage({ user, settings, onSettings, blocked = [], onUnblock, onBack }) {
  const flip = (k) => () => onSettings({ [k]: !settings[k] })
  return (
    <Page title="Конфиденциальность" onBack={onBack}>
      {user.young && (
        <>
          <p className="group-title">Родительский контроль · 1–4 класс</p>
          <div className="group pad" style={{ fontSize: 14.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>✓ Родитель знает, что ты зарегистрирован в «Школьном круге».</span>
            <span>✓ Раз в неделю ИИ-помощник присылает ему короткую сводку: в каких группах ты общаешься и были ли жалобы.</span>
            <span>✗ Переписку родитель не читает.</span>
            <span>✓ Если кто-то пожаловался на сообщение, адресованное тебе, родитель получит уведомление.</span>
          </div>
        </>
      )}
      <p className="group-title">Кто может прислать запрос в личку</p>
      <div className="group">
        {DM.map(([id, title]) => (
          <Row key={id} title={title} onClick={() => onSettings({ dmFrom: id })} right={<span className={'radio' + (settings.dmFrom === id ? ' on' : '')} />} />
        ))}
      </div>
      <p className="group-note">Даже если запрос пришёл, переписка начнётся, только когда ты его примешь.</p>

      <p className="group-title">Что видят другие</p>
      <div className="group">
        <Row title="Мой класс" onClick={flip('showClass')} right={<Toggle on={settings.showClass} />} />
        <Row title="Мои интересы" onClick={flip('showInterests')} right={<Toggle on={settings.showInterests} />} />
        <Row title="Когда я в сети" onClick={flip('showOnline')} right={<Toggle on={settings.showOnline} />} />
      </div>
      <p className="group-note">ФИО и номер телефона не видит никто из ребят — только администратор школы, чтобы проверить, что ты из нашей школы.</p>

      <p className="group-title">Заблокированные</p>
      <div className="group">
        {blocked.length === 0 && <div className="pad" style={{ color: 'var(--text-2)', fontSize: 14.5 }}>Никого. Заблокировать можно в личном чате через «⋯».</div>}
        {blocked.map((nick) => (
          <div key={nick} className="row"><span className="rt">{nick}</span><button className="mini-btn" onClick={() => onUnblock(nick)}>Разблокировать</button></div>
        ))}
      </div>
    </Page>
  )
}

// ---------- Монеты и магазин оформления ----------
const SHOP_GROUPS = [['frame', 'Рамки аватара'], ['badge', 'Значок рядом с ником'], ['nickColor', 'Цвет ника'], ['cardBg', 'Фон карточки профиля']]

function ShopPage({ user, onUser, onBack }) {
  const owned = user.owned || []
  const coins = user.coins ?? 0
  const buy = (it) => { if (coins >= it.price) onUser({ coins: coins - it.price, owned: [...owned, it.id], [it.type]: it.value }) }
  const toggle = (it) => onUser({ [it.type]: user[it.type] === it.value ? null : it.value })
  const preview = (it) => {
    if (it.type === 'frame') return <Avatar p={{ ...user, frame: it.value }} size="sm" />
    if (it.type === 'badge') return <span className="shop-pv">{it.value}</span>
    if (it.type === 'nickColor') return <span className="shop-pv" style={{ color: it.value, fontWeight: 600 }}>Aa</span>
    return <span className={'shop-pv bgpv bg-' + it.value} />
  }
  return (
    <Page title="Монеты и оформление" onBack={onBack}>
      <div className="balance">
        <span className="big">{coins} 🪙</span>
        <span>Монеты дают за призовые места в мини-играх в группах: 🥇 30, 🥈 20, 🥉 10, за участие 5. Купить монеты за деньги нельзя.</span>
      </div>
      <p className="group-title">Так ты выглядишь</p>
      <ProfileCard user={user} settings={{ showClass: true, showInterests: false }} />
      {SHOP_GROUPS.map(([type, title]) => (
        <div key={type}>
          <p className="group-title">{title}</p>
          <div className="group">
            {shop.filter((it) => it.type === type).map((it) => {
              const has = owned.includes(it.id)
              const on = user[it.type] === it.value
              return (
                <div key={it.id} className="row">
                  {preview(it)}
                  <span className="rt">{it.title}{!has && <small>{it.price} 🪙</small>}</span>
                  {has
                    ? <button className={'mini-btn' + (on ? ' on' : '')} onClick={() => toggle(it)}>{on ? 'Надето ✓' : 'Надеть'}</button>
                    : <button className="mini-btn" disabled={coins < it.price} onClick={() => buy(it)}>{coins < it.price ? `Нужно ${it.price}` : 'Купить'}</button>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </Page>
  )
}

// ---------- Уведомления ----------
function NotifPage({ settings, onSettings, onBack }) {
  const n = settings.notif
  const flip = (k) => () => onSettings({ notif: { ...n, [k]: !n[k] } })
  return (
    <Page title="Уведомления" onBack={onBack}>
      <div className="group">
        <Row title="Сообщения в группах" onClick={flip('groups')} right={<Toggle on={n.groups} />} />
        <Row title="Личные сообщения" onClick={flip('dm')} right={<Toggle on={n.dm} />} />
        <Row title="Запросы на переписку" onClick={flip('requests')} right={<Toggle on={n.requests} />} />
        <Row title="Мероприятия и встречи" onClick={flip('events')} right={<Toggle on={n.events} />} />
      </div>
      <div className="group">
        <Row title="Срочные новости школы" sub="Например, «не работает столовая»" onClick={flip('urgent')} right={<Toggle on={n.urgent} />} />
      </div>
      <div className="group">
        <Row title="Звук" onClick={flip('sound')} right={<Toggle on={n.sound} />} />
        <Row title="Тихие часы" sub="С 22:00 до 7:00 уведомления без звука" onClick={flip('quiet')} right={<Toggle on={n.quiet} />} />
      </div>
    </Page>
  )
}

// ---------- О приложении ----------
function AboutPage({ user, onBack, onReset, onRole }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <Page title="О приложении" onBack={onBack}>
      <p className="group-title">Правила общения</p>
      <div className="group pad" style={{ fontSize: 14.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span>1. Общайся как в жизни — запрещённых слов нет, главное не задевать других.</span>
        <span>2. Задело — нажми на сообщение и пожалуйся.</span>
        <span>3. Личка — только по взаимному согласию.</span>
        <span>4. Не пиши в чатах телефон, адрес и где ты сейчас.</span>
      </div>

      <p className="group-title">Как работает модерация</p>
      <div className="group pad" style={{ fontSize: 14.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span><b>1. Жалоба.</b> Нажимаешь на сообщение → «Пожаловаться» → выбираешь причину. У тебя оно сразу скрывается, автор не узнает, кто пожаловался.</span>
        <span><b>2. ИИ-помощник</b> читает только это сообщение и помечает, насколько всё серьёзно: «шутка», «грубо», «травля», «опасно».</span>
        <span><b>3. Решает человек</b> — школьный модератор (например, психолог или соцпедагог). Он видит только сообщения с жалобами, а не все чаты. Может попросить удалить, предупредить или на время ограничить отправку.</span>
        <span><b>4. Ответ.</b> Тебе приходит уведомление, чем всё закончилось.</span>
      </div>
      <p className="group-note">Мат и «неправильные» слова сами по себе не нарушение. Нарушение — когда это задевает человека и он жалуется.</p>

      <p className="group-title">Режим демонстрации</p>
      <div className="group">
        <Row title={user.role === 'teacher' ? 'Посмотреть как ученик' : 'Посмотреть как учитель'}
          sub={user.role === 'teacher' ? 'Вернуть чаты, друзей и мини-игры' : 'Учитель создаёт мероприятия и не видит чатов'}
          onClick={() => onRole(user.role === 'teacher' ? 'student' : 'teacher')} />
      </div>

      <div className="group">
        <Row title="Школьный круг" sub="Учебный прототип · УрбанКод-2026" right={<span className="rv">v0.3</span>} />
        <Row title={<span style={{ color: 'var(--danger)' }}>Сбросить прототип и начать заново</span>} onClick={() => setConfirm(true)} right={null} />
      </div>
      <p className="group-note">Все люди и сообщения в прототипе выдуманы. Данные хранятся только на этом телефоне.</p>

      {confirm && (
        <div className="sheet-bg" onClick={() => setConfirm(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>Начать заново?</h3>
            <p>Пропадут твой профиль, сообщения, монеты и настройки. Вернётся стартовый экран.</p>
            <button className="btn danger" onClick={onReset}>Сбросить</button>
            <button className="btn ghost" onClick={() => setConfirm(false)}>Отмена</button>
          </div>
        </div>
      )}
    </Page>
  )
}
