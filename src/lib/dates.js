// Local calendar date as YYYY-MM-DD (not UTC).
export const toDay = (d) => d.toLocaleDateString('en-CA')
export const today = () => toDay(new Date())

// Consecutive days logged, ending today (or yesterday if today isn't ticked yet).
export function currentStreak(logs) {
  const days = new Set(logs.map((l) => l.log_date))
  const d = new Date()
  if (!days.has(toDay(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(toDay(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
