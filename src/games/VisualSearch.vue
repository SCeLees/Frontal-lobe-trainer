<template>
  <div class="vs-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="vs-center">
      <div class="vs-preview-grid" :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }">
        <span v-for="i in gridSize * gridSize - 1" :key="i" class="vs-cell-p">🐱</span>
        <span class="vs-cell-p odd">🐶</span>
      </div>
      <p class="vs-hint">在相似图形中快速找出异类</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="vs-center">
      <div class="vs-icon-display">🔍</div>
      <p class="vs-label">视觉搜索</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'finished'" class="vs-center">
      <div v-if="state === 'playing'" class="vs-round">第 {{ round }} / {{ totalRounds }} 轮</div>

      <div v-if="state === 'playing'" class="vs-play">
        <div class="vs-grid" :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }">
          <button
            v-for="(item, i) in gridItems"
            :key="i"
            class="vs-cell"
            :class="{ hit: item.hit, miss: item.miss }"
            @click="clickCell(item, i)"
          >{{ item.emoji }}</button>
        </div>
        <p class="vs-target">找出与「{{ commonEmoji }}」不同的一个</p>
      </div>

      <div v-else-if="state === 'finished'" class="vs-result">
        <div class="vs-result-icon">{{ resultIcon }}</div>
        <p class="vs-result-text">{{ resultText }}</p>
        <p class="vs-result-sub">正确 {{ correct }} / {{ totalRounds }} 轮</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 5 },
  extraOptions: { type: Object, default: () => ({ rounds: 8 }) },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const EMOJIS = ['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐸', '🐵', '🐔', '🐧', '🦆', '🦉', '🐢', '🐍', '🐙', '🦋', '🐝', '🐳']

const state = ref('idle')
const round = ref(0)
const totalRounds = computed(() => props.extraOptions.rounds || 8)
const gridSize = computed(() => props.difficulty || 5)
const gridItems = ref([])
const commonEmoji = ref('')
const correct = ref(0)
const roundLock = ref(false)

const resultIcon = computed(() => (correct.value / totalRounds >= 0.8 ? '🏆' : '🎯'))
const resultText = computed(() => (correct.value / totalRounds >= 0.8 ? '敏锐的视觉！' : '完成！'))

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

function startGame() {
  round.value = 0
  correct.value = 0
  roundLock.value = false
  state.value = 'playing'
  nextRound()
}

function nextRound() {
  round.value++
  if (round.value > totalRounds.value) {
    state.value = 'finished'
    emit('done', { score: correct.value, total: totalRounds.value, difficulty: props.difficulty })
    return
  }

  roundLock.value = false
  const total = gridSize.value * gridSize.value
  commonEmoji.value = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
  let oddEmoji
  do {
    oddEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
  } while (oddEmoji === commonEmoji.value)

  const oddIdx = Math.floor(Math.random() * total)
  gridItems.value = Array.from({ length: total }, (_, i) => ({
    emoji: i === oddIdx ? oddEmoji : commonEmoji.value,
    isOdd: i === oddIdx,
    hit: false,
    miss: false,
  }))
}

function clickCell(item, i) {
  if (state.value !== 'playing' || roundLock.value || item.hit) return

  if (item.isOdd) {
    item.hit = true
    roundLock.value = true
    correct.value++
    sounds.correct()
    setTimeout(nextRound, 500)
  } else if (!item.miss) {
    item.miss = true
    sounds.wrong()
    setTimeout(() => { item.miss = false }, 350)
  }
}
</script>

<style scoped>
.vs-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.vs-center {
  text-align: center;
  max-width: 460px;
  width: 100%;
}

.vs-icon-display { font-size: 3rem; margin-bottom: 12px; }
.vs-label { font-size: 1.2rem; font-weight: 600; color: #f1f5f9; }

.vs-preview-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr); /* overridden inline by gridSize */
  gap: 6px;
  max-width: 260px;
  margin: 0 auto 12px;
}
.vs-cell-p {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
}
.vs-cell-p.odd {
  background: rgba(59,130,246,0.25);
  border-color: #3b82f6;
  animation: blink 1s 3;
}
@keyframes blink { 50% { opacity: 0.4; } }

.vs-hint { color: #94a3b8; font-size: 0.85rem; }

.vs-round { color: #94a3b8; font-size: 0.85rem; margin-bottom: 14px; }

.vs-grid {
  display: grid;
  gap: 8px;
  max-width: 400px;
  margin: 0 auto 14px;
}

.vs-cell {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.05);
  border: 1.5px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(1rem, 2.2vw, 1.6rem);
  cursor: pointer;
  transition: all 0.15s;
}
.vs-cell:hover {
  background: rgba(255,255,255,0.1);
  transform: scale(1.05);
}
.vs-cell.hit {
  background: rgba(52,211,153,0.25);
  border-color: #34d399;
  transform: scale(0.9);
}
.vs-cell.miss {
  animation: shake 0.3s;
  background: rgba(248,113,113,0.2);
  border-color: #f87171;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.vs-target { color: #94a3b8; font-size: 0.9rem; }

.vs-result { margin-top: 12px; }
.vs-result-icon { font-size: 2.5rem; }
.vs-result-text { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; }
.vs-result-sub { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
</style>
