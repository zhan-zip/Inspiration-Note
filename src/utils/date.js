/** Date → 'YYYY-MM-DD'（本地时区） */
export function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 今天 'YYYY-MM-DD' */
export function todayStr() {
  return toDateStr(new Date())
}

/** 'YYYY-MM-DD' → Date（本地时区拆分，避免 UTC 偏移） */
export function fromDateStr(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * 判断一条 schedule 是否在指定日期生效
 * - once     ：date 相等
 * - weekly   ：星期相同
 * - monthly  ：几号相同
 * - yearly   ：月日相同
 */
export function scheduleActiveOn(schedule, dateStr) {
  if (schedule.type === 'once') return schedule.date === dateStr
  const sDate = fromDateStr(schedule.date)
  const tDate = fromDateStr(dateStr)
  if (schedule.type === 'weekly') return sDate.getDay() === tDate.getDay()
  if (schedule.type === 'monthly') return sDate.getDate() === tDate.getDate()
  if (schedule.type === 'yearly') {
    return sDate.getMonth() === tDate.getMonth() && sDate.getDate() === tDate.getDate()
  }
  return false
}
