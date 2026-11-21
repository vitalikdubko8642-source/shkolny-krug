import { useEffect, useRef, useState } from 'react'
import { Mic, Video, Square, Trash2, Send, X } from 'lucide-react'
import { saveRecording } from '../mediaStore.js'

const MAX_SECONDS = 60
const time = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
const stopTracks = stream => stream?.getTracks().forEach(track => track.stop())

export default function Recorder({ onClose, onSend }) {
  const [kind, setKind] = useState('audio')
  const [phase, setPhase] = useState('ready')
  const [seconds, setSeconds] = useState(0)
  const [blob, setBlob] = useState(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const stream = useRef(null), recorder = useRef(null), live = useRef(null), alive = useRef(true), started = useRef(0)

  useEffect(() => { alive.current = true; return () => { alive.current = false; if (recorder.current?.state !== 'inactive') recorder.current?.stop(); stopTracks(stream.current) } }, [])
  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  useEffect(() => { if (phase === 'recording' && live.current && stream.current) live.current.srcObject = stream.current }, [phase, kind])
  useEffect(() => {
    if (phase !== 'recording') return
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started.current) / 1000)
      setSeconds(elapsed)
      if (elapsed >= MAX_SECONDS && recorder.current?.state === 'recording') recorder.current.stop()
    }, 250)
    return () => clearInterval(timer)
  }, [phase])

  async function start() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setError('Запись недоступна в этом браузере. Попробуй открыть сайт в современном браузере по HTTPS.')
    setPhase('requesting')
    try {
      const captured = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' ? { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } } : false })
      if (!alive.current) return stopTracks(captured)
      stream.current = captured
      const rec = new MediaRecorder(captured, kind === 'video' ? { videoBitsPerSecond: 550000, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 })
      recorder.current = rec
      const chunks = []
      rec.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      rec.onerror = () => { stopTracks(captured); if (alive.current) { setError('Не удалось записать сообщение. Попробуй ещё раз.'); setPhase('ready') } }
      rec.onstop = () => {
        stopTracks(captured); stream.current = null
        if (!alive.current) return
        const result = new Blob(chunks, { type: rec.mimeType || (kind === 'video' ? 'video/webm' : 'audio/webm') })
        if (result.size < 256) { setError('Не удалось получить звук или видео. Проверь устройство и попробуй ещё раз.'); setPhase('ready'); return }
        setBlob(result); setSeconds(Math.min(MAX_SECONDS, Math.max(1, Math.round((Date.now() - started.current) / 1000)))); setPhase('preview')
      }
      started.current = Date.now(); setSeconds(0); rec.start(); setPhase('recording')
    } catch (err) {
      stopTracks(stream.current); stream.current = null
      if (alive.current) { setPhase('ready'); setError(err.name === 'NotAllowedError' ? 'Нет доступа к микрофону или камере. Разреши доступ в настройках браузера.' : 'Не удалось включить микрофон или камеру. Проверь устройство и попробуй снова.') }
    }
  }

  async function send() {
    if (!blob) return
    setPhase('saving'); setError('')
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    try { await saveRecording(id, blob); if (alive.current) onSend({ id, kind, duration: seconds }) }
    catch { if (alive.current) { setError('Не удалось сохранить запись. Проверь свободное место и попробуй снова.'); setPhase('preview') } }
  }

  return <div className="recorder" role="region" aria-label="Запись сообщения">
    <div className="recorder-head"><strong>{kind === 'audio' ? 'Голосовое сообщение' : 'Видеокружок'}</strong><button className="icon-btn" onClick={onClose} aria-label="Закрыть запись"><X size={20} /></button></div>
    {phase === 'ready' && <div className="record-modes"><button className={kind === 'audio' ? 'selected' : ''} onClick={() => setKind('audio')}><Mic size={18} /> Голос</button><button className={kind === 'video' ? 'selected' : ''} onClick={() => setKind('video')}><Video size={18} /> Кружок</button></div>}
    {phase === 'recording' && <div className="record-live">{kind === 'video' && <video ref={live} autoPlay playsInline muted aria-label="Предпросмотр камеры" />}<span className="record-dot" /><span>Запись {time(seconds)} / 1:00</span></div>}
    {(phase === 'preview' || phase === 'saving') && url && <div className="record-preview">{kind === 'video' ? <video src={url} controls playsInline aria-label="Предпросмотр видеокружка" /> : <audio src={url} controls aria-label="Предпросмотр голосового" />}</div>}
    {error && <p className="record-error" role="alert">{error}</p>}
    <p className="record-note">Демо: запись останется только в этом браузере. Максимум — 1 минута.</p>
    <div className="record-actions">
      {phase === 'ready' && <button className="record-primary" onClick={start}><Mic size={18} /> Начать запись</button>}
      {phase === 'requesting' && <span>Ждём разрешения браузера…</span>}
      {phase === 'recording' && <button className="record-primary" onClick={() => recorder.current?.stop()}><Square size={17} fill="currentColor" /> Закончить</button>}
      {(phase === 'preview' || phase === 'saving') && <><button className="record-secondary" disabled={phase === 'saving'} onClick={() => { setBlob(null); setUrl(''); setPhase('ready') }}><Trash2 size={17} /> Удалить</button><button className="record-primary" disabled={phase === 'saving'} onClick={send}><Send size={17} /> {phase === 'saving' ? 'Сохраняем…' : 'Отправить'}</button></>}
    </div>
  </div>
}
