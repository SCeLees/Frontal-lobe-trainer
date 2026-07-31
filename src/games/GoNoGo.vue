<template>
  <div class="gng-game" @click.stop>
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="gng-center">
      <div class="gng-stimulus-preview">P</div>
      <p class="gng-example">看到 <strong>P</strong> 按空格键或点击按钮</p>
      <p class="gng-example dim">看到 <strong>R</strong> 不要操作</p>
      <div class="gng-btn-preview">按空格键 或 点此</div>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="gng-center">
      <div class="gng-icon-display">🚦</div>
      <p class="gng-label">Go/No-Go</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing'" class="gng-center" @keydown.space.prevent="onGo" tabindex="0" ref="stageEl">
      <div class="gng-round">第 {{ round }} / {{ totalRounds }} 轮</div>

      <!-- 固定显示区域 -->
      <div class="gng-display">
        <div v-if="showStimulus && !showFeedback" class="gng-stimulus">
          {{ currentLetter }}
        </div>
        <div v-else-if="!showFeedback" class="gng-fixation">+</div>
        <div v-if="showFeedback" class="gng-feedback" :class="feedbackClass">
          {{ feedbackText }}
        </div>
      </div>

      <!-- 按钮占位（始终存在，避免布局跳动） -->
      <div class="gng-btn-area">
        <button
          v-show="showStimulus && !showFeedback"
          class="gng-go-btn"
          @click="onGo"
        >
          按空格键 或 点此
        </button>
      </div>

      <div class="gng-stats">
        <span class="gng-stat">✅ {{ hits }}</span>
        <span class="gng-stat">❌ {{ falseAlarms }}</span>
        <span class="gng-stat">⏭ {{ misses }}</span>
      </div>
    </div>

    <!-- 完成 -->
    <div v-else-if="state === 'finished'" class="gng-center">
      <p class="gng-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 0 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const state = ref('idle')
const round = ref(0)
const totalRounds = 24
const currentLetter = ref('')
const showStimulus = ref(false)
const showFeedback = ref(false)
const feedbackText = ref('')
const feedbackClass = ref('')
const hits = ref(0)
const falseAlarms = ref(0)
const misses = ref(0)
const correctRejects = ref(0)
const responded = ref(false)
const stageEl = ref(null)

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

async function startGame() {
  hits.value = 0
  falseAlarms.value = 0
  misses.value = 0
  correctRejects.value = 0
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
    const total = hits.value + falseAlarms.value + misses.value + correctRejects.value
    emit('done', { score: hits.value + correctRejects.value, total, difficulty: props.difficulty })
    return
  }

  showFeedback.value = false
  responded.value = false

  // Show fixation cross
  showStimulus.value = false
  await delay(300 + Math.random() * 400)

  // Random P or R (~50% each)
  currentLetter.value = Math.random() < 0.5 ? 'P' : 'R'
  showStimulus.value = true

  // Wait for response or timeout
  const timeout = props.difficulty || 1500
  const result = await waitForResponse(timeout)
  showStimulus.value = false
  showFeedback.value = true

  const isGo = currentLetter.value === 'P'
  if (isGo && result === 'go') {
    hits.value++
    sounds.correct()
    feedbackText.value = '✓ 正确响应!'
    feedbackClass.value = 'correct'
  } else if (isGo && result === null) {
    misses.value++
    feedbackText.value = '✗ 遗漏 (应该响应)'
    feedbackClass.value = 'wrong'
  } else if (!isGo && result === 'go') {
    falseAlarms.value++
    sounds.wrong()
    feedbackText.value = '✗ 虚报 (不应响应)'
    feedbackClass.value = 'wrong'
  } else {
    correctRejects.value++
    sounds.correct()
    feedbackText.value = '✓ 正确抑制'
    feedbackClass.value = 'correct'
  }

  await delay(800)
  nextRound()
}

let respResolve = null
function onGo() {
  if (responded.value || !showStimulus.value) return
  responded.value = true
  if (respResolve) { respResolve('go'); respResolve = null }
}

function waitForResponse(timeout) {
  return new Promise((resolve) => {
    respResolve = resolve
    setTimeout(() => {
      if (respResolve) { respResolve(null); respResolve = null }
    }, timeout)
  })
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}
</script>

<style scoped>
.gng-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  outline: none;
}

.gng-center {
  text-align: center;
  max-width: 360px;
  width: 100%;
  outline: none;
}

.gng-icon-display { font-size: 3rem; margin-bottom: 12px; }
.gng-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.gng-stimulus-preview {
  font-size: 5rem;
  font-weight: 800;
  color: #f1f5f9;
  margin-bottom: 12px;
}

.gng-example {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 4px 0;
}
.gng-example.dim { opacity: 0.5; }

.gng-btn-preview {
  margin-top: 16px;
  padding: 10px 24px;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  color: #94a3b8;
  font-size: 0.85rem;
  display: inline-block;
}

.gng-round { color: #64748b; font-size: 0.85rem; margin-bottom: 12px; }

.gng-display {
  width: 180px;
  height: 140px;
  margin: 0 auto 16px;
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.02);
}

.gng-stimulus {
  font-size: 5rem;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 20px;
  animation: popIn 0.2s ease-out;
}

@keyframes popIn {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.gng-fixation {
  font-size: 3rem;
  color: #64748b;
  margin: 0 0 20px;
}

.gng-feedback {
  font-size: 1.05rem;
  padding: 6px 16px;
  border-radius: 12px;
}
.gng-feedback.correct {
  background: rgba(34,197,94,0.15);
  color: #4ade80;
}
.gng-feedback.wrong {
  background: rgba(239,68,68,0.15);
  color: #f87171;
}

.gng-btn-area {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.gng-go-btn {
  padding: 14px 32px;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 14px;
  background: rgba(255,255,255,0.05);
  color: #94a3b8;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
}
.gng-go-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.4);
  color: #e2e8f0;
}

.gng-stats {
  display: flex;
  gap: 16px;
  justify-content: center;
}
.gng-stat {
  font-size: 0.8rem;
  color: #94a3b8;
}

.gng-done {
  color: #94a3b8;
  font-size: 1rem;
}
</style>
