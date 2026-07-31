<template>
  <div class="mm-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="mm-center">
      <div class="mm-preview-grid">
        <span v-for="i in 8" :key="i" class="mm-card-p">🂠</span>
      </div>
      <p class="mm-hint">翻开卡片，记住位置并配对消除</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="mm-center">
      <div class="mm-icon-display">🃏</div>
      <p class="mm-label">卡片配对</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'finished'" class="mm-center">
      <div class="mm-info">
        <span class="mm-steps">步数：{{ moves }}</span>
        <span class="mm-pairs">配对：{{ matchedPairs }} / {{ pairsCount }}</span>
      </div>

      <div class="mm-grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
        <button
          v-for="(card, i) in cards"
          :key="i"
          class="mm-card"
          :class="{ flipped: card.flipped || card.matched, matched: card.matched }"
          @click="flipCard(i)"
        >
          <span v-if="card.flipped || card.matched" class="mm-face">{{ card.emoji }}</span>
          <span v-else class="mm-back">?</span>
        </button>
      </div>

      <div v-if="state === 'finished'" class="mm-result">
        <div class="mm-result-icon">{{ resultIcon }}</div>
        <p class="mm-result-text">{{ resultText }}</p>
        <p class="mm-result-sub">用了 {{ moves }} 步，最优 {{ optimalMoves }} 步</p>
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

const state = ref('idle')
const pairsCount = computed(() => props.difficulty || 6)
const cols = computed(() => {
  const n = pairsCount.value
  if (n <= 6) return 4
  if (n <= 8) return 4
  return 5
})
const cards = ref([])
const flipped = ref([])      // indices currently face-up
const moves = ref(0)
const matchedPairs = ref(0)
const optimalMoves = computed(() => pairsCount.value * 2)
let lock = false

const resultIcon = computed(() => {
  const r = moves.value / optimalMoves.value
  if (r <= 1.2) return '🏆'
  if (r <= 1.8) return '🎯'
  return '💪'
})
const resultText = computed(() => {
  const r = moves.value / optimalMoves.value
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
  // Build pairs and shuffle
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
  lock = false
  state.value = 'playing'
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
      // Match
      cards.value[a].matched = true
      cards.value[b].matched = true
      matchedPairs.value++
      sounds.match()
      flipped.value = []
      if (matchedPairs.value === pairsCount.value) {
        state.value = 'finished'
        emit('done', { score: pairsCount.value, total: pairsCount.value, moves: moves.value, difficulty: props.difficulty })
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
.mm-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.mm-center {
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.mm-icon-display { font-size: 3rem; margin-bottom: 12px; }
.mm-label { font-size: 1.2rem; font-weight: 600; color: #f1f5f9; }

.mm-preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-width: 240px;
  margin: 0 auto 12px;
}
.mm-card-p {
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

.mm-hint { color: #94a3b8; font-size: 0.85rem; }

.mm-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;
}
.mm-steps { color: #3b82f6; font-size: 0.9rem; font-weight: 600; }
.mm-pairs { color: #94a3b8; font-size: 0.85rem; }

.mm-grid {
  display: grid;
  gap: 8px;
  max-width: 360px;
  margin: 0 auto 16px;
}

.mm-card {
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
.mm-card:hover { background: rgba(255,255,255,0.13); }
.mm-card.flipped {
  background: rgba(59,130,246,0.15);
  border-color: #3b82f6;
}
.mm-card.matched {
  background: rgba(52,211,153,0.14);
  border-color: #34d399;
}
.mm-face { font-size: 1.6rem; }
.mm-back { font-size: 1.1rem; }

.mm-result { margin-top: 8px; }
.mm-result-icon { font-size: 2.5rem; }
.mm-result-text { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; }
.mm-result-sub { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
</style>
