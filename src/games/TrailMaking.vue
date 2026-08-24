<template>
  <div class="tmt-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="tmt-center">
      <div class="tmt-preview-grid">
        <span v-for="n in 10" :key="n" class="tmt-cell-p">{{ n <= 5 ? n : String.fromCharCode(64 + n - 5) }}</span>
      </div>
      <p class="tmt-hint">按 1 → A → 2 → B → 3 → C… 交替点击</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="tmt-center">
      <div class="tmt-icon-display">🔗</div>
      <p class="tmt-label">交替连线</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'finished'" class="tmt-center">
      <div class="tmt-info">
        <span class="tmt-time">⏱ {{ elapsed }}s</span>
        <span class="tmt-errors">❌ {{ errors }}</span>
      </div>

      <div class="tmt-grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
        <button
          v-for="(node, i) in gridItems"
          :key="node ? node.id : 'empty-' + i"
          class="tmt-cell"
          :class="{
            done: node && node.done,
            wrong: node && node.wrong,
          }"
          :disabled="!node || node.done"
          @click="node && clickNode(node)"
        >
          {{ node ? node.label : '' }}
        </button>
      </div>

      <p class="tmt-instruction">按 数字 → 字母 → 数字 → 字母 的顺序点击，计时越短越好</p>

      <div v-if="state === 'finished'" class="tmt-result">
        <div class="tmt-result-icon">{{ resultIcon }}</div>
        <p class="tmt-result-text">{{ resultText }}</p>
        <p class="tmt-result-sub">用时 {{ elapsed }} 秒 · 错误 {{ errors }} 次</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 5 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const pairs = computed(() => props.difficulty || 5)
const totalNodes = computed(() => pairs.value * 2)
const cols = computed(() => {
  if (pairs.value <= 5) return 4
  if (pairs.value <= 7) return 5
  return 6
})

const state = ref('idle')
const sequence = ref([])
const gridItems = ref([])
const currentIndex = ref(0)
const errors = ref(0)
const elapsed = ref(0)
let timerInterval = null
let startTime = 0

const resultIcon = computed(() => {
  if (errors.value === 0) return '🏆'
  if (errors.value <= 2) return '🎯'
  return '💪'
})

const resultText = computed(() => {
  if (errors.value === 0) return '零失误完成！'
  if (errors.value <= 2) return '完成，继续提高！'
  return '完成，再练练准度'
})

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

onUnmounted(() => clearInterval(timerInterval))

function startGame() {
  buildPuzzle()
  currentIndex.value = 0
  errors.value = 0
  elapsed.value = 0
  state.value = 'playing'
  clearInterval(timerInterval)
  startTime = Date.now()
  timerInterval = setInterval(() => {
    elapsed.value = Math.round(((Date.now() - startTime) / 1000) * 10) / 10
  }, 100)
}

function buildPuzzle() {
  const seq = []
  for (let i = 1; i <= pairs.value; i++) {
    seq.push({ id: `num-${i}`, label: String(i), kind: 'number' })
    seq.push({ id: `let-${i}`, label: String.fromCharCode(64 + i), kind: 'letter' })
  }
  sequence.value = seq

  const total = totalNodes.value
  const positions = [...Array(total).keys()]
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[positions[i], positions[j]] = [positions[j], positions[i]]
  }

  const grid = Array.from({ length: total }, () => null)
  seq.forEach((node, i) => {
    grid[positions[i]] = { ...node, done: false, wrong: false }
  })
  gridItems.value = grid
}

function clickNode(node) {
  if (state.value !== 'playing' || node.done) return

  const expected = sequence.value[currentIndex.value]
  if (node.id === expected.id) {
    node.done = true
    currentIndex.value++
    sounds.correct()

    if (currentIndex.value >= totalNodes.value) {
      clearInterval(timerInterval)
      const timeUsed = Math.round(((Date.now() - startTime) / 1000) * 10) / 10
      elapsed.value = timeUsed
      state.value = 'finished'
      emit('done', {
        score: totalNodes.value,
        total: totalNodes.value,
        timeUsed,
        wrongClicks: errors.value,
        difficulty: props.difficulty,
      })
    }
  } else {
    errors.value++
    node.wrong = true
    sounds.wrong()
    setTimeout(() => { node.wrong = false }, 350)
  }
}
</script>

<style scoped>
.tmt-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.tmt-center {
  text-align: center;
  max-width: 440px;
  width: 100%;
}

.tmt-icon-display { font-size: 3rem; margin-bottom: 12px; }
.tmt-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.tmt-preview-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 7px;
  max-width: 260px;
  margin: 0 auto 12px;
}
.tmt-cell-p {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: #94a3b8;
}

.tmt-hint { color: #94a3b8; font-size: 0.85rem; }

.tmt-info {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.tmt-time { color: #f59e0b; font-size: 0.9rem; font-weight: 600; }
.tmt-errors { color: #f87171; font-size: 0.85rem; font-weight: 600; }

.tmt-grid {
  display: grid;
  gap: 8px;
  max-width: 380px;
  margin: 0 auto 14px;
}

.tmt-cell {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.06);
  border: 1.5px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 1.15rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.tmt-cell:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.3);
}
.tmt-cell.done {
  background: rgba(52,211,153,0.16);
  border-color: #34d399;
  color: #34d399;
  cursor: default;
}
.tmt-cell.wrong {
  animation: tmtShake 0.3s;
  background: rgba(248,113,113,0.2);
  border-color: #f87171;
}
@keyframes tmtShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
.tmt-cell:disabled {
  cursor: default;
  opacity: 1;
}

.tmt-instruction { color: #64748b; font-size: 0.8rem; margin: 0 0 14px; }

.tmt-result { margin-top: 6px; }
.tmt-result-icon { font-size: 2.5rem; }
.tmt-result-text { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; }
.tmt-result-sub { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
</style>
