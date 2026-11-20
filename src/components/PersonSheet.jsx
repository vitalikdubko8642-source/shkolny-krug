import Sheet from './Sheet.jsx'
import ProfileCard from './ProfileCard.jsx'

// Профиль другого ученика: карточка + кнопка «написать».
// Написать можно только через запрос: человек сам решает, принять его или нет.
export default function PersonSheet({ person, state, common = [], onRequest, onOpenDm, onClose }) {
  const shown = { showClass: true, showInterests: true, showOnline: false }
  return (
    <Sheet onClose={onClose}>
      <ProfileCard user={person} settings={shown} />
      {common.length > 0 && <p className="sheet-note">Общие интересы: {common.join(', ')}</p>}
      {state === 'friend' && <button className="btn" onClick={onOpenDm}>Открыть переписку</button>}
      {state === 'pending' && <button className="btn" disabled>Запрос отправлен — ждём ответа</button>}
      {state === 'incoming' && <p className="sheet-note">{person.nick} уже прислал тебе запрос — ответь во вкладке «Друзья».</p>}
      {!state && <button className="btn" onClick={onRequest}>Отправить запрос на переписку</button>}
      {!state && <p className="sheet-note">Переписка начнётся, только если {person.nick} примет запрос.</p>}
    </Sheet>
  )
}
