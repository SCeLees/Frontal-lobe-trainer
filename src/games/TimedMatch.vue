<template>
  <div class="tm-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="tm-center">
      <div class="tm-preview-grid">
        <span v-for="i in 8" :key="i" class="tm-card-p">🂠</span>
      </div>
      <p class="tm-hint">限时翻牌配对，超时即失败</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="tm-center">
      <div class="tm-icon-display">⏳</div>
      <p class="tm-label">限时翻牌配对</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'finished'" class="tm-center">
      <div class="tm-info">
        <span class="tm-steps">步数：{{ moves }}</span>
        <span class="tm-pairs">配对：{{ matchedPairs }} / {{ pairsCount }}</span>
        <span class="tm-timer" :class="{ urgent: timeLeft <= 15 }">⏱ {{ timeLeft }}s</span>
      </div>
      <div class="tm-timer-bar">
        <div class="tm-timer-fill" :style="{ width: timerPct + '%' }"></div>
      </div>

      <div class="tm-grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
        <button
          v-for="(card, i) in cards"
          :key="i"
          class="tm-card"
          :class="{ flipped: card.flipped || card.matched, matched: card.matched }"
          @click="flipCard(i)"
        >
          <span v-if="card.flipped || card.matched" class="tm-face">{{ card.emoji }}</span>
          <span v-else class="tm-back">?</span>
        </button>
      </div>

      <div v-if="state === 'finished'" class="tm-result">
        <div class="tm-result-icon">{{ resultIcon }}</div>
        <p class="tm-result-text">{{ resultText }}</p>
        <p class="tm-result-sub" v-if="won">用了 {{ moves }} 步，剩余 {{ timeLeft }}s</p>
        <p class="tm-result-sub" v-else>配对 {{ matchedPairs }} / {{ pairsCount }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 6 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁']

const TIME_MAP = { 6: 60, 8: 80, 10: 100 }

const state = ref('idle')
const pairsCount = computed(() => props.difficulty || 6)
const cols = computed(() => (pairsCount.value <= 8 ? 4 : 5))
const timeLimit = computed(() => TIME_MAP[pairsCount.value] || 90)
const cards = ref([])
const flipped = ref([])
const moves = ref(0)
const matchedPairs = ref(0)
const timeLeft = ref(90)
const timerPct = ref(100)
const won = ref(false)
let timerInterval = null
let lock = false

const resultIcon = computed(() => {
  if (!won.value) return '⏰'
  const r = moves.value / pairsCount.value
  if (r <= 1.2) return '🏆'
  if (r <= 1.8) return '🎯'
  return '💪'
})
const resultText = computed(() => {
  if (!won.value) return '时间到！'
  const r = moves.value / pairsCount.value
  if (r <= 1.2) return '超强记忆！'
  if (r <= 1.8) return '完成！'
  return '完成，继续练习'
})

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

function startGame() {
  const emojis = EMOJIS.slice(0, pairsCount.value)
  const deck = [...emojis, ...emojis]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  cards.value = deck.map(emoji => ({ emoji, flipped: false, matched: false }))
  flipped.value = []
  moves.value = 0
  matchedPairs.value = 0
  won.value = false
  timeLeft.value = timeLimit.value
  timerPct.value = 100
  lock = false
  state.value = 'playing'

  const start = Date.now()
  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - start) / 1000)
    timeLeft.value = Math.max(0, timeLimit.value - elapsed)
    timerPct.value = Math.max(0, Math.round((timeLeft.value / timeLimit.value) * 100))
    if (timeLeft.value <= 0) {
      clearInterval(timerInterval)
      state.value = 'finished'
      won.value = false
      emit('done', { score: matchedPairs.value, total: pairsCount.value, difficulty: props.difficulty })
    }
  }, 200)
}

function flipCard(i) {
  if (state.value !== 'playing' || lock) return
  const card = cards.value[i]
  if (card.matched || card.flipped) return
  if (flipped.value.length >= 2) return

  card.flipped = true
  flipped.value.push(i)
  sounds.flip()

  if (flipped.value.length === 2) {
    moves.value++
    const [a, b] = flipped.value
    if (cards.value[a].emoji === cards.value[b].emoji) {
      cards.value[a].matched = true
      cards.value[b].matched = true
      matchedPairs.value++
      sounds.match()
      flipped.value = []
      if (matchedPairs.value === pairsCount.value) {
        clearInterval(timerInterval)
        won.value = true
        state.value = 'finished'
        emit('done', {
          score: pairsCount.value,
          total: pairsCount.value,
          timeUsed: timeLimit.value - timeLeft.value,
          difficulty: props.difficulty,
        })
      }
    } else {
      sounds.wrong()
      lock = true
      setTimeout(() => {
        cards.value[a].flipped = false
        cards.value[b].flipped = false
        flipped.value = []
        lock = false
      }, 800)
    }
  }
}
</script>

<style scoped>
.tm-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.tm-center {
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.tm-icon-display { font-size: 3rem; margin-bottom: 12px; }
.tm-label { font-size: 1.2rem; font-weight: 600; color: #f1f5f9; }

.tm-preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-width: 240px;
  margin: 0 auto 12px;
}
.tm-card-p {
  aspect-ratio: 3/4;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #64748b;
}

.tm-hint { color: #94a3b8; font-size: 0.85rem; }

.tm-info {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.tm-steps { color: #3b82f6; font-size: 0.9rem; font-weight: 600; }
.tm-pairs { color: #94a3b8; font-size: 0.85rem; }
.tm-timer { color: #94a3b8; font-size: 0.9rem; font-weight: 600; }
.tm-timer.urgent {
  color: #f87171;
  animation: pulse 0.5s ease-in-out infinite;
}
@keyframes pulse { 50% { transform: scale(1.15); } }

.tm-timer-bar {
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
  max-width: 300px;
  margin: 0 auto 16px;
}
.tm-timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #22d3ee);
  border-radius: 2px;
  transition: width 0.2s linear;
}

.tm-grid {
  display: grid;
  gap: 8px;
  max-width: 360px;
  margin: 0 auto 16px;
}

.tm-card {
  aspect-ratio: 3/4;
  background: rgba(255,255,255,0.08);
  border: 1.5px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #94a3b8;
}
.tm-card:hover { background: rgba(255,255,255,0.13); transform: scale(1.02); }
.tm-card.flipped {
  background: rgba(59,130,246,0.15);
  border-color: #3b82f6;
}
.tm-card.matched {
  background: rgba(52,211,153,0.14);
  border-color: #34d399;
  animation: matchPop 0.3s ease;
}
@keyframes matchPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
.tm-face { font-size: 1.6rem; }
.tm-back { font-size: 1.1rem; }

.tm-result { margin-top: 8px; }
.tm-result-icon { font-size: 2.5rem; }
.tm-result-text { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; }
.tm-result-sub { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
</style>
