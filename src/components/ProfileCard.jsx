import Avatar, { Nick } from './Avatar.jsx'
import ProfileBanner from './ProfileBanner.jsx'

// Карточка «как тебя видят другие». Её же видят ребята, когда нажимают на твой ник.
// settings решают, что показывать: класс, интересы, «в сети».
export default function ProfileCard({ user, settings }) {
  const role = user.role === 'teacher' ? 'учитель' : settings.showClass && user.cls ? `ученик, ${user.cls}` : 'ученик'
  return (
    <div className={'card-view' + (user.cardBg ? ' bg-' + user.cardBg : '')}>
      <ProfileBanner id={user.banner} />
      <div className="top">
        <Avatar p={user} />
        <div>
          <b><Nick p={user} /></b>
          <span>{role}{settings.showOnline && ' · в сети'}</span>
        </div>
      </div>
      {user.status && <div className="status">{user.status}</div>}
      {user.bio && <div className="bio">{user.bio}</div>}
      {settings.showInterests && user.interests?.length > 0 && (
        <div className="chips">{user.interests.map((i) => <span key={i} className="chip">{i}</span>)}</div>
      )}
    </div>
  )
}
