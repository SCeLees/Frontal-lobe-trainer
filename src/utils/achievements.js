// 成就定义 + 解锁检测
import { getGameRecords, getTotalSessions, getCurrentStreak } from './storage.js'
import { getGame } from '../games/registry.js'

export const GLOBAL_ACHIEVEMENTS = [
  { id: 'first-train',    icon: '🌱', name: '初次训练',   desc: '完成任意一个训练游戏' },
  { id: 'train-10',       icon: '🔥', name: '渐入佳境',   desc: '累计完成 10 次训练' },
  { id: 'streak-3',       icon: '📅', name: '三日之约',   desc: '连续打卡 3 天' },
  { id: 'streak-7',       icon: '⚡', name: '一周坚持',   desc: '连续打卡 7 天' },
]

// 达标判定（按游戏成就条件类型）
export function matchesStandard(record, cond) {
  if (!cond) cond = { type: 'accuracy', threshold: 90 }
  switch (cond.type) {
    case 'coin':
      return record.total > 0 && (record.score / record.total) >= (cond.threshold || 15)
    case 'complete':
      return record.score === record.total
    case 'clean':
      return record.score === record.total && !record[cond.field]
    case 'level':
      return record.score >= (cond.threshold || 6)
    case 'moves':
      return typeof record.moves === 'number' && record.moves <= record.total * (cond.threshold || 1.5)
    case 'accuracy':
    default:
      return record.accuracy >= (cond.threshold || 90)
  }
}

// 达标条件的人类可读描述
function standardDesc(name, cond) {
  if (!cond) cond = { type: 'accuracy', threshold: 90 }
  switch (cond.type) {
    case 'coin': return `「${name}」平均收益 ≥ ${cond.threshold} 金币/轮`
    case 'complete': return `完成「${name}」全部内容`
    case 'clean': return `零失误完成「${name}」`
    case 'level': return `「${name}」最高记录达到 ${cond.threshold} 位/关`
    case 'moves': return `「${name}」步数接近最优`
    case 'accuracy':
    default: return `「${name}」最佳准确率 ≥ ${cond.threshold}%`
  }
}

function repeatDesc(name, cond) {
  if (!cond) cond = { type: 'accuracy', threshold: 90 }
  switch (cond.type) {
    case 'coin': return `以 ≥${cond.threshold} 金币/轮完成「${name}」5 次`
    case 'complete': return `完成「${name}」全部内容 5 次`
    case 'clean': return `零失误完成「${name}」5 次`
    case 'level': return `「${name}」达到 ${cond.threshold} 位/关 5 次`
    case 'moves': return `高效完成「${name}」5 次`
    case 'accuracy':
    default: return `以 ≥${cond.threshold}% 准确率完成「${name}」5 次`
  }
}

// 各游戏"极限局"配置：最高难度档 + 零失误判定
export const PERFECT_CONFIG = {
  'digit-span':          { hard: 9,    type: 'accuracy' },
  'digit-memory':        { hard: 3,    type: 'level', threshold: 8 },
  'spatial-memory':      { hard: 5,    type: 'level', threshold: 6 },
  'n-back':              { hard: 4,    type: 'accuracy' },
  'memory-match':        { hard: 10,   type: 'moves' },
  'timed-match':         { hard: 10,   type: 'complete' },
  'stroop':              { hard: 24,   type: 'accuracy' },
  'go-no-go':            { hard: 1000, type: 'accuracy' },
  'stop-signal':         { hard: 350,  type: 'accuracy' },
  'flanker':             { hard: 1000, type: 'accuracy' },
  'brain-shift':         { hard: 1000, type: 'accuracy' },
  'dccs':                { hard: 4,    type: 'accuracy' },
  'trail-making':        { hard: 9,    type: 'clean', field: 'wrongClicks' },
  'task-switch':         { hard: 1500, type: 'accuracy' },
  'serial-addition':     { hard: 20,   type: 'accuracy' },
  'schulte-grid':        { hard: 7,    type: 'clean', field: 'wrongClicks' },
  'visual-search':       { hard: 7,    type: 'accuracy' },
  'tower-of-hanoi':      { hard: 6,    type: 'optimal' },
  'risk-decision':       { hard: 20,   type: 'coin', threshold: 15, field: 'riskyFails' },
}

// 判定是否为"最高难度零失误"局
export function isPerfectRun(record, gameId) {
  const cfg = PERFECT_CONFIG[gameId]
  if (!cfg) return false
  if (record.difficulty !== cfg.hard) return false
  switch (cfg.type) {
    case 'level':
      return record.score >= (cfg.threshold || 6)
    case 'moves':
      return typeof record.moves === 'number' && record.moves === record.total
    case 'complete':
      return record.score === record.total
    case 'clean':
      return record.score === record.total && !record[cfg.field]
    case 'optimal':
      return typeof record.moves === 'number' && record.moves === Math.pow(2, cfg.hard) - 1
    case 'coin':
      return record.total > 0
        && (record.score / record.total) >= (cfg.threshold || 15)
        && !(cfg.field && record[cfg.field])
    case 'accuracy':
    default:
      return record.score === record.total
  }
}

export function buildGameAchievements(meta) {
  const cond = getGame(meta.id)?.result?.achievement
  return [
    { id: `play-${meta.id}`,     icon: '🎮', name: `${meta.name} 首通`,   desc: `完成一次「${meta.name}」` },
    { id: `master-${meta.id}`,   icon: '💎', name: `${meta.name} 高手`,   desc: standardDesc(meta.name, cond) },
    { id: `repeat-${meta.id}`,   icon: '🔁', name: `${meta.name} 常客`,   desc: repeatDesc(meta.name, cond) },
    { id: `perfect-${meta.id}`,  icon: '⚡', name: `${meta.name} 极限`,   desc: `在最高难度下零失误完成「${meta.name}」5 次` },
  ]
}

export function getAllAchievementDefs() {
  return GLOBAL_ACHIEVEMENTS.map(a => ({ ...a, global: true }))
}

export function getUnlocked(gameId) {
  try {
    return JSON.parse(localStorage.getItem('pt_achievements')) || []
  } catch {
    return []
  }
}

export function isUnlocked(defId) {
  return getUnlocked().includes(defId)
}

function unlock(defId) {
  const list = getUnlocked()
  if (!list.includes(defId)) {
    list.push(defId)
    localStorage.setItem('pt_achievements', JSON.stringify(list))
    return true
  }
  return false
}

/**
 * 检测新解锁成就
 * @param {string} gameId 刚完成的游戏
 * @param {{name:string, icon:string}} meta 游戏元数据
 * @param {{score:number, total:number, accuracy:number}} result 成绩
 * @returns {Array} 新解锁的成就定义
 */
export function checkAchievements(gameId, meta, result) {
  const newly = []

  const gDefs = buildGameAchievements(meta)
  const records = getGameRecords(gameId)
  const cond = getGame(gameId)?.result?.achievement

  // 首通
  if (records.length >= 1 && unlock(`play-${gameId}`)) {
    newly.push(gDefs[0])
  }
  // 高手（按类型判定最佳达标）
  if (records.some(r => matchesStandard(r, cond)) && unlock(`master-${gameId}`)) {
    newly.push(gDefs[1])
  }
  // 常客（达标完成 5 次）
  const stdCount = records.filter(r => matchesStandard(r, cond)).length
  if (stdCount >= 5 && unlock(`repeat-${gameId}`)) {
    newly.push(gDefs[2])
  }
  // 极限（最高难度零失误 5 次）
  const perfectCount = records.filter(r => isPerfectRun(r, gameId)).length
  if (perfectCount >= 5 && unlock(`perfect-${gameId}`)) {
    newly.push(gDefs[3])
  }

  // 全局
  const sessions = getTotalSessions()
  const streak = getCurrentStreak()
  if (sessions >= 1 && unlock('first-train')) newly.push(GLOBAL_ACHIEVEMENTS[0])
  if (sessions >= 10 && unlock('train-10')) newly.push(GLOBAL_ACHIEVEMENTS[1])
  if (streak >= 3 && unlock('streak-3')) newly.push(GLOBAL_ACHIEVEMENTS[2])
  if (streak >= 7 && unlock('streak-7')) newly.push(GLOBAL_ACHIEVEMENTS[3])

  return newly
}
