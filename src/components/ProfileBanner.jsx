const ART = [
  { id: 'coast', title: 'Побережье', colors: ['#1e4455', '#84b9b5', '#d9c4a5'], type: 'coast' },
  { id: 'sunset', title: 'После уроков', colors: ['#6b536b', '#e89d84', '#eaccae'], type: 'sunset' },
  { id: 'forest', title: 'Лесная тропа', colors: ['#213e3e', '#718c75', '#b6bea1'], type: 'forest' },
  { id: 'night', title: 'Ночной город', colors: ['#202c4d', '#7985ae', '#d2a080'], type: 'city' },
  { id: 'paper', title: 'Бумага', colors: ['#d7c9b4', '#9a8e83', '#ede5d8'], type: 'paper' },
  { id: 'waves', title: 'Течение', colors: ['#203f69', '#488cab', '#a8ccd0'], type: 'waves' },
  { id: 'mountains', title: 'Высота', colors: ['#384f66', '#8da4aa', '#e3c9af'], type: 'mountains' },
  { id: 'leaves', title: 'Ботаника', colors: ['#294d49', '#749e89', '#d6d7b6'], type: 'leaves' },
]
export const PROFILE_BANNERS = ART
export default function ProfileBanner({ id = 'coast', className = '' }) {
  const art = ART.find(item => item.id === id) || ART[0]
  const [a, b, c] = art.colors
  return <svg className={'profile-banner ' + className} viewBox="0 0 600 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="600" height="190" fill={c} />
    {art.type === 'coast' && <><path d="M0 0h600v103C486 116 431 75 320 90S110 130 0 98Z" fill={b}/><path d="M0 147C156 79 269 185 420 116c68-31 130-21 180-7v81H0Z" fill={a}/><path d="M-20 161c164-66 249 24 424-29" fill="none" stroke={c} strokeWidth="3" opacity=".7"/></>}
    {art.type === 'sunset' && <><circle cx="425" cy="65" r="43" fill={c}/><path d="M0 145 125 90l95 52 111-66 144 72 125-37v79H0Z" fill={b}/><path d="M0 170 164 122l96 30 98-23 95 37 147-38v62H0Z" fill={a}/></>}
    {art.type === 'forest' && <><path d="M0 140 54 34l53 106 55-122 66 122 55-103 54 103 59-115 59 115 70-125 75 125v50H0Z" fill={b}/><path d="M0 170 83 70l68 100 70-95 77 95 62-102 76 102 81-100 83 100v20H0Z" fill={a}/><path d="M285 190c22-36 48-60 75-68" stroke={c} strokeWidth="7" fill="none" opacity=".7"/></>}
    {art.type === 'city' && <><circle cx="465" cy="48" r="29" fill={c}/><path d="M0 111h46V80h45v50h28V63h50v58h34V89h49v40h42V45h58v86h36V89h36v33h40V68h44v59h33V94h59v96H0Z" fill={b}/><path d="M0 146h68v-27h63v31h49v-20h58v22h39v-31h57v32h46v-22h70v22h50v-20h100v57H0Z" fill={a}/></>}
    {art.type === 'paper' && <><path d="M-20 32 252-25l139 160L84 215Z" fill={b}/><path d="M146 190 380-12l240 41v161Z" fill={a}/><path d="m203 173 175-141 165 113" fill="none" stroke={c} strokeWidth="3" opacity=".7"/></>}
    {art.type === 'waves' && <><path d="M0 45c90 0 95 62 190 62S302 45 397 45s103 62 203 62v83H0Z" fill={b}/><path d="M0 100c90 0 95 62 190 62s112-62 207-62 103 62 203 62v28H0Z" fill={a}/><path d="M0 72c90 0 95 62 190 62s112-62 207-62 103 62 203 62" fill="none" stroke={c} strokeWidth="3" opacity=".65"/></>}
    {art.type === 'mountains' && <><path d="M0 148 138 34l89 91 69-58 128 100 73-59 103 52v30H0Z" fill={b}/><path d="m0 185 152-90 82 67 75-43 99 71H0Zm338 5 135-106 127 92v14Z" fill={a}/><path d="m107 60 31-26 33 34-30-12Z" fill={c}/></>}
    {art.type === 'leaves' && <><path d="M-20 180C106 52 237 39 321-16M294 220C394 88 489 73 624 38" fill="none" stroke={a} strokeWidth="6"/><g fill={b}><path d="M71 109Q59 41 129 44q10 47-58 65ZM151 73q9-65 67-49 0 41-67 49ZM234 39q6-53 62-50-2 39-62 50ZM371 127q-12-64 56-67 13 42-56 67ZM460 80q9-55 67-52 0 40-67 52Z"/><path d="M76 109q56-36 83 21-28 30-83-21ZM175 60q58-24 74 27-30 24-74-27ZM389 111q57-27 78 21-25 27-78-21Z" fill={a}/></g></>}
  </svg>
}
