import { useState } from 'react'
import Icon from '../components/Icon.jsx'

const API = import.meta.env.VITE_JURY_API || 'https://shkolny-krug-jury-demo.okla-school-8642.workers.dev'
async function request(action, data) {
  const response = await fetch(`${API}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), cache: 'no-store' })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Не удалось выполнить действие.')
  return result
}

export default function Moderator({ onBack }) {
  const [secret, setSecret] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = async () => {
    setBusy(true); setError('')
    try { const result = await request('moderator-list', { secret }); setReports(result.reports); setAuthenticated(true) }
    catch (e) { setError(e.message || 'Нет связи с сервером.') } finally { setBusy(false) }
  }
  const decide = async (id, decision) => {
    setBusy(true); setError('')
    try { await request('moderator-decision', { secret, id, decision }); const result = await request('moderator-list', { secret }); setReports(result.reports) }
    catch (e) { setError(e.message || 'Не удалось сохранить решение.') } finally { setBusy(false) }
  }
  return <>
    <div className="topbar"><button className="icon-btn" onClick={onBack} aria-label="Назад"><Icon name="back" /></button><h1>Модерация</h1>{authenticated && <button className="icon-btn" onClick={refresh} aria-label="Обновить" disabled={busy}><Icon name="more" /></button>}</div>
    <div className="scroll moderator-screen">
      {!authenticated ? <form className="jury-form" onSubmit={e => { e.preventDefault(); refresh() }}><h2>Вход для модератора</h2><p>Введи личный код модератора. Он не совпадает с кодами жюри.</p><label htmlFor="moderator-secret">Код модератора</label><input id="moderator-secret" type="password" autoComplete="off" value={secret} onChange={e => setSecret(e.target.value)} />{error && <p className="jury-error" role="alert">{error}</p>}<button className="btn" disabled={busy || !secret}>{busy ? 'Проверяем…' : 'Войти'}</button></form> : <><p>Здесь только сообщения, на которые пожаловались. Окончательное решение принимаешь ты.</p>{error && <p className="jury-error" role="alert">{error}</p>}{!reports.length && <div className="empty"><b>Новых жалоб нет</b><span>Когда участник пожалуется на сообщение, оно появится здесь.</span></div>}{reports.map(report => <article className="moderator-report" key={report.id}><span>{new Date(report.createdAt).toLocaleString('ru-RU')}</span><b>{report.author}</b><blockquote>{report.snapshot}</blockquote><p>Причина: {report.reason}{report.details ? ` — ${report.details}` : ''}</p><small>От: {report.reporter}</small><div className="moderator-actions"><button className="mini-btn" disabled={busy} onClick={() => decide(report.id, 'keep')}>Оставить</button><button className="mini-btn" disabled={busy} onClick={() => decide(report.id, 'remove')}>Удалить сообщение</button></div></article>)}</>}
    </div>
  </>
}
