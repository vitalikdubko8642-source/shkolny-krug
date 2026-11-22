// Мини-игра «Быстрый счёт»: 30 секунд, решаешь как можно больше примеров.
// Соперники в прототипе — выдуманные ребята из чата со случайным результатом.
// За места: 1-е — 30 монет, 2-е — 20, 3-е — 10, за участие — 5.
// Общего рейтинга нет: итоги видны только в этом раунде (так советует ТЗ — чтобы не было травли).
import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { people } from '../data/demo.js'

const DURATION = 30
const PRIZES = [30, 20, 10]
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

// Случайный пример с целым ответом
export function makeTask() {
  const op = ['+', '−', '×', '÷'][rnd(0, 3)]
  if (op === '+') { const a = rnd(11, 89), b = rnd(5, 59); return { q: `${a} + ${b}`, a: a + b } }
  if (op === '−') { const a = rnd(30, 99), b = rnd(5, a - 1); return { q: `${a} − ${b}`, a: a - b } }
  if (op === '×') { const a = rnd(2, 9), b = rnd(3, 12); return { q: `${a} × ${b}`, a: a * b } }
  const b = rnd(2, 9), r = rnd(2, 12); return { q: `${b * r} ÷ ${b}`, a: r }
}

export function makeSequenceTask() {
  const start = rnd(1, 20), step = rnd(2, 8)
  return { q: `${start}, ${start + step}, ${start + step * 2}, ?`, a: start + step * 3 }
}

export default function Game({ title, chatTitle, players, user, onFinish, onExit, mode = 'math' }) {
  const [phase, setPhase] = useState('intro')   // intro → count → play → done
  const [count, setCount] = useState(3)
  const [left, setLeft] = useState(DURATION)
  const makeCurrentTask = mode === 'sequence' ? makeSequenceTask : makeTask
  const [task, setTask] = useState(makeCurrentTask)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [flash, setFlash] = useState(null)       // 'ok' | 'bad'
  const [result, setResult] = useState(null)
  const scoreRef = useRef(0)

  // Обратный отсчёт 3-2-1
  useEffect(() => {
    if (phase !== 'count') return
    if (count === 0) { setPhase('play'); return }
    const t = setTimeout(() => setCount((c) => c - 1), 700)
    return () => clearTimeout(t)
  }, [phase, count])

  // Конец игры: соперникам даём результат «около твоего», чтобы было интересно
  function finish() {
    const mine = scoreRef.current
    const rivals = players.map((nick) => ({ nick, score: rnd(Math.max(2, mine - 5), Math.max(7, mine + 4)) }))
    const table = [...rivals, { nick: user.nick, score: mine, me: true }].sort((a, b) => b.score - a.score || (a.me ? -1 : 1))
    const place = table.findIndex((r) => r.me) + 1
    // Ни одного верного ответа — монет нет (иначе можно просто жать «Начать» и копить)
    const reward = mine === 0 ? 0 : PRIZES[place - 1] ?? 5
    const today = new Date().toLocaleDateString('en-CA')
    const earned = user.gameRewardDate === today ? user.gameRewardTotal || 0 : 0
    const coins = Math.max(0, Math.min(reward, 50 - earned))
    setResult({ table, place, coins })
    setPhase('done')
  }

  // Таймер игры
  useEffect(() => {
    if (phase !== 'play') return
    if (left === 0) { finish(); return }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, left])

  const press = (k) => {
    if (phase !== 'play') return
    if (k === '⌫') return setAnswer((a) => a.slice(0, -1))
    if (k === '✓') {
      if (!answer) return
      const ok = Number(answer) === task.a
      if (ok) { scoreRef.current += 1; setScore(scoreRef.current) }
      setFlash(ok ? 'ok' : 'bad')
      setTimeout(() => setFlash(null), 250)
      setAnswer('')
      setTask(makeCurrentTask())
      return
    }
    if (answer.length < 4) setAnswer((a) => a + k)
  }

  // Ввод с клавиатуры компьютера — удобно жюри, если открыли на ноутбуке
  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('⌫')
      else if (e.key === 'Enter') press('✓')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <div className="topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Выйти"><Icon name="x" /></button>
        <div className="chat-head"><div className="t">{title}</div><div className="s">в чате «{chatTitle}»</div></div>
        {phase === 'play' && <span className="game-score">✓ {score}</span>}
      </div>

      <div className="game">
        {phase === 'intro' && (
          <div className="game-intro">
            <div className="game-emoji">🧮</div>
            <h2>{title}</h2>
            <p>За {DURATION} секунд {mode === 'sequence' ? 'продолжи как можно больше числовых рядов' : 'реши как можно больше примеров'}. Ошибка не отнимает очки — просто следующее задание.</p>
            <div className="prize-row">
              <span>🥇 30 🪙</span><span>🥈 20 🪙</span><span>🥉 10 🪙</span><span>участие 5 🪙</span>
            </div>
            <p className="sheet-note">Монеты тратятся на оформление профиля. Не больше 50 монет за день; общих рейтингов нет.</p>
            <p className="sheet-note">Играют: {players.map((p) => people[p]?.nick || p).join(', ')} и ты</p>
            <p className="sheet-note">В демоверсии соперники и их результаты вымышлены; игра проходит на этом устройстве.</p>
            <button className="btn" onClick={() => setPhase('count')}>Начать</button>
          </div>
        )}

        {phase === 'count' && <div className="game-count">{count || 'Старт!'}</div>}

        {phase === 'play' && (
          <>
            <div className="timer"><i style={{ width: (left / DURATION) * 100 + '%' }} /></div>
            <div className="time-left">{left} сек</div>
            <div className={'task' + (flash ? ' ' + flash : '')}>{task.q}{mode !== 'sequence' && ' ='}</div>
            <div className="answer-box">{answer || <span>?</span>}</div>
            <div className="numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((k) => (
                <button key={k} className={k === '✓' ? 'ok' : k === '⌫' ? 'del' : ''} onClick={() => press(k)}>{k}</button>
              ))}
            </div>
          </>
        )}

        {phase === 'done' && result && (
          <div className="game-intro">
            <div className="game-emoji">{score === 0 ? '🙈' : ['🥇', '🥈', '🥉'][result.place - 1] || '🎉'}</div>
            <h2>{score === 0 ? 'Не успел?' : result.place <= 3 ? `${result.place} место!` : 'Хорошая игра!'}</h2>
            {score === 0
              ? <p>Ни одного верного ответа — в этот раз без монет. Попробуй в следующем раунде!</p>
              : <p>Верных ответов: {score}. Ты получаешь <b>+{result.coins} 🪙</b></p>}
            <div className="result-table">
              {result.table.map((r, i) => (
                <div key={r.nick} className={r.me ? 'me' : ''}><span>{i + 1}</span><b>{r.nick}</b><span>{r.score}</span></div>
              ))}
            </div>
            <button className="btn" onClick={() => onFinish({ score, place: result.place, coins: result.coins, results: result.table.map(({ nick, score }) => ({ nick, score })) })}>Готово</button>
          </div>
        )}
      </div>
    </>
  )
}
