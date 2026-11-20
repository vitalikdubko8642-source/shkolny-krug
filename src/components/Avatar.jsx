// Круглая аватарка: цвет + буква или эмодзи (фотографий нет — так безопаснее и по ТЗ).
// Можно передать человека целиком: <Avatar p={person} /> — возьмёт цвет, эмодзи и рамку.
export default function Avatar({ p, color, text, emoji, frame, size = '' }) {
  const c = color ?? p?.color
  const e = emoji ?? p?.emoji
  const t = text ?? (p?.nick ? p.nick[0].toUpperCase() : '?')
  const f = frame ?? p?.frame
  return (
    <div className={'avatar ' + size + (f ? ' frame-' + f : '')} style={{ background: c }}>
      {e || t}
    </div>
  )
}

// Ник с купленным оформлением: цветом и значком
export function Nick({ p, fallback }) {
  if (!p) return <>{fallback}</>
  return (
    <span style={p.nickColor ? { color: p.nickColor } : undefined}>
      {p.nick}{p.badge && <span className="nick-badge">{p.badge}</span>}
    </span>
  )
}
