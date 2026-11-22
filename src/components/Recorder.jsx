import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Mic, Camera, Trash2, Send, Square, SwitchCamera, Zap, ZapOff, Lock } from 'lucide-react'
import { saveRecording } from '../mediaStore.js'
import { MediaPlayer } from './MediaMessage.jsx'

const MAX_SECONDS = 60
const format = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
const stopTracks = stream => stream?.getTracks().forEach(track => track.stop())

export default function Recorder({ onSend, toast, onActive }) {
  const [kind, setKind] = useState('audio')
  const [phase, setPhase] = useState('idle')
  const [seconds, setSeconds] = useState(0)
  const [blob, setBlob] = useState(null)
  const [url, setUrl] = useState('')
  const [facing, setFacing] = useState('user')
  const [torch, setTorch] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [canSwitch, setCanSwitch] = useState(false)
  const [locked, setLocked] = useState(false)
  const stream = useRef(null), recorder = useRef(null), live = useRef(null), alive = useRef(true)
  const outputStream = useRef(null), cameraVideo = useRef(null), frame = useRef(null), cameraFacing = useRef('user')
  const gesture = useRef(null), started = useRef(0), discarded = useRef(false), phaseRef = useRef('idle'), generation = useRef(0)
  const setStage = value => { phaseRef.current = value; setPhase(value); onActive?.(value !== 'idle') }

  const stopCapture = () => { cancelAnimationFrame(frame.current); frame.current = null; stopTracks(outputStream.current); stopTracks(stream.current); outputStream.current = null; stream.current = null; if (cameraVideo.current) { cameraVideo.current.pause(); cameraVideo.current.srcObject = null; cameraVideo.current = null } }
  const updateTorch = track => { setTorch(false); try { setTorchAvailable(Boolean(track?.getCapabilities?.().torch)) } catch { setTorchAvailable(false) } }
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(gesture.current?.timer); discarded.current = true; if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop(); stopCapture() } }, [])
  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  useEffect(() => { if (phase === 'recording' && live.current) live.current.srcObject = outputStream.current || stream.current }, [phase, kind])
  useEffect(() => {
    if (phase !== 'recording') return
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started.current) / 1000)
      setSeconds(elapsed)
      if (elapsed >= MAX_SECONDS && recorder.current?.state === 'recording') recorder.current.stop()
    }, 100)
    return () => clearInterval(timer)
  }, [phase])

  async function start(selectedKind) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { toast('Запись недоступна в этом браузере. Открой сайт по HTTPS в современном браузере.'); return }
    discarded.current = false; const request = ++generation.current; setStage('requesting')
    try {
      const captured = await navigator.mediaDevices.getUserMedia({ audio: true, video: selectedKind === 'video' ? { facingMode: cameraFacing.current, width: { ideal: 480 }, height: { ideal: 480 } } : false })
      if (!alive.current || discarded.current || generation.current !== request) { stopTracks(captured); return }
      stream.current = captured
      let recorded = captured
      setLocked(false)
      if (selectedKind === 'video') {
        updateTorch(captured.getVideoTracks()[0])
        const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 480
        if (typeof canvas.captureStream === 'function') {
          const source = document.createElement('video'); source.muted = true; source.playsInline = true; source.srcObject = new MediaStream(captured.getVideoTracks()); cameraVideo.current = source
          await source.play()
          if (!alive.current || discarded.current || generation.current !== request) { stopCapture(); return }
          const context = canvas.getContext('2d')
          const draw = () => { if (!cameraVideo.current) return; const v = cameraVideo.current; if (v.readyState >= 2) { const w = v.videoWidth, h = v.videoHeight, side = Math.min(w, h); context.drawImage(v, (w-side)/2, (h-side)/2, side, side, 0, 0, 480, 480) }; frame.current = requestAnimationFrame(draw) }
          draw()
          const canvasStream = canvas.captureStream(24)
          recorded = new MediaStream([...canvasStream.getVideoTracks(), ...captured.getAudioTracks()]); outputStream.current = recorded
          setCanSwitch(true)
        } else { outputStream.current = captured; setCanSwitch(false) }
      }
      const rec = new MediaRecorder(recorded, selectedKind === 'video' ? { videoBitsPerSecond: 550000, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 })
      recorder.current = rec
      const chunks = []
      rec.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      rec.onerror = () => { stopCapture(); if (alive.current && generation.current === request) { discarded.current = true; setStage('idle'); toast('Не удалось записать сообщение. Попробуй ещё раз.') } }
      rec.onstop = () => {
        if (generation.current === request) stopCapture()
        if (!alive.current || discarded.current || generation.current !== request) return
        const result = new Blob(chunks, { type: rec.mimeType || (selectedKind === 'video' ? 'video/webm' : 'audio/webm') })
        if (result.size < 256) { setStage('idle'); toast('Запись слишком короткая или устройство не работает. Попробуй ещё раз.'); return }
        setBlob(result); setSeconds(Math.min(MAX_SECONDS, Math.max(1, Math.round((Date.now() - started.current) / 1000)))); setStage('preview')
      }
      started.current = Date.now(); setSeconds(0); rec.start(); setStage('recording')
      // The user may have released while the permission prompt was open.
      if (!gesture.current?.down) { discarded.current = true; rec.stop(); setStage('idle'); toast('Доступ получен. Удерживай кнопку ещё раз для записи.') }
    } catch (err) {
      if (generation.current === request) { stopCapture(); if (alive.current) { setStage('idle'); toast(err.name === 'NotAllowedError' ? 'Нет доступа к микрофону или камере. Разреши доступ в настройках браузера.' : 'Не удалось включить микрофон или камеру.') } }
    }
  }

  const discard = () => {
    discarded.current = true; generation.current++; clearTimeout(gesture.current?.timer); gesture.current = null
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
    stopCapture(); setBlob(null); setUrl(''); setStage('idle')
  }
  const stop = () => { if (recorder.current?.state === 'recording') recorder.current.stop() }
  const switchCamera = async () => {
    if (!canSwitch || !cameraVideo.current || phaseRef.current !== 'recording') return
    const oldFacing = cameraFacing.current, nextFacing = oldFacing === 'user' ? 'environment' : 'user'
    const oldTrack = stream.current?.getVideoTracks()[0]
    oldTrack?.stop(); if (oldTrack) stream.current.removeTrack(oldTrack)
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { exact: nextFacing }, width: { ideal: 480 }, height: { ideal: 480 } } })
      if (phaseRef.current !== 'recording') { stopTracks(next); return }
      const track = next.getVideoTracks()[0]; stream.current.addTrack(track); cameraVideo.current.srcObject = new MediaStream([track]); await cameraVideo.current.play(); cameraFacing.current = nextFacing; setFacing(nextFacing); updateTorch(track)
    } catch {
      try { const previous = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: oldFacing } }); if (phaseRef.current !== 'recording') { stopTracks(previous); return }; const track = previous.getVideoTracks()[0]; stream.current.addTrack(track); cameraVideo.current.srcObject = new MediaStream([track]); await cameraVideo.current.play(); updateTorch(track) }
      catch { stop(); toast('Не удалось переключить камеру. Запись остановлена.') }
      toast('Другая камера недоступна на этом устройстве.')
    }
  }
  const switchTorch = async () => {
    const track = stream.current?.getVideoTracks()[0]
    if (!torchAvailable || !track) return
    try { await track.applyConstraints({ advanced: [{ torch: !torch }] }); setTorch(!torch) }
    catch { setTorchAvailable(false); toast('Вспышка недоступна для этой камеры.') }
  }

  function begin(e) {
    if (phaseRef.current !== 'idle' || (e.button != null && e.button !== 0)) return
    e.preventDefault()
    const g = { down: true, long: false, startX: e.clientX, startY: e.clientY, cancel: false, locked: false }
    gesture.current = g
    g.timer = setTimeout(() => { if (g.down) { g.long = true; start(kind) } }, 350)
    const move = event => { if (event.clientX < g.startX - 100) g.cancel = true; if (event.clientY < g.startY - 80) { g.locked = true; setLocked(true) } }
    const end = event => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end)
      if (gesture.current !== g) return
      clearTimeout(g.timer); g.down = false
      if (g.cancel || event.type === 'pointercancel') { const requesting = phaseRef.current === 'requesting'; discard(); if (requesting) toast('Разреши доступ, затем удерживай кнопку ещё раз.'); return }
      if (!g.long) { setKind(old => old === 'audio' ? 'video' : 'audio'); gesture.current = null; return }
      if (phaseRef.current === 'recording' && !g.locked) stop()
      else if (phaseRef.current === 'requesting') { discarded.current = true; generation.current++; setStage('idle'); toast('Удерживай кнопку после разрешения доступа.') }
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end)
  }

  async function send() {
    if (!blob || phaseRef.current !== 'preview') return
    setStage('saving')
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
    try { await saveRecording(id, blob); const accepted = await onSend({ id, kind, duration: seconds }); if (alive.current) { if (accepted === false) { setStage('preview'); return }; setBlob(null); setStage('idle') } }
    catch { if (alive.current) { setStage('preview'); toast('Не удалось сохранить запись. Проверь свободное место.') } }
  }

  function keyDown(e) {
    if (![' ', 'Enter'].includes(e.key) || e.repeat || phaseRef.current !== 'idle') return
    e.preventDefault()
    const g = { down: true, long: false }
    gesture.current = g
    g.timer = setTimeout(() => { if (g.down) { g.long = true; start(kind) } }, 350)
  }
  function keyUp(e) {
    if (![' ', 'Enter'].includes(e.key) || !gesture.current) return
    e.preventDefault()
    const g = gesture.current; g.down = false; clearTimeout(g.timer)
    if (!g.long) { setKind(old => old === 'audio' ? 'video' : 'audio'); gesture.current = null }
    else if (phaseRef.current === 'recording') stop()
    else if (phaseRef.current === 'requesting') { discarded.current = true; generation.current++; setStage('idle'); toast('Удерживай кнопку после разрешения доступа.') }
  }

  const active = phase !== 'idle'
  const app = typeof document !== 'undefined' ? document.querySelector('.app') : null
  return <>
    <button type="button" className="send record-trigger" onPointerDown={begin} onKeyDown={keyDown} onKeyUp={keyUp} onContextMenu={e => e.preventDefault()} aria-label={kind === 'audio' ? 'Микрофон: удерживай для записи, нажми для видео' : 'Камера: удерживай для записи, нажми для голоса'}>{kind === 'audio' ? <Mic size={22} /> : <Camera size={22} />}</button>
    {active && app && createPortal(<div className={'recording-layer ' + (kind === 'video' ? 'with-video' : '')} role="region" aria-label="Запись сообщения">
      {kind === 'video' && <div className="capture-disc">{phase === 'recording' ? <video ref={live} autoPlay playsInline muted aria-label="Предпросмотр камеры" style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} /> : url ? <MediaPlayer kind="video" url={url} duration={seconds} preview /> : <div className="capture-wait" />}{phase === 'recording' && <svg className="capture-progress" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" pathLength="100" strokeDasharray={`${seconds / MAX_SECONDS * 100} 100`} /></svg>}</div>}
      {kind === 'video' && phase === 'recording' && <div className="camera-controls"><button onClick={switchCamera} disabled={!canSwitch} aria-label="Переключить камеру" title={canSwitch ? 'Переключить камеру' : 'Переключение недоступно в этом браузере'}><SwitchCamera size={22} /></button><button onClick={switchTorch} disabled={!torchAvailable} aria-label={torch ? 'Выключить вспышку' : 'Включить вспышку'} title={torchAvailable ? 'Вспышка' : 'Вспышка недоступна для этой камеры'}>{torch ? <Zap size={22} /> : <ZapOff size={22} />}</button><span>{facing === 'user' ? 'Фронтальная' : 'Основная'}</span>{!locked && <button onClick={() => { if (gesture.current) gesture.current.locked = true; setLocked(true) }} aria-label="Зафиксировать запись"><Lock size={19} /></button>}</div>}
      <div className="recording-bar">
        {(phase === 'recording' || phase === 'requesting') ? <><span className="recording-dot" /><span className="recording-time">{phase === 'requesting' ? 'Разрешение…' : format(seconds)}</span><button className="record-cancel" onClick={discard}>Отмена</button>{phase === 'recording' && <button className="record-stop" onClick={stop} aria-label="Закончить запись"><Square size={19} fill="currentColor" /></button>}</> : <><button className="record-trash" onClick={discard} aria-label="Удалить запись"><Trash2 size={22} /></button>{kind === 'audio' && url ? <MediaPlayer kind="audio" url={url} duration={seconds} preview /> : <span className="video-preview-label">Видеосообщение · {format(seconds)}</span>}<button className="record-send" disabled={phase === 'saving'} onClick={send} aria-label="Отправить запись"><Send size={21} /></button></>}
      </div>
    </div>, app)}
  </>
}
