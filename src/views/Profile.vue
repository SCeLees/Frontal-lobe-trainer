<template>
  <div class="profile-page">
    <header class="page-header">
      <button class="back-btn" @click="$router.push({ name: 'home' })">← 返回</button>
      <h1>我的训练</h1>
    </header>

    <main class="page-main">
      <!-- 顶部统计 -->
      <div class="stat-row">
        <div class="stat-card">
          <span class="stat-val">{{ totalSessions }}</span>
          <span class="stat-label">累计训练次数</span>
        </div>
        <div class="stat-card">
          <span class="stat-val">{{ currentStreak }}</span>
          <span class="stat-label">连续打卡天数</span>
        </div>
        <div class="stat-card">
          <span class="stat-val">{{ playedGames }}</span>
          <span class="stat-label">玩过游戏数</span>
        </div>
      </div>

      <!-- 雷达图 -->
      <section class="panel">
        <h2>五大领域能力</h2>
        <div class="radar-wrap">
          <svg :viewBox="`0 0 ${size} ${size}`" class="radar">
            <!-- 背景网格 -->
            <polygon
              v-for="lvl in [0.25, 0.5, 0.75, 1]"
              :key="lvl"
              :points="gridPoints(lvl)"
              class="radar-grid"
            />
            <!-- 轴 -->
            <line
              v-for="(c, i) in cats"
              :key="'ax-' + i"
              :x1="cx" :y1="cy"
              :x2="vertex(i, 1).x" :y2="vertex(i, 1).y"
              class="radar-axis"
            />
            <!-- 数据多边形 -->
            <polygon :points="dataPoints" class="radar-fill" />
            <!-- 数据点 -->
            <circle
              v-for="(c, i) in cats"
              :key="'pt-' + i"
              :cx="vertex(i, valueOf(c.key)).x"
              :cy="vertex(i, valueOf(c.key)).y"
              r="4"
              class="radar-dot"
            />
          </svg>
          <div class="radar-labels">
            <span
              v-for="(c, i) in cats"
              :key="'lb-' + i"
              class="radar-label"
              :style="{ left: labelPos(i).x + '%', top: labelPos(i).y + '%', color: c.color }"
            >{{ c.label }} {{ valueOf(c.key) }}</span>
          </div>
        </div>
      </section>

      <!-- 打卡日历 -->
      <section class="panel">
        <h2>训练日历（近 12 周）</h2>
        <div class="calendar">
          <span
            v-for="d in days"
            :key="d.date"
            class="cal-cell"
            :class="{ active: d.active }"
            :title="d.date + (d.active ? ' · 已训练' : '')"
          ></span>
        </div>
      </section>

      <!-- 各游戏最佳 -->
      <section class="panel">
        <h2>各游戏最佳成绩</h2>
        <div class="best-grid">
          <div v-for="g in bestList" :key="g.id" class="best-card">
            <span class="best-icon" :style="{ background: g.color + '14' }">{{ g.icon }}</span>
            <div class="best-info">
              <strong>{{ g.name }}</strong>
              <span class="best-acc">{{ g.displayValue.label }} {{ g.displayValue.value }}</span>
              <svg
                v-if="g.spark.length >= 2"
                class="spark"
                viewBox="0 0 96 26"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  :points="sparkPath(g.spark)"
                  fill="none"
                  :stroke="g.color"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span v-else class="best-acc dim">暂无趋势数据</span>
            </div>
          </div>
          <p v-if="bestList.length === 0" class="empty-hint">还没有训练记录，去玩一个游戏吧！</p>
        </div>
      </section>

      <!-- 数据管理 -->
      <section class="panel danger-zone">
        <h2>数据管理</h2>
        <p class="danger-desc">清除所有训练成绩、打卡记录和成就。此操作不可恢复。</p>
        <button class="danger-btn" @click="confirmClear">🗑️ 清除所有数据</button>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getLast84Days, getCurrentStreak, getTotalSessions, getBestRecord, getGameRecords, clearAllData } from '../utils/storage.js'
import { getGame } from '../games/registry.js'

const size = 300
const cx = size / 2
const cy = size / 2
const radius = size / 2 - 30

const cats = [
  { key: 'working-memory',       label: '工作记忆',   color: '#3b82f6' },
  { key: 'inhibitory-control',   label: '抑制控制',   color: '#ef4444' },
  { key: 'cognitive-flex',       label: '认知灵活性', color: '#8b5cf6' },
  { key: 'attention',            label: '注意力',     color: '#22c55e' },
  { key: 'planning',             label: '计划与决策', color: '#f59e0b' },
]

// 游戏 → 领域映射
const GAME_CATS = {
  'digit-span': 'working-memory', 'digit-memory': 'working-memory',
  'spatial-memory': 'working-memory', 'n-back': 'working-memory',
  'memory-match': 'working-memory', 'timed-match': 'working-memory',
  'serial-addition': 'working-memory',
  'stroop': 'inhibitory-control', 'go-no-go': 'inhibitory-control',
  'stop-signal': 'inhibitory-control', 'flanker': 'inhibitory-control',
  'brain-shift': 'cognitive-flex', 'dccs': 'cognitive-flex', 'trail-making': 'cognitive-flex', 'task-switch': 'cognitive-flex',
  'schulte-grid': 'attention', 'visual-search': 'attention',
  'tower-of-hanoi': 'planning', 'risk-decision': 'planning',
}

const GAME_META = {
  'digit-span': { name: '数字回溯', icon: '🧠', color: '#3b82f6' },
  'digit-memory': { name: '数字记忆测试', icon: '🔢', color: '#3b82f6' },
  'spatial-memory': { name: '空间记忆', icon: '📋', color: '#3b82f6' },
  'n-back': { name: 'N-Back', icon: '🐾', color: '#3b82f6' },
  'memory-match': { name: '卡片配对', icon: '🃏', color: '#3b82f6' },
  'timed-match': { name: '限时翻牌配对', icon: '⏳', color: '#3b82f6' },
  'serial-addition': { name: '连续加法', icon: '🧮', color: '#3b82f6' },
  'stroop': { name: 'Stroop 测验', icon: '🛑', color: '#ef4444' },
  'go-no-go': { name: 'Go/No-Go', icon: '🚦', color: '#ef4444' },
  'stop-signal': { name: '停止信号', icon: '🚫', color: '#ef4444' },
  'flanker': { name: 'Flanker 任务', icon: '🏹', color: '#ef4444' },
  'brain-shift': { name: 'Brain Shift', icon: '⚡', color: '#8b5cf6' },
  'dccs': { name: 'DCCS 卡片分类', icon: '🎨', color: '#8b5cf6' },
  'trail-making': { name: '交替连线', icon: '🔗', color: '#8b5cf6' },
  'task-switch': { name: '任务切换', icon: '🔀', color: '#8b5cf6' },
  'schulte-grid': { name: '舒尔特表', icon: '🎯', color: '#22c55e' },
  'visual-search': { name: '视觉搜索', icon: '🔍', color: '#22c55e' },
  'tower-of-hanoi': { name: '汉诺塔', icon: '🗼', color: '#f59e0b' },
  'risk-decision': { name: '风险决策', icon: '⚖️', color: '#f59e0b' },
}

const totalSessions = ref(0)
const currentStreak = ref(0)
const bestScores = ref({})
const days = ref([])

onMounted(() => {
  totalSessions.value = getTotalSessions()
  currentStreak.value = getCurrentStreak()
  // 按每个游戏的指标类型选取最佳记录
  bestScores.value = {}
  for (const id of Object.keys(GAME_META)) {
    const metric = getGame(id)?.result?.bestMetric || 'accuracy'
    const rec = getBestRecord(id, metric)
    if (rec) {
      bestScores.value[id] = {
        record: rec,
        unit: getGame(id)?.result?.accuracyUnit || 'accuracy',
        suffix: getGame(id)?.result?.suffix || '',
      }
    }
  }
  days.value = getLast84Days()
})

const playedGames = computed(() => Object.keys(bestScores.value).length)

function vertex(i, ratio) {
  const angle = (-90 + i * 72) * (Math.PI / 180)
  return {
    x: cx + radius * ratio * Math.cos(angle),
    y: cy + radius * ratio * Math.sin(angle),
  }
}

function gridPoints(lvl) {
  return cats.map((_, i) => {
    const p = vertex(i, lvl)
    return `${p.x},${p.y}`
  }).join(' ')
}

function valueOf(catKey) {
  const scores = Object.entries(bestScores.value)
    .filter(([id]) => GAME_CATS[id] === catKey)
    .map(([, b]) => {
      const r = b.record
      if (b.unit === 'coin') {
        // 平均收益换算到 0-100
        return Math.min(100, (r.score / r.total) * 5)
      }
      if (b.unit === 'level') {
        return Math.min(100, r.score)
      }
      if (b.unit === 'moves') {
        // 每次翻开两张算1步，最优步数 = 对数 = record.total
        return Math.min(100, (r.total / Math.max(1, r.moves)) * 100)
      }
      if (b.unit === 'time') {
        // 完成度
        return Math.min(100, (r.score / r.total) * 100)
      }
      return r.accuracy
    })
  if (!scores.length) return 0
  return Math.round(Math.min(100, scores.reduce((a, b) => a + b, 0) / scores.length))
}

const dataPoints = computed(() =>
  cats.map((c, i) => {
    const p = vertex(i, Math.min(1, valueOf(c.key) / 100))
    return `${p.x},${p.y}`
  }).join(' ')
)

function labelPos(i) {
  const angle = (-90 + i * 72) * (Math.PI / 180)
  return {
    x: 50 + 46 * Math.cos(angle),
    y: 50 + 46 * Math.sin(angle),
  }
}

const bestList = computed(() =>
  Object.entries(bestScores.value)
    .map(([id, b]) => {
      const r = b.record
      const recent = getGameRecords(id).slice(-10)
      return {
        id,
        ...GAME_META[id],
        unit: b.unit,
        suffix: b.suffix,
        displayValue: displayBest(b.unit, r),
        spark: recent.map(rec => metricToValue(b.unit, rec)),
      }
    })
    .sort((a, b2) => a.id.localeCompare(b2.id))
)

// 将单条记录按指标换算为 0-100 分数（用于折线图）
function metricToValue(unit, rec) {
  if (unit === 'coin') return Math.min(100, (rec.score / rec.total) * 5)
  if (unit === 'level') return Math.min(100, rec.score)
  if (unit === 'moves') return Math.min(100, (rec.total / Math.max(1, rec.moves)) * 100)
  if (unit === 'time') return Math.min(100, (rec.score / rec.total) * 100)
  return rec.accuracy
}

// 迷你折线图 path：点序列 → SVG path
function sparkPath(points, w = 96, h = 26) {
  if (points.length < 2) return ''
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - ((p - min) / range) * (h - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function displayBest(unit, r) {
  if (unit === 'coin') {
    const avg = r.total > 0 ? (r.score / r.total).toFixed(1) : '0'
    return { label: '最高平均收益', value: `${avg} 金币/轮` }
  }
  if (unit === 'level') {
    return { label: '最佳记录', value: `第 ${r.score}${r.suffix}` }
  }
  if (unit === 'moves') {
    return { label: '最少步数', value: `${r.moves} 步` }
  }
  if (unit === 'time') {
    return { label: '最快用时', value: `${r.timeUsed} 秒` }
  }
  return { label: '最佳准确率', value: `${r.accuracy}%` }
}

function confirmClear() {
  if (window.confirm('确定要清除所有训练数据吗？此操作不可恢复。')) {
    clearAllData()
    window.location.reload()
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--color-bg-grad);
  background-attachment: fixed;
  color: var(--color-text);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(15,23,42,0.7);
  backdrop-filter: blur(16px);
  position: sticky;
  top: 0;
  z-index: 20;
}
.page-header h1 {
  font-size: 1.1rem;
  font-weight: 700;
}

.back-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: #cbd5e1;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}
.back-btn:hover {
  background: rgba(255,255,255,0.12);
  transform: translateX(-2px);
}

.page-main {
  max-width: 860px;
  margin: 0 auto;
  padding: 28px 24px 48px;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
}
.stat-val {
  display: block;
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #60a5fa, #22d3ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.stat-label {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.panel {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}
.panel h2 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 18px;
}

/* 雷达图 */
.radar-wrap {
  position: relative;
  max-width: 340px;
  margin: 0 auto;
}
.radar {
  width: 100%;
  height: auto;
}
.radar-grid {
  fill: none;
  stroke: rgba(255,255,255,0.08);
  stroke-width: 1;
}
.radar-axis {
  stroke: rgba(255,255,255,0.12);
  stroke-width: 1;
}
.radar-fill {
  fill: rgba(59,130,246,0.18);
  stroke: #3b82f6;
  stroke-width: 2;
  stroke-linejoin: round;
}
.radar-dot {
  fill: #22d3ee;
  stroke: rgba(255,255,255,0.3);
  stroke-width: 1;
}
.radar-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.radar-label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

/* 日历 */
.calendar {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 5px;
  max-width: 560px;
  margin: 0 auto;
}
.cal-cell {
  aspect-ratio: 1;
  border-radius: 3px;
  background: rgba(255,255,255,0.05);
}
.cal-cell.active {
  background: linear-gradient(135deg, #3b82f6, #22d3ee);
}

/* 最佳成绩 */
.best-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.best-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
}
.best-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}
.best-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.best-info strong {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.best-acc {
  font-size: 0.72rem;
  color: var(--color-cyan);
}
.best-acc.dim {
  color: var(--color-text-muted);
}

.spark {
  width: 100%;
  height: 24px;
  margin-top: 4px;
  opacity: 0.85;
}

.empty-hint {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  padding: 30px 0;
}

/* 危险区 */
.danger-zone {
  border-color: rgba(248, 113, 113, 0.2);
}
.danger-desc {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin-bottom: 14px;
}
.danger-btn {
  padding: 10px 22px;
  border: 1.5px solid rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.08);
  color: #f87171;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.danger-btn:hover {
  background: rgba(248, 113, 113, 0.16);
  border-color: #f87171;
  transform: translateY(-1px);
}

@media (max-width: 600px) {
  .stat-row {
    grid-template-columns: 1fr;
  }
  .page-main {
    padding: 20px 12px 32px;
  }
}
</style>
