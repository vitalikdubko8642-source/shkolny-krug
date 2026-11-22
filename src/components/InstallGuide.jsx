import { useState } from 'react'
import { isAndroid, isIOS, promptInstall } from '../pwa.js'

export default function InstallGuide({ onClose, canPrompt }) {
  const [message, setMessage] = useState('')
  const ios = isIOS()
  const android = isAndroid()
  const install = async () => {
    const accepted = await promptInstall()
    if (accepted) onClose()
    else setMessage('Установка не завершена. Можно воспользоваться меню браузера ниже.')
  }

  return (
    <div className="install-overlay" onClick={onClose}>
      <section className="install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => event.stopPropagation()}>
        <button className="install-close" onClick={onClose} aria-label="Закрыть">×</button>
        <img className="install-icon" src="./icon-192.png" alt="" />
        <h2 id="install-title">Школьный круг на телефоне</h2>
        <p>Открывай приложение с главного экрана. Новые версии будут приходить через интернет.</p>
        {canPrompt && <button className="btn" onClick={install}>Установить</button>}
        {message && <p role="status">{message}</p>}
        {ios ? (
          <div className="install-steps"><b>На iPhone</b><ol><li>Открой сайт в Safari.</li><li>Нажми «Поделиться» <span aria-label="поделиться">↑</span>.</li><li>Выбери «На экран Домой», затем «Добавить».</li></ol></div>
        ) : android ? (
          <div className="install-steps"><b>Через меню браузера</b><ol><li>Открой сайт в Chrome.</li><li>Нажми меню ⋮ и выбери «Установить приложение» или «Добавить на главный экран».</li><li>Подтверди установку.</li></ol></div>
        ) : (
          <div className="install-steps"><b>На телефоне</b><p>Открой эту страницу на телефоне. На Android воспользуйся меню Chrome, на iPhone — кнопкой «Поделиться» в Safari и пунктом «На экран Домой».</p></div>
        )}
        <p className="install-note">Пока это демоверсия: данные хранятся на устройстве и могут не перенестись из браузера в установленное приложение, особенно на iPhone.</p>
        <button className="install-done" onClick={onClose}>Понятно</button>
      </section>
    </div>
  )
}
