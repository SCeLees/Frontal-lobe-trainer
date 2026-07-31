<template>
  <div class="game-detail" v-if="game">
    <!-- 顶栏 -->
    <header class="gd-header">
      <button class="gd-back" @click="goBack">← 返回</button>
      <span class="gd-title">{{ game.name }}</span>
      <span class="gd-icon">{{ game.icon }}</span>
    </header>

    <!-- 游戏区域：背景预览 + 规则覆盖层 / 正式游戏 -->
    <div class="gd-stage" @click.self="startGame">
      <!-- 背景游戏预览（半透明） -->
      <div class="gd-preview" :class="{ dimmed: phase === 'rules' }">
        <component
          v-if="gameComponent"
          :is="gameComponent"
          :key="gameKey"
          :difficulty="difficulty"
          :extra-options="extraOptions"
          :preview="phase === 'rules'"
          @done="onGameDone"
        />
      </div>

      <!-- 规则覆盖层 -->
      <div v-if="phase === 'rules'" class="gd-rules-overlay" @click="startGame">
        <div class="gd-rules-card" @click.stop>
          <h2>{{ game.name }}</h2>
          <p class="gd-desc">{{ game.description }}</p>
          <ul class="gd-rules-list">
            <li v-for="(rule, i) in game.rules" :key="i">{{ rule }}</li>
          </ul>

          <!-- 难度选择 -->
          <div v-if="hasDifficulty" class="gd-difficulty">
            <h4>难度设置</h4>
            <div v-if="game.difficulty.options && game.difficulty.options.length" class="gd-diff-group">
              <span class="gd-diff-label">{{ game.difficulty.label }}</span>
              <div class="gd-diff-options">
                <button
                  v-for="opt in game.difficulty.options"
                  :key="opt.value"
                  class="gd-diff-btn"
                  :class="{ active: difficulty === opt.value }"
                  @click="difficulty = opt.value"
                >{{ opt.label }}</button>
              </div>
            </div>
            <div v-else class="gd-diff-group">
              <span class="gd-diff-label">{{ game.difficulty.label }}：{{ difficulty }}</span>
              <input
                type="range"
                v-model.number="difficulty"
                :min="game.difficulty.min"
                :max="game.difficulty.max"
                :step="game.difficulty.step"
                class="gd-slider"
              />
            </div>

            <!-- 额外选项 -->
            <template v-if="game.extraOptions">
              <div v-for="(opt, key) in game.extraOptions" :key="key" class="gd-diff-group">
                <span class="gd-diff-label">{{ opt.label }}</span>
                <div class="gd-diff-options">
                  <button
                    v-for="o in opt.options"
                    :key="o.value"
                    class="gd-diff-btn"
                    :class="{ active: extraOptions[key] === o.value }"
                    @click="extraOptions[key] = o.value"
                  >{{ o.label }}</button>
                </div>
              </div>
            </template>
          </div>

          <p class="gd-hint">点击任意位置开始游戏</p>
        </div>
      </div>

      <!-- 结果覆盖层 -->
      <div v-if="phase === 'result'" class="gd-result-overlay" @click="phase = 'rules'">
        <div class="gd-result-card" @click.stop>
          <div class="gd-result-icon">{{ resultIcon }}</div>
          <h2>{{ resultTitle }}</h2>
          <div class="gd-result-stats">
            <div class="gd-stat">
              <span class="gd-stat-val">{{ result.score }}</span>
              <span class="gd-stat-label">{{ scoreLabel }}</span>
            </div>
            <div class="gd-stat">
              <span class="gd-stat-val">{{ result.total }}</span>
              <span class="gd-stat-label">{{ totalLabel }}</span>
            </div>
            <div class="gd-stat">
              <span class="gd-stat-val">{{ accuracyValue }}</span>
              <span class="gd-stat-label">{{ accuracyLabel }}</span>
            </div>
          </div>
          <div class="gd-result-actions">
            <button class="gd-btn primary" @click="startGame">再来一次</button>
            <button class="gd-btn" @click="phase = 'rules'">返回规则</button>
          </div>
        </div>
      </div>

      <!-- 新成就 toast 队列（右上角，依次弹出） -->
      <div class="gd-ach-toasts" aria-live="polite">
        <transition-group name="ach">
          <div
            v-for="t in toasts"
            :key="t.uid"
            class="gd-ach-toast"
            @click="dismissToast(t.uid)"
          >
            <span class="gd-ach-toast-icon">{{ t.icon }}</span>
            <div class="gd-ach-toast-body">
              <span class="gd-ach-toast-tag">成就解锁</span>
              <strong>{{ t.name }}</strong>
            </div>
          </div>
        </transition-group>
      </div>
    </div>
  </div>

  <div v-else class="gd-not-found">
    <p>游戏未找到</p>
    <button @click="goBack">返回主页</button>
  </div>
</template>

<script setup>
import { ref, computed, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getGame } from '../games/registry.js'
import { recordGame } from '../utils/storage.js'
import { sounds } from '../utils/sound.js'
import { checkAchievements } from '../utils/achievements.js'

const props = defineProps({ id: String })
const router = useRouter()

const game = computed(() => getGame(props.id))
const hasDifficulty = computed(() => {
  const g = game.value
  if (!g) return false
  const d = g.difficulty
  if (!d) return false
  return (d.options && d.options.length > 0) || d.min !== undefined || d.step !== undefined
})
const phase = ref('rules')   // 'rules' | 'playing' | 'result'
const gameComponent = shallowRef(null)
const difficulty = ref(4)
const extraOptions = ref({})
const result = ref({ score: 0, total: 0, accuracy: 0 })
const gameKey = ref(0)
const toasts = ref([])
let toastUid = 0

// 根据游戏配置初始化默认值
watch(game, (g) => {
  if (!g) return
  difficulty.value = g.difficulty.default ?? g.difficulty.options?.[0]?.value ?? 4
  extraOptions.value = {}
  if (g.extraOptions) {
    for (const [key, opt] of Object.entries(g.extraOptions)) {
      extraOptions.value[key] = opt.default ?? opt.options[0].value
    }
  }
  // 预加载组件
  loadComponent()
}, { immediate: true })

async function loadComponent() {
  const g = game.value
  if (!g) return
  const mod = await g.component()
  gameComponent.value = mod.default
}

function startGame() {
  gameKey.value++
  phase.value = 'playing'
}

function onGameDone(data) {
  const acc = data.accuracy !== undefined
    ? Math.round(data.accuracy)
    : (data.total > 0 ? Math.round((data.score / data.total) * 100) : 0)
  result.value = {
    score: data.score ?? 0,
    total: data.total ?? 0,
    accuracy: acc,
    moves: data.moves,
    timeUsed: data.timeUsed,
    difficulty: data.difficulty,
    wrongClicks: data.wrongClicks,
    riskyFails: data.riskyFails,
  }
  // 记录成绩 + 胜利音效（完整字段：moves/timeUsed/difficulty 等供最佳纪录与成就使用）
  recordGame(props.id, { ...result.value })
  if (acc >= 50) sounds.win()

  // 检测新成就：依次从右上角弹出
  const g = game.value
  const newly = checkAchievements(props.id, { id: props.id, name: g?.name || '', icon: g?.icon || '' }, result.value)
  newly.forEach((a, i) => {
    setTimeout(() => pushToast(a), i * 900)
  })
  if (newly.length > 0) sounds.achievement()

  phase.value = 'result'
}

function pushToast(a) {
  const uid = ++toastUid
  toasts.value.push({ uid, icon: a.icon, name: a.name })
  setTimeout(() => dismissToast(uid), 4500)
}

function dismissToast(uid) {
  toasts.value = toasts.value.filter(t => t.uid !== uid)
}

// 结果卡指标标签（可按游戏定制）
const scoreLabel = computed(() => game.value?.result?.scoreLabel || '得分')
const totalLabel = computed(() => game.value?.result?.totalLabel || '总轮次')
const accuracyLabel = computed(() => game.value?.result?.accuracyLabel || '准确率')
const accUnit = computed(() => game.value?.result?.accuracyUnit || 'accuracy')
const accSuffix = computed(() => game.value?.result?.suffix || '')
const accuracyValue = computed(() => {
  const r = result.value
  if (accUnit.value === 'coin') {
    const avg = r.total > 0 ? r.score / r.total : 0
    return avg.toFixed(1) + ' 金币'
  }
  if (accUnit.value === 'level') {
    return r.score + accSuffix.value
  }
  if (accUnit.value === 'moves') {
    return typeof r.moves === 'number' ? r.moves + ' 步' : '—'
  }
  if (accUnit.value === 'time') {
    return typeof r.timeUsed === 'number' ? r.timeUsed + ' 秒' : '—'
  }
  return r.accuracy + '%'
})

const resultIcon = computed(() => {
  const acc = result.value.accuracy
  if (acc >= 90) return '🏆'
  if (acc >= 70) return '🎯'
  if (acc >= 50) return '📚'
  return '💪'
})

const resultTitle = computed(() => {
  const acc = result.value.accuracy
  if (acc >= 90) return '太棒了！'
  if (acc >= 70) return '表现不错！'
  if (acc >= 50) return '继续加油！'
  return '多加练习！'
})

function goBack() {
  router.push({ name: 'home' })
}
</script>

<style scoped>
.game-detail {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%);
  color: #e2e8f0;
}

.gd-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 24px;
  background: rgba(15, 23, 42, 0.7);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(16px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.gd-back {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #cbd5e1;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}
.gd-back:hover {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.2);
  transform: translateX(-2px);
}

.gd-title {
  flex: 1;
  font-size: 1.05rem;
  font-weight: 600;
}
.gd-icon { font-size: 1.5rem; }

.gd-stage {
  position: relative;
  min-height: calc(100vh - 57px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gd-preview {
  width: 100%;
  min-height: calc(100vh - 57px);
  max-width: 720px;
  margin: 0 auto;
  transition: opacity 0.3s, filter 0.3s;
}
.gd-preview.dimmed {
  opacity: 0.35;
  filter: blur(4px);
  pointer-events: none;
}

/* 规则覆盖层 */
.gd-rules-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  z-index: 10;
  cursor: pointer;
}

.gd-rules-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  padding: 36px 32px;
  max-width: 500px;
  width: 92%;
  cursor: default;
  box-shadow: var(--shadow-lg);
  border: var(--glass-border);
  position: relative;
  overflow: hidden;
}

.gd-rules-card::before {
  content: '';
  position: absolute;
  top: 0; left: 16px; right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
}

.gd-rules-card h2 {
  margin: 0 0 10px;
  font-size: 1.6rem;
  font-weight: 700;
  text-align: center;
}

.gd-desc {
  text-align: center;
  color: var(--color-dark-text-secondary);
  font-size: 0.92rem;
  margin: 0 0 22px;
  line-height: 1.6;
}

.gd-rules-list {
  margin: 0 0 22px;
  padding: 0 0 0 22px;
  font-size: 0.9rem;
  line-height: 1.9;
  color: #cbd5e1;
}

/* 难度设置 */
.gd-difficulty {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 18px;
}
.gd-difficulty h4 {
  margin: 0 0 14px;
  font-size: 0.8rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.gd-diff-group {
  margin-bottom: 12px;
}
.gd-diff-group:last-child { margin-bottom: 0; }
.gd-diff-label {
  display: block;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 8px;
  font-weight: 500;
}

.gd-diff-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.gd-diff-btn {
  padding: 8px 18px;
  border: 1.5px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.02);
  color: #94a3b8;
  border-radius: 50px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}
.gd-diff-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  box-shadow: 0 0 12px rgba(59,130,246,0.3);
}
.gd-diff-btn:hover:not(.active) {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.2);
}

.gd-slider {
  width: 100%;
  accent-color: var(--color-primary);
}

.gd-hint {
  text-align: center;
  color: #64748b;
  font-size: 0.82rem;
  margin: 0;
  font-weight: 500;
}

/* 结果覆盖层 */
.gd-result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.7);
  z-index: 10;
  cursor: pointer;
}

.gd-result-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  padding: 36px 32px;
  max-width: 400px;
  width: 92%;
  text-align: center;
  cursor: default;
  box-shadow: var(--shadow-lg);
  border: var(--glass-border);
  animation: resultPop 0.4s ease;
  position: relative;
  overflow: hidden;
}

.gd-result-card::before {
  content: '';
  position: absolute;
  top: 0; left: 16px; right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
}

@keyframes resultPop {
  from { transform: scale(0.9); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.gd-result-icon {
  font-size: 3rem;
  margin-bottom: 8px;
}
.gd-result-card h2 {
  margin: 0 0 20px;
  font-size: 1.4rem;
}

.gd-result-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
}

.gd-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.gd-stat-val {
  font-size: 1.6rem;
  font-weight: 700;
  color: #3b82f6;
}
.gd-stat-label {
  font-size: 0.75rem;
  color: #64748b;
}

.gd-result-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.gd-btn {
  padding: 11px 24px;
  border: 1.5px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #cbd5e1;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}
.gd-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
}
.gd-btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  font-weight: 600;
}
.gd-btn.primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59,130,246,0.3);
}

/* 新成就 toast（右上角队列） */
.gd-ach-toasts {
  position: fixed;
  top: 70px;
  right: 16px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.gd-ach-toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
  padding: 12px 16px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-left: 3px solid #fbbf24;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.gd-ach-toast::before {
  content: '';
  position: absolute;
  top: 0; left: 12px; right: 12px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}

.gd-ach-toast-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.gd-ach-toast-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.gd-ach-toast-tag {
  font-size: 0.65rem;
  color: #fbbf24;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.gd-ach-toast-body strong {
  font-size: 0.9rem;
  font-weight: 700;
}

/* 入场/离场动画 */
.ach-enter-active, .ach-leave-active {
  transition: all 0.4s ease;
}
.ach-enter-from {
  opacity: 0;
  transform: translateX(60px);
}
.ach-leave-to {
  opacity: 0;
  transform: translateX(60px);
}
.ach-leave-active {
  position: absolute;
  right: 0;
  width: 100%;
}

.gd-not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #0f172a;
  color: #94a3b8;
}
.gd-not-found button {
  padding: 10px 22px;
  border: 1px solid rgba(255,255,255,0.2);
  background: transparent;
  color: #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
}
</style>
