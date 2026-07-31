// 本地成绩记录工具（localStorage）
const KEY = 'pt_records'
const PROFILE_KEY = 'pt_profile'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

/**
 * 记录一次游戏成绩
 * @param {string} gameId 游戏 id
 * @param {{ score:number, total:number, accuracy:number, timeUsed?:number, moves?:number }} result 成绩
 */
export function recordGame(gameId, result) {
  const data = load()
  const list = data[gameId] || []
  list.push({
    ...result,
    ts: Date.now(),
  })
  // 保留最近 100 条
  if (list.length > 100) list.splice(0, list.length - 100)
  data[gameId] = list
  save(data)

  // 每日打卡
  const today = new Date().toISOString().slice(0, 10)
  const profile = loadProfile()
  if (profile.streakDays[today] === undefined) {
    profile.streakDays[today] = true
    profile.totalSessions++
  }
  profile.lastGame = { gameId, ts: Date.now() }
  saveProfile(profile)
}

export function getGameRecords(gameId) {
  return load()[gameId] || []
}

/**
 * 按指标选取最佳记录
 * @param {string} gameId
 * @param {'accuracy'|'score'|'time'|'moves'|'coin'} metric
 * @returns {object|null}
 */
export function getBestRecord(gameId, metric = 'accuracy') {
  const list = load()[gameId] || []
  if (!list.length) return null

  if (metric === 'time') {
    // 只统计完成的记录（timeUsed 存在），取最快
    const completed = list.filter(r => typeof r.timeUsed === 'number')
    if (completed.length) {
      return completed.reduce((a, b) => (a.timeUsed < b.timeUsed ? a : b))
    }
    return null
  }
  if (metric === 'moves') {
    const withMoves = list.filter(r => typeof r.moves === 'number')
    if (withMoves.length) {
      return withMoves.reduce((a, b) => (a.moves < b.moves ? a : b))
    }
    return null
  }
  if (metric === 'score') {
    return list.reduce((a, b) => (a.score > b.score ? a : b))
  }
  // accuracy / coin：按 accuracy 最大（coin 游戏 accuracy=平均收益×100，同样越大越好）
  return list.reduce((a, b) => (a.accuracy > b.accuracy ? a : b))
}

export function getBestScore(gameId, metric = 'accuracy') {
  const best = getBestRecord(gameId, metric)
  return best || null
}

export function getTotalSessions() {
  return loadProfile().totalSessions
}

export function getStreakDays() {
  return loadProfile().streakDays
}

// ---- Profile ----
function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || defaultProfile()
  } catch {
    return defaultProfile()
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

function defaultProfile() {
  return { streakDays: {}, totalSessions: 0, lastGame: null }
}

/** 最近 84 天的打卡数据（含未来补全，供热力图） */
export function getLast84Days() {
  const streak = getStreakDays()
  const days = []
  const today = new Date()
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    days.push({ date: key, active: !!streak[key] })
  }
  return days
}

/** 连续打卡天数 */
export function getCurrentStreak() {
  const streak = getStreakDays()
  let count = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (streak[key]) {
      count++
    } else if (i > 0) {
      break
    }
  }
  return count
}

/** 清除全部训练数据（成绩/打卡/成就），保留音效与引导偏好 */
export function clearAllData() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem('pt_achievements')
  } catch {}
}
