// Generated profile artwork, stored locally with the application for offline use.
export const PROFILE_BANNERS = [
  { id: 'gaming', title: 'Игровая комната' },
  { id: 'music', title: 'Музыка' },
  { id: 'basketball', title: 'Баскетбол' },
  { id: 'space', title: 'Космос' },
  { id: 'cobalt', title: 'Синий хром' },
  { id: 'pink', title: 'Розовый шёлк' },
  { id: 'emerald', title: 'Изумрудное стекло' },
  { id: 'silver', title: 'Серебро' },
]
const legacy = { coast: 'gaming', sunset: 'pink', forest: 'emerald', night: 'space', paper: 'silver', waves: 'cobalt', mountains: 'basketball', leaves: 'music' }
export const normalizeBanner = (id) => PROFILE_BANNERS.some(item => item.id === id) ? id : legacy[id] || 'gaming'
export default function ProfileBanner({ id, className = '' }) {
  return <img className={'profile-banner ' + className} src={`${import.meta.env.BASE_URL}profile-banners/${normalizeBanner(id)}.webp`} alt="" />
}
