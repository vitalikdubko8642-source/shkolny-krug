import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { getRecording } from '../mediaStore.js'

const format = value => `${Math.floor((value || 0) / 60)}:${String(Math.floor((value || 0) % 60)).padStart(2, '0')}`

// A custom player shared by previews and saved messages: never displays native controls.
export function MediaPlayer({ kind, url, duration = 0, preview = false }) {
  const player = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [measured, setMeasured] = useState(duration)
  const [error, setError] = useState(false)
  const [wave, setWave] = useState(Array(40).fill(5))
  useEffect(() => {
    if (kind !== 'audio' || !url) return
    let active = true, context
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    fetch(url).then(response => response.arrayBuffer()).then(async data => {
      context = new AudioContext()
      const decoded = await context.decodeAudioData(data)
      const samples = decoded.getChannelData(0), width = Math.max(1, Math.floor(samples.length / 40))
      const peaks = Array.from({ length: 40 }, (_, i) => {
        let max = 0
        for (let j = i * width; j < Math.min(samples.length, (i + 1) * width); j += 16) max = Math.max(max, Math.abs(samples[j]))
        return max
      })
      const largest = Math.max(...peaks, .01)
      if (active) setWave(peaks.map(value => 5 + Math.round(value / largest * 18)))
    }).catch(() => {}).finally(() => context?.close().catch(() => {}))
    return () => { active = false }
  }, [url, kind])
  const total = Number.isFinite(measured) && measured > 0 ? measured : duration || 1
  const progress = Math.min(1, position / total)
  const toggle = async () => {
    if (!player.current) return
    if (player.current.paused) { try { await player.current.play() } catch { setError(true) } }
    else player.current.pause()
  }
  const seek = event => {
    const next = Number(event.target.value) / 100 * total
    try { player.current.currentTime = next; setPosition(next) } catch { /* non-seekable media */ }
  }
  const props = { ref: player, src: url, preload: 'auto', onPlay: () => setPlaying(true), onPause: () => setPlaying(false), onEnded: () => { setPlaying(false); setPosition(0) }, onTimeUpdate: e => setPosition(e.currentTarget.currentTime), onLoadedMetadata: e => { if (Number.isFinite(e.currentTarget.duration)) setMeasured(e.currentTarget.duration) }, onError: () => setError(true) }
  return <div className={'custom-media ' + kind + (preview ? ' is-preview' : '')} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
    {kind === 'audio' ? <>
      <audio {...props} aria-label="Голосовое сообщение" />
      <button className="media-play" onClick={toggle} aria-label={playing ? 'Пауза' : 'Воспроизвести голосовое'}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
      <div className="audio-content">
        <div className="wave-wrap"><div className="wave-bars" aria-hidden="true">{wave.map((height, i) => <span key={i} style={{ height: `${height}px`, opacity: i / 40 <= progress ? 1 : .4 }} />)}</div><input type="range" min="0" max="100" step="1" value={progress * 100} onChange={seek} aria-label="Позиция голосового сообщения" /></div>
        <span className="media-duration">{format(playing || position ? position : duration)}</span>
      </div>
    </> : <div className="video-disc">
      <video {...props} playsInline aria-label="Видеосообщение" />
      <svg className="video-progress" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" /><circle cx="50" cy="50" r="48" pathLength="100" strokeDasharray={`${progress * 100} 100`} /></svg>
      <button className={'video-play' + (playing ? ' is-playing' : '')} onClick={toggle} aria-label={playing ? 'Пауза видео' : 'Воспроизвести видео'}>{playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
      <span className="video-duration">{format(playing ? Math.max(0, total - position) : duration)}</span>
      {preview && <input className="video-seek" type="range" min="0" max="100" step="1" value={progress * 100} onChange={seek} aria-label="Позиция видео" />}
    </div>}
    {error && <span className="media-error" role="alert">Не удалось воспроизвести запись</span>}
  </div>
}

export default function MediaMessage({ media }) {
  const [url, setUrl] = useState('')
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    let active = true, objectUrl
    getRecording(media.id).then(blob => {
      if (!active) return
      if (!blob) return setMissing(true)
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    }).catch(() => { if (active) setMissing(true) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [media.id])
  if (missing) return <span>Запись недоступна на этом устройстве</span>
  if (!url) return <span>Загрузка записи…</span>
  return <div className={'media-message ' + media.kind}><MediaPlayer kind={media.kind} url={url} duration={media.duration} /></div>
}
