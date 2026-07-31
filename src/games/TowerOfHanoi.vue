<template>
  <div class="th-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="th-center">
      <div class="th-preview-label">汉诺塔</div>
      <div class="th-preview">
        <div v-for="peg in 3" :key="peg" class="th-peg-preview">
          <span class="th-ring-p" :style="{ width: 70 - peg * 12 + 'px' }"></span>
          <span class="th-ring-p" :style="{ width: 46 - peg * 12 + 'px' }"></span>
          <span class="th-ring-p" :style="{ width: 22 + 'px' }"></span>
        </div>
      </div>
      <p class="th-hint">将所有圆盘按顺序移到目标柱</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="th-center">
      <div class="th-icon-display">🗼</div>
      <p class="th-label">汉诺塔</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'finished'" class="th-center">
      <div class="th-info">
        <span class="th-moves">步数：{{ moves }}</span>
        <span class="th-best">最优：{{ optimalMoves }}</span>
      </div>
      <p class="th-hint">点击柱子选中顶部圆盘，再点目标柱移动</p>

      <div class="th-board">
        <div
          v-for="(peg, pi) in pegs"
          :key="pi"
          class="th-peg"
          :class="{ selected: selectedPeg === pi, target: targetPeg === pi }"
          @click="clickPeg(pi)"
        >
          <div class="th-stack">
            <div
              v-for="(ring, ri) in peg"
              :key="ri"
              class="th-ring"
              :style="{ width: 30 + ring * 26 + 'px', background: ringColor(ring) }"
            ></div>
          </div>
          <div class="th-peg-base"></div>
          <span class="th-peg-label">{{ pegName(pi) }}</span>
        </div>
      </div>

      <div v-if="state === 'finished'" class="th-result">
        <div class="th-result-icon">{{ resultIcon }}</div>
        <p class="th-result-text">{{ resultText }}</p>
        <p class="th-result-sub">用了 {{ moves }} 步，最优 {{ optimalMoves }} 步</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 3 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const pegNames = ['起点', '中转', '目标']
function pegName(pi) { return pegNames[pi] }

const state = ref('idle')
const numRings = computed(() => props.difficulty || 3)
const optimalMoves = computed(() => Math.pow(2, numRings.value) - 1)
const pegs = ref([])
const selectedPeg = ref(null)
const targetPeg = ref(null)
const moves = ref(0)

const resultIcon = computed(() => {
  const r = moves.value / optimalMoves.value
  if (r <= 1) return '🏆'
  if (r <= 1.5) return '🎯'
  return '💪'
})
const resultText = computed(() => {
  const r = moves.value / optimalMoves.value
  if (r <= 1) return '完美通关！'
  if (r <= 1.5) return '完成！'
  return '完成，再接再厉'
})

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

function startGame() {
  moves.value = 0
  selectedPeg.value = null
  targetPeg.value = null
  pegs.value = [
    Array.from({ length: numRings.value }, (_, i) => numRings.value - i),
    [],
    [],
  ]
  state.value = 'playing'
}

function clickPeg(pi) {
  if (state.value !== 'playing') return

  // Second click after selecting: try to move
  if (selectedPeg.value !== null && selectedPeg.value !== pi) {
    const from = selectedPeg.value
    const ring = pegs.value[from][pegs.value[from].length - 1]
    const toTop = pegs.value[pi][pegs.value[pi].length - 1]

    if (ring !== undefined && (toTop === undefined || ring < toTop)) {
      pegs.value[from].pop()
      pegs.value[pi].push(ring)
      moves.value++
      sounds.flip()
      targetPeg.value = pi
      setTimeout(() => { targetPeg.value = null }, 250)
    }
    selectedPeg.value = null
    checkWin()
    return
  }

  // First click: select a peg with rings
  if (pegs.value[pi].length > 0) {
    selectedPeg.value = selectedPeg.value === pi ? null : pi
  }
}

function ringColor(size) {
  const colors = ['#3b82f6', '#22d3ee', '#8b5cf6', '#34d399', '#fbbf24', '#f87171']
  return colors[(size - 1) % colors.length]
}

function checkWin() {
  if (pegs.value[2].length === numRings.value) {
    state.value = 'finished'
    sounds.win()
    const acc = Math.round((optimalMoves.value / Math.max(1, moves.value)) * 100)
    emit('done', {
      score: moves.value,
      total: optimalMoves.value,
      accuracy: acc,
      difficulty: props.difficulty,
    })
  }
}
</script>

<style scoped>
.th-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.th-center {
  text-align: center;
  max-width: 480px;
  width: 100%;
}

.th-icon-display { font-size: 3rem; margin-bottom: 12px; }
.th-label { font-size: 1.2rem; font-weight: 600; color: #f1f5f9; }

.th-preview-label { color: #3b82f6; font-size: 0.9rem; font-weight: 600; margin-bottom: 12px; }
.th-preview {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 12px;
}
.th-peg-preview {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 4px;
  min-height: 70px;
  border-bottom: 3px solid rgba(255,255,255,0.2);
  padding: 0 4px 4px;
}
.th-ring-p {
  height: 14px;
  border-radius: 4px;
  background: rgba(59,130,246,0.4);
}

.th-hint { color: #94a3b8; font-size: 0.85rem; }

.th-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 10px;
}
.th-moves { color: #3b82f6; font-size: 0.9rem; font-weight: 600; }
.th-best { color: #94a3b8; font-size: 0.85rem; }

.th-board {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 20px auto 16px;
  padding: 16px;
}

.th-peg {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 0 14px;
  border-radius: 10px;
  transition: all 0.2s;
  user-select: none;
}
.th-peg:hover { background: rgba(255,255,255,0.05); }
.th-peg.selected {
  background: rgba(59,130,246,0.14);
  box-shadow: 0 0 16px rgba(59,130,246,0.2);
}
.th-peg.target {
  background: rgba(34,211,238,0.12);
}

.th-stack {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 6px;
  min-height: 180px;
  padding-bottom: 6px;
}

.th-ring {
  height: 22px;
  border-radius: 8px;
  transition: all 0.2s;
}

.th-peg-base {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.25);
  border-radius: 2px;
}

.th-peg-label {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 8px;
}

.th-result {
  margin-top: 8px;
}
.th-result-icon { font-size: 2.5rem; }
.th-result-text { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; }
.th-result-sub { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
</style>
