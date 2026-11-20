// Хранилище: всё, что пользователь делает, сохраняется в памяти браузера (localStorage).
// На сервер НИЧЕГО не уходит — это прототип, так требует ТЗ.
import { useEffect, useState } from 'react'

// Номер версии в ключе: когда меняется устройство данных, старые сохранения не мешают новым
const KEY = 'shkolny-krug-v3'

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* память недоступна — работаем без сохранения */ }
}

export function reset() {
  try { localStorage.removeItem(KEY) } catch { /* ничего */ }
}

// Хук: как useState, но значение ещё и сохраняется
export function usePersisted(initial) {
  const [state, setState] = useState(() => ({ ...initial, ...load() }))
  useEffect(() => { save(state) }, [state])
  return [state, setState]
}

export const now = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
