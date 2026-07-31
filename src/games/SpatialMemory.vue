<template>
  <div class="sm-game" @click.stop>
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="sm-center">
      <div class="sm-mode-label">{{ modeLabel }}</div>
      <div class="sm-lives-preview">
        <span v-for="i in maxLives" :key="i">❤️</span>
      </div>
      <div class="sm-grid">
        <div v-for="i in 9" :key="'pv-'+i" class="sm-cell preview" />
      </div>
      <p class="sm-instruction">3×3网格·记住亮起顺序并复现</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="sm-center">
      <div class="sm-icon-display">📋</div>
      <p class="sm-label">空间记忆</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'gameover'" class="sm-center">
      <div class="sm-info">
        <span class="sm-mode-label">{{ modeLabel }}</span>
        <span class="sm-lives">
          <span v-for="i in maxLives" :key="i" class="sm-heart" :class="{ lost: i > lives }">❤️</span>
        </span>
      </div>
      <div class="sm-level">第 {{ level }} 关（亮 {{ sequence.length }} 次）</div>

      <div class="sm-grid">
        <div
          v-for="(_, idx) in 9"
          :key="idx"
          class="sm-cell"
          :class="cellClass(idx)"
          @click="clickCell(idx)"
        />
      </div>

      <p class="sm-instruction">{{ instructionText }}</p>

      <div v-if="state === 'gameover'" class="sm-gameover">
        <p class="sm-go-text">💔 生命耗尽</p>
        <div class="sm-records">
          <div class="sm-record">
            <span class="sm-rec-label">🏆 最高纪录</span>
            <span class="sm-rec-val">第 {{ bestLevel }} 关</span>
          </div>
          <div class="sm-record">
            <span class="sm-rec-label">📋 本次成绩</span>
            <span class="sm-rec-val">第 {{ level - 1 }} 关</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 3 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const GRID = 3
const totalCells = GRID * GRID  // 9

const maxSeqLen = computed(() => props.difficulty === 3 ? 7 : 9)
const maxLives = computed(() => props.difficulty === 5 ? 1 : 3)
const modeLabel = computed(() => {
  if (props.difficulty === 3) return '简单模式'
  if (props.difficulty === 4) return '普通模式'
  return '困难模式'
})

const state = ref('idle')
const level = ref(1)
const lives = ref(3)
const sequence = ref([])
const currentHighlight = ref(-1)
const phase = ref('watch')
const playerClicks = ref([])
const feedbackCells = reactive({})

const bestLevel = ref(0)  // highest level ever reached this session

function cellClass(idx) {
  const fb = feedbackCells[idx]
  return {
    lit: currentHighlight.value === idx,
    'fb-correct': fb === 'correct',
    'fb-wrong': fb === 'wrong',
    tapped: fb === 'tapped',
  }
}

const instructionText = computed(() => {
  if (state.value === 'gameover') return ''
  if (phase.value === 'watch') return '注意观察亮起的格子...'
  if (phase.value === 'input') return '请依次点击格子'
  return ''
})

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

function startGame() {
  level.value = 1
  lives.value = maxLives.value
  state.value = 'playing'
  bestLevel.value = 0
  nextRound()
}

async function nextRound() {
  if (lives.value <= 0) return

  playerClicks.value = []
  phase.value = 'watch'
  Object.keys(feedbackCells).forEach(k => delete feedbackCells[k])

  // Sequence length: level, capped at maxSeqLen
  const seqLen = Math.min(level.value, maxSeqLen.value)
  const seq = []
  for (let i = 0; i < seqLen; i++) {
    seq.push(Math.floor(Math.random() * totalCells))
  }
  sequence.value = seq

  // Animate
  for (let i = 0; i < seq.length; i++) {
    currentHighlight.value = seq[i]
    await delay(550)
    currentHighlight.value = -1
    await delay(280)
  }

  phase.value = 'input'
}

async function clickCell(idx) {
  if (phase.value !== 'input') return
  playerClicks.value.push(idx)
  // Brief tap feedback
  feedbackCells[idx] = 'tapped'
  setTimeout(() => {
    if (feedbackCells[idx] === 'tapped') delete feedbackCells[idx]
  }, 200)
  if (playerClicks.value.length === sequence.value.length) {
    await checkAnswer()
  }
}

async function checkAnswer() {
  const expected = [...sequence.value]
  let correct = true

  for (let i = 0; i < expected.length; i++) {
    if (playerClicks.value[i] === expected[i]) {
      feedbackCells[expected[i]] = 'correct'
    } else {
      feedbackCells[expected[i]] = 'correct'
      if (playerClicks.value[i] !== undefined) {
        feedbackCells[playerClicks.value[i]] = 'wrong'
      }
      correct = false
    }
  }

  phase.value = 'feedback'
  if (correct) {
    sounds.correct()
    // Update best
    if (level.value > bestLevel.value) bestLevel.value = level.value

    await delay(700)
    Object.keys(feedbackCells).forEach(k => delete feedbackCells[k])
    level.value++
    nextRound()
  } else {
    sounds.wrong()
    lives.value--
    await delay(900)

    if (lives.value <= 0) {
      if (bestLevel.value === 0) bestLevel.value = level.value - 1
      state.value = 'gameover'
      emit('done', { score: bestLevel.value, total: level.value - 1, difficulty: props.difficulty })
    } else {
      Object.keys(feedbackCells).forEach(k => delete feedbackCells[k])
      nextRound()
    }
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}
</script>

<style scoped>
.sm-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.sm-center {
  text-align: center;
  position: relative;
}

.sm-icon-display { font-size: 3rem; margin-bottom: 12px; }
.sm-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.sm-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sm-mode-label {
  color: #3b82f6;
  font-size: 0.8rem;
  font-weight: 600;
}

.sm-lives-preview {
  margin-bottom: 12px;
  font-size: 1.2rem;
}

.sm-lives {
  display: flex;
  gap: 2px;
}
.sm-heart { font-size: 1rem; transition: opacity 0.3s; }
.sm-heart.lost { opacity: 0.2; filter: grayscale(1); }

.sm-level { color: #64748b; font-size: 0.85rem; margin-bottom: 16px; }

.sm-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 220px;
  height: 220px;
  margin: 0 auto 16px;
  background: rgba(255,255,255,0.03);
  padding: 8px;
  border-radius: 10px;
}

.sm-cell {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.06);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.sm-cell.preview { cursor: default; }
.sm-cell.lit {
  background: #3b82f6;
  border-color: #60a5fa;
  box-shadow: 0 0 12px rgba(59,130,246,0.5);
}
.sm-cell.fb-correct {
  background: #22c55e;
  border-color: #4ade80;
}
.sm-cell.fb-wrong {
  background: #ef4444;
  border-color: #f87171;
}
.sm-cell.tapped {
  background: rgba(255,255,255,0.25);
  border-color: rgba(255,255,255,0.5);
  transform: scale(0.9);
}

.sm-instruction {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
}

.sm-gameover {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(15,23,42,0.88);
  border-radius: 12px;
}
.sm-go-text { font-size: 1.4rem; font-weight: 700; margin: 0 0 16px; }

.sm-records {
  display: flex;
  gap: 24px;
}
.sm-record {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.sm-rec-label {
  font-size: 0.75rem;
  color: #64748b;
}
.sm-rec-val {
  font-size: 1.3rem;
  font-weight: 700;
  color: #f1f5f9;
}
</style>
