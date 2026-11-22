// Профиль и настройки — устроены как «Настройки» в Telegram:
// главная страница со списком разделов, каждый раздел открывается отдельным экраном.
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import Avatar, { Nick } from '../components/Avatar.jsx'
import ProfileCard from '../components/ProfileCard.jsx'
import ProfileBanner, { PROFILE_BANNERS } from '../components/ProfileBanner.jsx'
import Sheet from '../components/Sheet.jsx'
import { hasPersonalData } from '../logic/personal.js'
import { INTERESTS } from './Register.jsx'
import { shop, people } from '../data/demo.js'

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
export default function Profile({ user, settings, page, onPage, onUser, onSettings, onReset, onRole, onTour, blocked, onUnblock, onInstall, installed, onSwitchJury, canReturnToStudent }) {
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
          <ProfileBanner id={user.banner} />
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
          {(!user.jury || canReturnToStudent) && <Row icon="users" color="#528ACC" title={user.jury ? 'Вернуться к профилю ученика' : 'Войти как жюри'} sub={user.jury ? 'Твой учебный профиль сохранён на устройстве' : 'Вход по личному коду · профиль ученика сохранится'} onClick={onSwitchJury} />}
          {!isTeacher && <Row icon="map" color="#56CCF2" title="Гид по школе" sub="Что где находится и с кем познакомиться" onClick={onTour} />}
          {!installed && <Row icon="download" color="#287bc2" title="Установить приложение" sub="Добавить на главный экран телефона" onClick={onInstall} />}
          <Row icon="info" color="#828282" title="О приложении" sub="Правила, модерация, режим демонстрации" onClick={() => onPage('about')} />
        </div>
      </div>
    </>
  )
}

// ---------- Мой профиль ----------
function MePage({ user, settings, onUser, onBack }) {
  const [nick, setNick] = useState(user.nick)
  const [status, setStatus] = useState(user.status || '')
  const [bio, setBio] = useState(user.bio || '')
  const [pendingPersonal, setPendingPersonal] = useState(null)
  const [avatarError, setAvatarError] = useState('')
  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setAvatarError('Выбери JPG, PNG или WebP размером до 5 МБ.'); return }
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      const side = Math.min(image.width, image.height)
      const canvas = document.createElement('canvas')
      canvas.width = 256; canvas.height = 256
      canvas.getContext('2d').drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256)
      onUser({ avatarImage: canvas.toDataURL('image/webp', 0.82) })
      setAvatarError('')
    } catch { setAvatarError('Не удалось открыть изображение. Попробуй другой файл.') }
    finally { URL.revokeObjectURL(url) }
  }
  const savePublic = (key, value) => {
    if (value === (user[key] || '')) return
    if (hasPersonalData(value)) setPendingPersonal({ key, value })
    else onUser({ [key]: value })
  }
  const validNick = (value) => /^[a-zA-Z0-9_.]{3,20}$/.test(value) && !Object.keys(people).some((n) => n.toLowerCase() === value.toLowerCase())
  const nickOk = validNick(nick)
  const toggle = (i) => onUser({ interests: user.interests.includes(i) ? user.interests.filter((x) => x !== i) : [...user.interests, i] })

  return (
    <Page title="Мой профиль" onBack={onBack}>
      <p className="group-title">Так тебя видят другие</p>
      <ProfileCard user={{ ...user, nick: nickOk ? nick : user.nick }} settings={settings} />

      <p className="group-title">Баннер профиля</p>
      <div className="profile-banner-grid">
        {PROFILE_BANNERS.map((art) => <button key={art.id} type="button" className={'banner-choice' + ((user.banner || 'coast') === art.id ? ' on' : '')} aria-pressed={(user.banner || 'coast') === art.id} onClick={() => onUser({ banner: art.id })}><ProfileBanner id={art.id} /><span>{art.title}</span></button>)}
      </div>

      <p className="group-title">Аватар</p>
      <div className="group pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label className="avatar-upload">Загрузить изображение<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} /></label>
        {user.avatarImage && <button className="mini-btn" onClick={() => onUser({ avatarImage: null })}>Убрать изображение</button>}
        {avatarError && <p className="err" role="alert">{avatarError}</p>}
        <p className="fine">Для конкурсного прототипа выбирай вымышленные изображения без личных данных. Аватар пока хранится только в этом браузере.</p>
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
        <input className="field-in" value={nick} onChange={(e) => { setNick(e.target.value); if (validNick(e.target.value)) onUser({ nick: e.target.value }) }} autoCapitalize="off" />
      </div>
      <p className="group-note" style={{ color: nickOk ? undefined : 'var(--danger)' }}>От 3 до 20 символов: латиница, цифры, подчёркивание и точка. Ник не должен совпадать с существующим.</p>

      <p className="group-title">Статус</p>
      <div className="group pad">
        <input className="field-in" value={status} maxLength={40} placeholder="Чем занят прямо сейчас?" onChange={(e) => setStatus(e.target.value)} onBlur={() => savePublic('status', status)} />
        <div className="chips" style={{ marginTop: 4 }}>
          {STATUS_PRESETS.map((s) => <button key={s} className={'chip' + (status === s ? ' on' : '')} style={{ background: status === s ? undefined : 'var(--bg)' }} onClick={() => { const value = status === s ? '' : s; setStatus(value); onUser({ status: value }) }}>{s}</button>)}
        </div>
      </div>

      <p className="group-title">О себе</p>
      <div className="group pad">
        <textarea className="field-in" rows={3} maxLength={120} value={bio} placeholder="Пару слов о себе: что любишь, чем занимаешься" onChange={(e) => setBio(e.target.value)} onBlur={() => savePublic('bio', bio)} />
        {hasPersonalData(bio) && <p className="err">Похоже, здесь номер телефона или адрес. Профиль виден другим.</p>}
        <div className="counter">{bio.length}/120</div>
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
      {pendingPersonal && <Sheet title="Личные данные в профиле" onClose={() => setPendingPersonal(null)}><p>Похоже, здесь телефон или адрес. Профиль виден другим ученикам.</p><button className="btn" onClick={() => setPendingPersonal(null)}>Изменить</button><button className="btn ghost" onClick={() => { onUser({ [pendingPersonal.key]: pendingPersonal.value }); setPendingPersonal(null) }}>Всё равно сохранить</button></Sheet>}
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
function PrivacyPage({ settings, onSettings, blocked = [], onUnblock, onBack }) {
  const flip = (k) => () => onSettings({ [k]: !settings[k] })
  return (
    <Page title="Конфиденциальность" onBack={onBack}>
      <p className="group-title">Кто может прислать запрос в личку</p>
      <div className="group">
        {DM.map(([id, title]) => (
          <Row key={id} title={title} onClick={() => onSettings({ dmFrom: id })} right={<span className={'radio' + (settings.dmFrom === id ? ' on' : '')} />} />
        ))}
      </div>
      <div className="group"><Row title="Сначала спрашивать разрешение" sub="Когда выключено, разрешённые собеседники могут написать сразу" onClick={flip('dmRequireApproval')} right={<Toggle on={settings.dmRequireApproval} />} /></div>
      <p className="group-note">В демоверсии выбор действует на вымышленные запросы в этом браузере; настоящие личные чаты ещё не подключены.</p>

      <p className="group-title">Что видят другие</p>
      <div className="group">
        <Row title="Мой класс" onClick={flip('showClass')} right={<Toggle on={settings.showClass} />} />
        <Row title="Мои интересы" onClick={flip('showInterests')} right={<Toggle on={settings.showInterests} />} />
        <Row title="Когда я в сети" onClick={flip('showOnline')} right={<Toggle on={settings.showOnline} />} />
      </div>
      <p className="group-note">В прототипе вводи только выдуманные данные: они хранятся в браузере и никому не отправляются.</p>
      <p className="group-title">Комфорт в чатах</p>
      <div className="group"><Row title="Скрывать мат" sub="Нажми на скрытое слово, чтобы увидеть" onClick={flip('blurProfanity')} right={<Toggle on={settings.blurProfanity} />} /></div>

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
      <p className="group-note">В учебном прототипе настройки сохраняются на устройстве. Настоящие push-уведомления и звук пока не подключены.</p>
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
  const [teacherCode, setTeacherCode] = useState(null)
  const [codeError, setCodeError] = useState(false)
  return (
    <Page title="О приложении" onBack={onBack}>
      <p className="group-title">Правила общения</p>
      <div className="group pad" style={{ fontSize: 14.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span>1. Уважай других: не оскорбляй и не трави собеседников.</span>
        <span>2. Задело — нажми на сообщение и пожалуйся.</span>
        <span>3. Личка — только по взаимному согласию.</span>
        <span>4. Не пиши в чатах телефон, адрес и где ты сейчас.</span>
      </div>

      <p className="group-title">Как работает модерация</p>
      <div className="group pad" style={{ fontSize: 14.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span><b>1. Жалоба.</b> Нажимаешь на сообщение → «Пожаловаться» → выбираешь причину. У тебя оно сразу скрывается, автор не узнает, кто пожаловался.</span>
        <span><b>Демонстрация:</b> жалобы сохраняются только на этом устройстве и не отправляются модератору. Можно отдельно запросить анализ ИИ, подтвердив отправку выдуманного текста.</span>
      </div>
      <p className="group-note">В будущей версии решение по жалобе будет принимать человек.</p>

      <p className="group-title">Режим демонстрации</p>
      <div className="group">
        <Row title={user.role === 'teacher' ? 'Посмотреть как ученик' : 'Посмотреть как учитель'}
          sub={user.role === 'teacher' ? 'Вернуть чаты, друзей и мини-игры' : 'Вход по демонстрационному коду'}
          onClick={() => user.role === 'teacher' ? onRole('student') : setTeacherCode('')} />
      </div>

      <div className="group">
        <Row title="Школьный круг" sub="Учебный прототип · УрбанКод-2026" right={<span className="rv">v0.3</span>} />
        <Row title={<span style={{ color: 'var(--danger)' }}>Сбросить прототип и начать заново</span>} onClick={() => setConfirm(true)} right={null} />
      </div>
      <p className="group-note">Обычный демопрофиль хранится в этом браузере. Чат жюри работает через сервер для совместной проверки; используйте в нём только вымышленные данные.</p>
      {teacherCode !== null && <div className="sheet-bg" onClick={() => setTeacherCode(null)}><div className="sheet" onClick={(e) => e.stopPropagation()}><h3>Режим учителя</h3><p>Введите код для демонстрации. Это учебная проверка, не защита учётной записи.</p><input className="sheet-input" value={teacherCode} onChange={(e) => { setTeacherCode(e.target.value); setCodeError(false) }} placeholder="Код" />{codeError && <p className="err">Код не подошёл</p>}<button className="btn" onClick={() => { if (teacherCode.trim().toUpperCase() === 'OKLA2026') { setTeacherCode(null); onRole('teacher') } else setCodeError(true) }}>Войти</button><button className="btn ghost" onClick={() => setTeacherCode(null)}>Отмена</button></div></div>}

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
