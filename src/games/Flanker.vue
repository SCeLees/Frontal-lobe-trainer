<template>
  <div class="fl-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="fl-center">
      <div class="fl-preview-row">
        <span class="fl-arrow">←</span>
        <span class="fl-arrow">←</span>
        <span class="fl-arrow target">→</span>
        <span class="fl-arrow">←</span>
        <span class="fl-arrow">←</span>
      </div>
      <p class="fl-preview-hint">只看最中间的箭头，忽略两侧干扰</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="fl-center">
      <div class="fl-icon-display">🏹</div>
      <p class="fl-label">Flanker 任务</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing'" class="fl-center">
      <div class="fl-round">第 {{ round }} / {{ totalRounds }} 轮</div>

      <div class="fl-arrow-row">
        <span
          v-for="(a, i) in arrows"
          :key="i"
          class="fl-arrow"
          :class="{ target: i === 2, muted: i !== 2 }"
        >{{ a }}</span>
      </div>

      <p class="fl-instruction">请根据 <strong>中间箭头</strong> 的方向作答</p>

      <div v-if="showStimulus && !showFeedback" class="fl-buttons">
        <button class="fl-btn left" @click="respond('left')">← 左</button>
        <button class="fl-btn right" @click="respond('right')">→ 右</button>
      </div>

      <div v-if="showFeedback" class="fl-feedback" :class="lastCorrect ? 'correct' : 'wrong'">
        {{ feedbackText }}
      </div>

      <div v-if="showStimulus && !showFeedback" class="fl-timer">
        <div class="fl-timer-bar" :style="{ width: timerPct + '%' }" />
      </div>

      <div class="fl-stats">
        <span class="fl-stat">✅ 正确 {{ hits }}</span>
        <span class="fl-stat">❌ 方向错 {{ errors }}</span>
        <span class="fl-stat">⏭ 超时 {{ timeouts }}</span>
      </div>
    </div>

    <!-- 完成 -->
    <div v-else-if="state === 'finished'" class="fl-center">
      <p class="fl-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 1500 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const state = ref('idle')
const round = ref(0)
const totalRounds = 20
const arrows = ref(['→', '→', '→', '→', '→'])
const showStimulus = ref(false)
const showFeedback = ref(false)
const feedbackText = ref('')
const lastCorrect = ref(false)
const responded = ref(false)
const hits = ref(0)
const errors = ref(0)
const timeouts = ref(0)
const timerPct = ref(100)
let respResolve = null
let respTimer = null
let tickTimer = null

const responseMs = computed(() => props.difficulty || 1500)

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

function onKeydown(e) {
  if (state.value !== 'playing' || showFeedback.value) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    respond('left')
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    respond('right')
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(respTimer)
  clearInterval(tickTimer)
})

onMounted(() => {
  if (!props.preview) startGame()
})

async function startGame() {
  hits.value = 0
  errors.value = 0
  timeouts.value = 0
  round.value = 0
  state.value = 'playing'
  nextRound()
}

async function nextRound() {
  round.value++
  if (round.value > totalRounds) {
    state.value = 'finished'
    emit('done', { score: hits.value, total: totalRounds, difficulty: props.difficulty })
    return
  }

  showFeedback.value = false
  responded.value = false
  showStimulus.value = false
  timerPct.value = 100
  await delay(350 + Math.random() * 350)

  // Center target direction; flankers congruent or incongruent ~50/50
  const target = Math.random() < 0.5 ? 'left' : 'right'
  const targetArrow = target === 'left' ? '←' : '→'
  const congruent = Math.random() < 0.5
  const flanker = congruent ? targetArrow : (target === 'left' ? '→' : '←')
  arrows.value = [flanker, flanker, targetArrow, flanker, flanker]
  showStimulus.value = true

  const result = await waitForResponse(responseMs.value)
  showStimulus.value = false
  showFeedback.value = true

  if (result === target) {
    hits.value++
    lastCorrect.value = true
    feedbackText.value = '✓ 正确!'
    sounds.correct()
  } else if (result === null) {
    timeouts.value++
    lastCorrect.value = false
    feedbackText.value = '⏱ 超时'
    sounds.wrong()
  } else {
    errors.value++
    lastCorrect.value = false
    feedbackText.value = '✗ 方向错误'
    sounds.wrong()
  }

  await delay(700)
  nextRound()
}

function respond(direction) {
  if (state.value !== 'playing' || responded.value || !showStimulus.value) return
  responded.value = true
  if (respResolve) {
    respResolve(direction)
    respResolve = null
    clearTimeout(respTimer)
    clearInterval(tickTimer)
  }
}

function waitForResponse(timeout) {
  return new Promise((resolve) => {
    respResolve = resolve
    clearTimeout(respTimer)
    const startMs = Date.now()
    clearInterval(tickTimer)
    tickTimer = setInterval(() => {
      timerPct.value = Math.max(0, Math.round(100 - ((Date.now() - startMs) / timeout) * 100))
    }, 30)
    respTimer = setTimeout(() => {
      clearInterval(tickTimer)
      if (respResolve) {
        respResolve(null)
        respResolve = null
      }
    }, timeout)
  })
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}
</script>

<style scoped>
.fl-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.fl-center {
  text-align: center;
  max-width: 460px;
  width: 100%;
}

.fl-icon-display { font-size: 3rem; margin-bottom: 12px; }
.fl-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.fl-preview-hint { color: #94a3b8; font-size: 0.85rem; margin-top: 14px; }
.fl-preview-row { margin-top: 8px; }

.fl-arrow-row {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin: 26px 0 10px;
}

.fl-arrow {
  font-size: 3.6rem;
  line-height: 1;
  color: #94a3b8;
  user-select: none;
}
.fl-arrow.target {
  color: #f1f5f9;
  transform: scale(1.15);
  text-shadow: 0 0 18px rgba(59,130,246,0.65);
}
.fl-arrow.muted { opacity: 0.55; }

.fl-round { color: #64748b; font-size: 0.85rem; margin-bottom: 4px; }
.fl-instruction { color: #94a3b8; font-size: 0.9rem; margin: 0 0 18px; }
.fl-instruction strong { color: #f1f5f9; }

.fl-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 14px;
}

.fl-btn {
  padding: 13px 34px;
  border: 2px solid;
  border-radius: 14px;
  background: transparent;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.15s;
}
.fl-btn.left {
  border-color: #38bdf8;
  color: #38bdf8;
}
.fl-btn.left:hover { background: rgba(56,189,248,0.1); }
.fl-btn.right {
  border-color: #fb923c;
  color: #fb923c;
}
.fl-btn.right:hover { background: rgba(251,146,60,0.1); }

.fl-feedback {
  display: inline-block;
  font-size: 1rem;
  padding: 6px 20px;
  border-radius: 20px;
  margin-bottom: 10px;
}
.fl-feedback.correct { background: rgba(34,197,94,0.15); color: #4ade80; }
.fl-feedback.wrong   { background: rgba(239,68,68,0.15); color: #f87171; }

.fl-timer {
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
  max-width: 280px;
  margin: 0 auto 12px;
}
.fl-timer-bar {
  height: 100%;
  background: #f59e0b;
  border-radius: 2px;
  transition: width 0.03s linear;
}

.fl-stats {
  display: flex;
  gap: 16px;
  justify-content: center;
}
.fl-stat { font-size: 0.8rem; color: #94a3b8; }

.fl-done { color: #94a3b8; font-size: 1rem; }
</style>
