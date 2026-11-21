export function meetingDate(day, time, base = new Date()) {
  if (!/^\d{2}:\d{2}$/.test(time)) return null
  const date = new Date(base)
  if (day === 'Завтра') date.setDate(date.getDate() + 1)
  const [hours, minutes] = time.split(':').map(Number)
  date.setHours(hours, minutes, 0, 0)
  return date
}

export function meetingIsFuture(day, time) {
  const date = meetingDate(day, time)
  return date && date.getTime() > Date.now()
}

export function meetingLabel(meet) {
  if (!meet.at) return `${meet.day || 'Сегодня'}, ${meet.time}`
  const date = new Date(meet.at)
  const today = new Date()
  const localDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((localDay(date) - localDay(today)) / 86400000)
  const day = days === 0 ? 'Сегодня' : days === 1 ? 'Завтра' : days === -1 ? 'Вчера' : date.toLocaleDateString('ru-RU')
  return `${day}, ${meet.time}`
}
