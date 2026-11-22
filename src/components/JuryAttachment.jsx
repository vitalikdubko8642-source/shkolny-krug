import { useEffect, useState } from 'react'
import { MediaPlayer } from './MediaMessage.jsx'

export default function JuryAttachment({ file, token, call, conversationId }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const recording = /^(voice|circle)_(\d+)\.(webm|mp4)$/.exec(file.name)
  const recordingKind = recording?.[1] === 'voice' ? 'audio' : 'video'
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  const open = async () => {
    if (url) return
    setBusy(true); setError('')
    try {
      const data = await call(conversationId ? 'dm-attachment-get' : 'attachment-get', conversationId ? { token, id: conversationId, fileId: file.id } : { token, id: file.id })
      const binary = atob(data.data), bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
      setUrl(URL.createObjectURL(new Blob([bytes], { type: data.mime })))
    } catch (e) { setError(e.message || 'Не удалось загрузить файл.') } finally { setBusy(false) }
  }
  return <div className="jury-file" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>{!recording && <><b>{file.name}</b><small>{Math.ceil(file.size / 1024)} КБ</small></>}{!url ? <button className="mini-btn" onClick={open} disabled={busy}>{busy ? 'Загружаем…' : recording ? (recordingKind === 'audio' ? 'Загрузить голосовое' : 'Загрузить видеосообщение') : 'Открыть файл'}</button> : recording ? <MediaPlayer kind={recordingKind} url={url} duration={Number(recording[2])} /> : <>{file.mime.startsWith('image/') && <img src={url} alt={file.name} />}{file.mime.startsWith('video/') && <video src={url} controls playsInline preload="metadata" />}<a href={url} download={file.name}>Скачать</a></>}{error && <small role="alert">{error}</small>}</div>
}

