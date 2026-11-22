import { registerSW } from 'virtual:pwa-register'

// The install event is captured at startup, before the user opens the guide.
let installPrompt = null
let registration = null
let needRefresh = false
let installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
const listeners = new Set()
let snapshot = { canPrompt: false, installed, needRefresh }
const emit = () => {
  snapshot = { canPrompt: !!installPrompt, installed, needRefresh }
  listeners.forEach((listener) => listener())
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  installPrompt = event
  emit()
})
window.addEventListener('appinstalled', () => {
  installPrompt = null
  installed = true
  emit()
})
window.matchMedia('(display-mode: standalone)').addEventListener?.('change', (event) => {
  installed = event.matches || navigator.standalone === true
  emit()
})

export const subscribePwa = (listener) => { listeners.add(listener); return () => listeners.delete(listener) }
export const getPwaSnapshot = () => snapshot

export async function promptInstall() {
  if (!installPrompt) return false
  const prompt = installPrompt
  installPrompt = null
  emit()
  try {
    await prompt.prompt()
    const choice = await prompt.userChoice
    return choice.outcome === 'accepted'
  } catch {
    return false
  }
}

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isAndroid = () => /Android/i.test(navigator.userAgent)

// No forced reload: users choose when it is safe to interrupt an unfinished draft.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { needRefresh = true; emit() },
  onRegisteredSW(_url, reg) { registration = reg || null },
})

export async function applyUpdate() {
  if (needRefresh) await updateSW(true)
}

const checkForUpdate = () => {
  if (navigator.onLine && registration) registration.update().catch(() => {})
}
window.addEventListener('online', checkForUpdate)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForUpdate()
})
