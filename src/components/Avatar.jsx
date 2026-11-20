// Круглая аватарка: цвет + буква или эмодзи (фотографий нет — так безопаснее и по ТЗ)
export default function Avatar({ color, text, emoji, size = '' }) {
  return (
    <div className={'avatar ' + size} style={{ background: color }}>
      {emoji || text}
    </div>
  )
}
