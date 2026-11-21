// Хранилище: всё, что пользователь делает, сохраняется в памяти браузера (localStorage).
// Состояние хранится локально. Отдельные тексты отправляются ИИ только по согласию пользователя.
import { useEffect, useState } from 'react'

// Номер версии в ключе: когда меняется устройство данных, старые сохранения не мешают новым
const KEY = 'shkolny-krug-v3'

export function load() {
  try {
    const state = JSON.parse(localStorage.getItem(KEY)) || {}
    if (state.user && Object.hasOwn(state.user, 'parentPhone')) delete state.user.parentPhone
    return state
  } catch { return {} }
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
