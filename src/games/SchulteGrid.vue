<template>
  <div class="sg-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="sg-center">
      <div class="sg-grid-preview" :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }">
        <div v-for="n in TOTAL" :key="n" class="sg-cell-preview">{{ n }}</div>
      </div>
      <p class="sg-hint">{{ gridSize }}×{{ gridSize }}舒尔特表·从1到{{ TOTAL }}依次点击</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="sg-center">
      <div class="sg-icon-display">🔢</div>
      <p class="sg-label">舒尔特表</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'finished'" class="sg-center">
      <div class="sg-info">
        <span class="sg-target">找：{{ target }}</span>
        <span class="sg-timer" :class="{ urgent: timeLeft <= 10 }">⏱ {{ timeLeft }}s</span>
      </div>

      <div class="sg-grid" :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }">
        <div
          v-for="n in numbers"
          :key="n.idx"
          class="sg-cell"
          :class="{
            done: n.done,
            tapped: n.tapped,
            wrong: n.wrong,
          }"
          @click="clickNumber(n)"
        >
          {{ n.value }}
        </div>
      </div>

      <!-- 结果 -->
      <div v-if="state === 'finished'" class="sg-result">
        <div class="sg-result-icon">{{ resultIcon }}</div>
        <p class="sg-result-text">{{ resultText }}</p>
        <div v-if="target > TOTAL" class="sg-result-time">完成时间：{{ elapsed }}s</div>
        <div v-else class="sg-result-progress">找到 {{ target - 1 }} / {{ TOTAL }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 5 },
  extraOptions: { type: Object, default: () => ({ time: 1 }) },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const TIME_MAP = { 4: 20, 5: 30, 6: 45, 7: 60 }

const gridSize = computed(() => props.difficulty || 5)
const TOTAL = computed(() => gridSize.value * gridSize.value)
const totalTime = computed(() => {
  const base = TIME_MAP[gridSize.value] || 30
  const mult = (props.extraOptions.time) || 1
  return Math.round(base * mult)
})

const state = ref('idle')
const numbers = ref([])
const target = ref(1)
const timeLeft = ref(30)
const elapsed = ref(0)
const wrongClicks = ref(0)
let timerInterval = null
let startTime = 0

const resultIcon = computed(() => {
  if (target.value > TOTAL.value) return '🏆'
  if (target.value > Math.floor(TOTAL.value * 0.6)) return '🎯'
  return '⏰'
})

const resultText = computed(() => {
  if (target.value > TOTAL.value) return '全部完成！'
  if (target.value > Math.floor(TOTAL.value * 0.6)) return '时间到，表现不错'
  return '时间到，继续加油'
})

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

function startGame() {
  // Generate shuffled 1-25
  const arr = []
  for (let i = 1; i <= TOTAL.value; i++) arr.push(i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  numbers.value = arr.map((v, idx) => ({
    idx,
    value: v,
    done: false,
    tapped: false,
    wrong: false,
  }))

  target.value = 1
  timeLeft.value = totalTime.value
  elapsed.value = 0
  state.value = 'playing'

  startTime = Date.now()
  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000)
    elapsed.value = sec
    timeLeft.value = Math.max(0, totalTime.value - sec)
    if (timeLeft.value <= 0) {
      clearInterval(timerInterval)
      state.value = 'finished'
      emit('done', { score: target.value - 1, total: TOTAL.value, difficulty: props.difficulty })
    }
  }, 200)
}

function clickNumber(n) {
  if (state.value !== 'playing') return

  // Already clicked: flash red
  if (n.done) {
    wrongClicks.value++
    n.wrong = true
    sounds.wrong()
    setTimeout(() => { n.wrong = false }, 400)
    return
  }

  if (n.value === target.value) {
    n.done = true
    target.value++
    sounds.correct()
    // Tap feedback
    n.tapped = true
    setTimeout(() => { n.tapped = false }, 250)

    if (target.value > TOTAL.value) {
      clearInterval(timerInterval)
      const seconds = Math.round(((Date.now() - startTime) / 1000) * 10) / 10
      elapsed.value = seconds
      state.value = 'finished'
      emit('done', { score: TOTAL.value, total: TOTAL.value, timeUsed: seconds, wrongClicks: wrongClicks.value, difficulty: props.difficulty })
    }
  } else {
    // Wrong click
    wrongClicks.value++
    n.wrong = true
    sounds.wrong()
    setTimeout(() => { n.wrong = false }, 400)
  }
}
</script>

<style scoped>
.sg-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.sg-center {
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.sg-icon-display { font-size: 3rem; margin-bottom: 12px; }
.sg-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.sg-grid-preview {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  max-width: 280px;
  margin: 0 auto 12px;
}
.sg-cell-preview {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: rgba(255,255,255,0.3);
}
.sg-hint { color: #64748b; font-size: 0.8rem; }

.sg-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.sg-target {
  color: #3b82f6;
  font-size: 0.95rem;
  font-weight: 700;
}
.sg-timer {
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 600;
}
.sg-timer.urgent {
  color: #ef4444;
  animation: pulse 0.5s ease-in-out infinite;
}
@keyframes pulse {
  50% { transform: scale(1.1); }
}

.sg-grid {
  display: grid;
  gap: 6px;
  max-width: 400px;
  margin: 0 auto 16px;
}

.sg-cell {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.06);
  border: 1.5px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(0.7rem, 1.5vw, 1.2rem);
  font-weight: 700;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.sg-cell:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.25);
}

.sg-cell.done {
  cursor: default;
}
.sg-cell.tapped {
  transform: scale(0.88);
  background: rgba(59,130,246,0.3);
  border-color: #3b82f6;
}
.sg-cell.wrong {
  animation: shake 0.35s;
  background: rgba(239,68,68,0.2);
  border-color: #ef4444;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.sg-result {
  margin-top: 12px;
}
.sg-result-icon { font-size: 2.5rem; margin-bottom: 4px; }
.sg-result-text { font-size: 1.05rem; font-weight: 600; color: #e2e8f0; margin: 0 0 6px; }
.sg-result-time, .sg-result-progress { color: #94a3b8; font-size: 0.85rem; margin: 0; }
</style>
