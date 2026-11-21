import { useEffect, useState } from 'react'
import { getRecording } from '../mediaStore.js'

export default function MediaMessage({ media }) {
  const [url, setUrl] = useState('')
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    let active = true, objectUrl
    getRecording(media.id).then(blob => {
      if (!active) return
      if (!blob) return setMissing(true)
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => { if (active) setMissing(true) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [media.id])
  if (missing) return <span>Запись недоступна на этом устройстве</span>
  if (!url) return <span>Загрузка записи…</span>
  return <div className={'media-message ' + media.kind} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
    {media.kind === 'video' ? <video src={url} controls playsInline preload="metadata" aria-label="Видеосообщение" /> : <audio src={url} controls preload="metadata" aria-label="Голосовое сообщение" />}
  </div>
}
