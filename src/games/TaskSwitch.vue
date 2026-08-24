<template>
  <div class="ts-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="ts-center">
      <div class="ts-cue-preview size">大小</div>
      <div class="ts-digit-preview">7</div>
      <div class="ts-btns-preview">
        <span class="ts-btn-preview left">← 小/奇</span>
        <span class="ts-btn-preview right">→ 大/偶</span>
      </div>
      <p class="ts-hint">根据提示规则判断数字，规则会不断切换</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="ts-center">
      <div class="ts-icon-display">🔀</div>
      <p class="ts-label">任务切换</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing'" class="ts-center">
      <div class="ts-round">第 {{ round }} / {{ totalRounds }} 轮</div>

      <div class="ts-cue" :class="cue">
        {{ cue === 'parity' ? '奇偶' : '大小' }}
      </div>
      <div class="ts-digit">{{ digit }}</div>
      <p class="ts-instruction">
        {{ cue === 'parity' ? '奇数按左，偶数按右' : '小于5按左，大于5按右' }}
      </p>

      <div v-if="showStimulus && !showFeedback" class="ts-buttons">
        <button class="ts-btn left" @click="respond('left')">← 左</button>
        <button class="ts-btn right" @click="respond('right')">→ 右</button>
      </div>

      <div v-if="showFeedback" class="ts-feedback" :class="lastCorrect ? 'correct' : 'wrong'">
        {{ feedbackText }}
      </div>

      <div v-if="showStimulus && !showFeedback" class="ts-timer">
        <div class="ts-timer-bar" :style="{ width: timerPct + '%' }" />
      </div>

      <div class="ts-stats">
        <span class="ts-stat">✅ 正确 {{ hits }}</span>
        <span class="ts-stat">❌ 错误 {{ errors }}</span>
        <span class="ts-stat">⏭ 超时 {{ timeouts }}</span>
      </div>
    </div>

    <!-- 完成 -->
    <div v-else-if="state === 'finished'" class="ts-center">
      <p class="ts-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 2000 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const state = ref('idle')
const round = ref(0)
const totalRounds = 24
const cue = ref('parity')
const digit = ref(7)
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

const responseMs = computed(() => props.difficulty || 2000)

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

  // 随机规则与数字（1-9，去掉5以避免大小判断歧义）
  cue.value = Math.random() < 0.5 ? 'parity' : 'size'
  let d
  do {
    d = 1 + Math.floor(Math.random() * 9)
  } while (d === 5)
  digit.value = d

  showStimulus.value = true
  const target = cue.value === 'parity'
    ? (digit.value % 2 === 1 ? 'left' : 'right')
    : (digit.value < 5 ? 'left' : 'right')

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
    feedbackText.value = `✗ 错误，应选${target === 'left' ? '左' : '右'}`
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
.ts-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.ts-center {
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.ts-icon-display { font-size: 3rem; margin-bottom: 12px; }
.ts-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.ts-cue-preview {
  display: inline-block;
  padding: 4px 18px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 8px;
}
.ts-cue-preview.size { background: rgba(139,92,246,0.18); color: #c084fc; }
.ts-digit-preview {
  font-size: 4rem;
  font-weight: 800;
  color: #f1f5f9;
  margin-bottom: 12px;
}
.ts-btns-preview { display: flex; gap: 12px; justify-content: center; margin-bottom: 12px; }
.ts-btn-preview {
  padding: 8px 20px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  color: #94a3b8;
  font-size: 0.85rem;
}
.ts-hint { color: #94a3b8; font-size: 0.85rem; }

.ts-round { color: #64748b; font-size: 0.85rem; margin-bottom: 10px; }

.ts-cue {
  display: inline-block;
  padding: 5px 22px;
  border-radius: 20px;
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 6px;
}
.ts-cue.parity { background: rgba(59,130,246,0.16); color: #60a5fa; }
.ts-cue.size { background: rgba(139,92,246,0.16); color: #c084fc; }

.ts-digit {
  font-size: 4.5rem;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 8px;
}

.ts-instruction { color: #94a3b8; font-size: 0.9rem; margin: 0 0 18px; }

.ts-buttons { display: flex; gap: 20px; justify-content: center; margin-bottom: 14px; }

.ts-btn {
  padding: 13px 34px;
  border: 2px solid;
  border-radius: 14px;
  background: transparent;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.15s;
}
.ts-btn.left { border-color: #38bdf8; color: #38bdf8; }
.ts-btn.left:hover { background: rgba(56,189,248,0.1); }
.ts-btn.right { border-color: #fb923c; color: #fb923c; }
.ts-btn.right:hover { background: rgba(251,146,60,0.1); }

.ts-feedback {
  display: inline-block;
  font-size: 1rem;
  padding: 6px 20px;
  border-radius: 20px;
  margin-bottom: 10px;
}
.ts-feedback.correct { background: rgba(34,197,94,0.15); color: #4ade80; }
.ts-feedback.wrong   { background: rgba(239,68,68,0.15); color: #f87171; }

.ts-timer {
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
  max-width: 280px;
  margin: 0 auto 12px;
}
.ts-timer-bar {
  height: 100%;
  background: #f59e0b;
  border-radius: 2px;
  transition: width 0.03s linear;
}

.ts-stats { display: flex; gap: 16px; justify-content: center; }
.ts-stat { font-size: 0.8rem; color: #94a3b8; }

.ts-done { color: #94a3b8; font-size: 1rem; }
</style>
