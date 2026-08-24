<template>
  <div class="ss-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="ss-center">
      <div class="ss-fixation">→</div>
      <p class="ss-preview-text">Go 出现时按键响应；出现「停止」后必须抑制</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="ss-center">
      <div class="ss-icon-display">🚫</div>
      <p class="ss-label">停止信号</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing'" class="ss-center" tabindex="0" ref="stageEl" @keydown.space.prevent="onGo">
      <div class="ss-round">第 {{ round }} / {{ totalRounds }} 轮</div>

      <div class="ss-display">
        <div v-if="showStimulus && !showFeedback" class="ss-go" :class="{ stopped }">
          {{ stopped ? '🚫' : '→' }}
        </div>
        <div v-else-if="!showFeedback" class="ss-fixation">+</div>
        <div v-if="showFeedback" class="ss-feedback" :class="feedbackClass">
          {{ feedbackText }}
        </div>
      </div>

      <div class="ss-btn-area">
        <button
          v-show="showStimulus && !showFeedback && !stopped"
          class="ss-go-btn"
          @click="onGo"
        >
          按空格键 或 点此响应
        </button>
      </div>

      <div class="ss-stats">
        <span class="ss-stat">✅ 响应 {{ hits }}</span>
        <span class="ss-stat">🛑 成功抑制 {{ stops }}</span>
        <span class="ss-stat">❌ 误触 {{ falseAlarms }}</span>
        <span class="ss-stat">⏭ 遗漏 {{ misses }}</span>
      </div>
    </div>

    <!-- 完成 -->
    <div v-else-if="state === 'finished'" class="ss-center">
      <p class="ss-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 250 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

// difficulty = 停止信号延迟(ms)；延迟越长，动作准备越充分，抑制越难
const stopDelay = computed(() => props.difficulty || 250)

const state = ref('idle')
const round = ref(0)
const totalRounds = 24
const showStimulus = ref(false)
const showFeedback = ref(false)
const stopped = ref(false)
const feedbackText = ref('')
const feedbackClass = ref('')
const hits = ref(0)
const stops = ref(0)
const falseAlarms = ref(0)
const misses = ref(0)
const responded = ref(false)
const stageEl = ref(null)

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

function onKeydown(e) {
  if (state.value !== 'playing') return
  if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault()
    onGo()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

async function startGame() {
  hits.value = 0
  stops.value = 0
  falseAlarms.value = 0
  misses.value = 0
  round.value = 0
  state.value = 'playing'
  await nextTick()
  stageEl.value?.focus()
  nextRound()
}

async function nextRound() {
  round.value++
  if (round.value > totalRounds) {
    state.value = 'finished'
    const total = hits.value + stops.value + falseAlarms.value + misses.value
    emit('done', { score: hits.value + stops.value, total, difficulty: props.difficulty })
    return
  }

  showFeedback.value = false
  responded.value = false
  stopped.value = false
  showStimulus.value = false
  await delay(500 + Math.random() * 600)

  // Go stimulus appears
  const isStop = Math.random() < 0.3
  showStimulus.value = true

  if (isStop) {
    // Phase 1: before stop signal appears, any response is a false alarm.
    const early = await waitForResponse(stopDelay.value)
    if (early === 'go') {
      showStimulus.value = false
      showFeedback.value = true
      falseAlarms.value++
      sounds.wrong()
      feedbackText.value = '✗ 停止信号出现前不应响应'
      feedbackClass.value = 'wrong'
      await delay(800)
      nextRound()
      return
    }

    // Phase 2: stop signal is visible. Correct behavior is to withhold the response.
    stopped.value = true
    const late = await waitForResponse(900)

    showStimulus.value = false
    showFeedback.value = true
    if (late === 'go') {
      falseAlarms.value++
      sounds.wrong()
      feedbackText.value = '✗ 抑制失败（看到停止后仍响应）'
      feedbackClass.value = 'wrong'
    } else {
      stops.value++
      sounds.correct()
      feedbackText.value = '✓ 成功抑制'
      feedbackClass.value = 'correct'
    }

    await delay(800)
    nextRound()
    return
  }

  // No-stop trial: wait for the go response.
  const result = await waitForResponse(1200)
  showStimulus.value = false
  showFeedback.value = true
  if (result === 'go') {
    hits.value++
    sounds.correct()
    feedbackText.value = '✓ 正确响应'
    feedbackClass.value = 'correct'
  } else {
    misses.value++
    sounds.wrong()
    feedbackText.value = '✗ 遗漏'
    feedbackClass.value = 'wrong'
  }

  await delay(700)
  nextRound()
}

let respResolve = null
let respTimer = null

function onGo() {
  if (state.value !== 'playing' || responded.value || !showStimulus.value) return
  responded.value = true
  if (respResolve) {
    respResolve('go')
    respResolve = null
    clearTimeout(respTimer)
  }
}

function waitForResponse(timeout) {
  return new Promise((resolve) => {
    respResolve = resolve
    clearTimeout(respTimer)
    respTimer = setTimeout(() => {
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
.ss-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  outline: none;
}

.ss-center {
  text-align: center;
  max-width: 360px;
  width: 100%;
  outline: none;
}

.ss-icon-display { font-size: 3rem; margin-bottom: 12px; }
.ss-label { font-size: 1.2rem; font-weight: 600; color: #f1f5f9; }

.ss-fixation {
  font-size: 3rem;
  color: #64748b;
  margin-bottom: 12px;
}
.ss-preview-text { color: #94a3b8; font-size: 0.85rem; }

.ss-round { color: #94a3b8; font-size: 0.85rem; margin-bottom: 12px; }

.ss-display {
  width: 200px;
  height: 150px;
  margin: 0 auto 14px;
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.02);
}

.ss-go {
  font-size: 3rem;
  font-weight: 800;
  color: #f1f5f9;
  animation: popIn 0.15s ease-out;
}
.ss-go.stopped {
  color: #f87171;
  animation: stopIn 0.15s ease-out;
}
@keyframes popIn {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
@keyframes stopIn {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.ss-feedback {
  font-size: 1.05rem;
  padding: 6px 16px;
  border-radius: 12px;
}
.ss-feedback.correct { background: rgba(52,211,153,0.15); color: #34d399; }
.ss-feedback.wrong   { background: rgba(248,113,113,0.15); color: #f87171; }

.ss-btn-area {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.ss-go-btn {
  padding: 12px 30px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 14px;
  background: rgba(255,255,255,0.05);
  color: #94a3b8;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
}
.ss-go-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.35);
  color: #e2e8f0;
}

.ss-stats {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.ss-stat { font-size: 0.78rem; color: #94a3b8; }

.ss-done { color: #94a3b8; font-size: 1rem; }
</style>
