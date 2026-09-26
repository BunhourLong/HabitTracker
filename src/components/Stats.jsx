import { currentStreak, today } from '../lib/dates'
import { crashTest } from '../lib/crashTest'

export default function Stats({ habits, loading }) {
  crashTest('stats')
  const date = today()
  const doneToday = habits.filter((h) => h.daily_logs.some((l) => l.log_date === date)).length
  const checkIns = habits.reduce((n, h) => n + h.daily_logs.length, 0)
  const bestStreak = Math.max(0, ...habits.map((h) => currentStreak(h.daily_logs)))

  const tiles = [
    ['Done today', `${doneToday}/${habits.length}`],
    ['Check-ins', checkIns],
    ['Best streak', `${bestStreak} day${bestStreak === 1 ? '' : 's'}`],
  ]

  return (
    <section className="stats" aria-label="Stats" aria-busy={loading}>
      {tiles.map(([label, value]) => (
        <div key={label} className="stat">
          <span className="stat-value">{loading ? '–' : value}</span>
          <span className="muted small">{label}</span>
        </div>
      ))}
    </section>
  )
}
