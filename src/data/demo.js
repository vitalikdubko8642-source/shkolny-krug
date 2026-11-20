// ВСЕ люди и сообщения здесь ВЫДУМАНЫ (так требует ТЗ).
// Это «демо-база»: при первом запуске приложение копирует её в память телефона.

export const people = {
  pixel_cat:   { nick: 'pixel_cat',   color: '#F2994A', cls: '9Б' },
  moon_rider:  { nick: 'moon_rider',  color: '#9B51E0', cls: '9В' },
  zhenya_gol:  { nick: 'zhenya_gol',  color: '#27AE60', cls: '9Б' },
  lisa_draws:  { nick: 'lisa_draws',  color: '#EB5757', cls: '8А' },
  max_ping:    { nick: 'max_ping',    color: '#2F80ED', cls: '10А' },
  sova_tima:   { nick: 'sova_tima',   color: '#56CCF2', cls: '9Б' },
  kira_bloom:  { nick: 'kira_bloom',  color: '#BB6BD9', cls: '7В' },
  school:      { nick: 'Школа «Окла»', color: '#3390EC', cls: '' },
}

// type: group — общая группа, channel — новости школы (писать может только школа)
export const chats = [
  { id: 'news',   title: 'Новости школы',   type: 'channel', color: '#3390EC', letter: 'Ш', members: 612, folder: 'school' },
  { id: 'class',  title: '9Б — наш класс',  type: 'group',   color: '#27AE60', letter: '9Б', members: 27, folder: 'class' },
  { id: 'par9',   title: 'Параллель 9-х',   type: 'group',   color: '#9B51E0', letter: '9', members: 84, folder: 'class' },
  { id: 'guitar', title: 'Гитара и музыка', type: 'group',   color: '#F2994A', letter: 'Г', members: 48, folder: 'interests' },
  { id: 'foot',   title: 'Футбол во дворе', type: 'group',   color: '#2F80ED', letter: 'Ф', members: 61, folder: 'interests' },
  { id: 'art',    title: 'Рисуем и делаем', type: 'group',   color: '#EB5757', letter: 'Р', members: 33, folder: 'interests' },
  { id: 'new',    title: 'Новенькие',       type: 'group',   color: '#56CCF2', letter: 'Н', members: 19, folder: 'school' },
]

export const folders = [
  { id: 'all', title: 'Все' },
  { id: 'class', title: 'Класс' },
  { id: 'interests', title: 'Интересы' },
  { id: 'school', title: 'Школа' },
]

let n = 0
const m = (from, text, time, extra = {}) => ({ id: 'd' + n++, from, text, time, ...extra })

export const messages = {
  news: [
    m('school', 'Добро пожаловать в «Школьный круг»! Здесь будут новости, события и важные объявления.', '08:10'),
    m('school', 'Завтра 3 и 4 урок у 9-х классов — в актовом зале, приходите без сменки 🙂', '09:30'),
  ],
  class: [
    m('sova_tima', 'кто сделал алгебру? номер 214 вообще не понимаю', '13:40'),
    m('zhenya_gol', 'там надо через дискриминант, скину после уроков', '13:42'),
    m('pixel_cat', 'а контрольная точно в пятницу?', '13:51'),
  ],
  par9: [
    m('moon_rider', 'ребят, кто идёт на футбол 9Б против 9В? нужны болельщики', '12:05'),
    m('max_ping', 'я приду, возьму барабан 🥁', '12:07'),
  ],
  guitar: [
    m('moon_rider', 'нашёл аккорды к той песне, кидаю в группу', '13:20'),
    m('pixel_cat', 'кто сегодня джемит после уроков?', '14:02'),
    m('lisa_draws', 'я в деле, возьму укулеле', '14:03'),
    m('pixel_cat', '', '14:05', { meet: { place: 'У навеса во дворе', time: '15:00', going: 4 } }),
  ],
  foot: [
    m('zhenya_gol', 'в субботу играем 5 на 5, нужно ещё двое', '11:15'),
    m('max_ping', '+1, но я на воротах не стою', '11:20'),
  ],
  art: [
    m('lisa_draws', 'предлагаю разрисовать стену у теплиц, кто за?', '10:02'),
    m('kira_bloom', 'я за! можно спросить у завуча', '10:15'),
  ],
  new: [
    m('kira_bloom', 'всем привет, я тоже новенькая, ещё не нашла кабинет химии 😅', '09:12'),
    m('sova_tima', 'он на 3 этаже, справа от лестницы', '09:14'),
  ],
}

// Ответы «живых» ребят (ботов), чтобы прототип не выглядел пустым
export const replies = [
  'ахах, согласен',
  'норм идея 👍',
  'я тоже за',
  'а во сколько?',
  'ок, буду',
  'ну наконец-то кто-то предложил',
  'звучит круто',
  'кстати да',
]
