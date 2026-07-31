<template>
  <div class="dc-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="dc-center">
      <div class="dc-rule-label">按 颜色 分类</div>
      <div class="dc-card-preview" :style="{ background: colorShapes[0].hex }">
        <span class="dc-card-shape">{{ colorShapes[0].shape }}</span>
      </div>
      <div class="dc-bins-preview" :class="'cols-' + numTypes">
        <span
          v-for="cs in colorShapes"
          :key="cs.name"
          class="dc-bin"
          :style="{ borderColor: cs.hex, color: cs.hex }"
        >{{ cs.colorLabel }}</span>
      </div>
      <p class="dc-hint">按规则将卡片拖入对应分类</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="dc-center">
      <div class="dc-icon-display">🎨</div>
      <p class="dc-label">DCCS 卡片分类</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing'" class="dc-center">
      <div class="dc-round">第 {{ round }} / {{ totalRounds }} 轮</div>

      <div class="dc-phase-badge" :class="currentRule">
        {{ currentRule === 'color' ? '按颜色分类' : '按形状分类' }}
      </div>
      <p v-if="phaseChanged" class="dc-switch-hint">⚠ 规则已切换！</p>

      <div class="dc-card" :style="{ background: currentCard.hex }">
        <span class="dc-card-shape">{{ currentCard.shape }}</span>
      </div>

      <div class="dc-bins" :class="'cols-' + numTypes">
        <button
          v-for="cs in colorShapes"
          :key="cs.name"
          class="dc-bin"
          :style="binStyle(cs)"
          @click="classify(cs)"
        >
          {{ currentRule === 'color' ? cs.colorLabel : cs.shapeLabel }}
        </button>
      </div>

      <div v-if="showFeedback" class="dc-feedback" :class="lastCorrect ? 'correct' : 'wrong'">
        {{ lastCorrect ? '✓ 正确!' : '✗ 错误' }}
      </div>

      <div class="dc-stats">正确：{{ score }} / {{ round - 1 }}</div>

      <div class="dc-dots">
        <span v-for="i in totalRounds" :key="i" class="dc-dot"
          :class="{ done: i < round, wrong: i < round && answers[i-1] === false }" />
      </div>
    </div>

    <!-- 完成 -->
    <div v-else-if="state === 'finished'" class="dc-center">
      <p class="dc-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 2 },
  extraOptions: { type: Object, default: () => ({ rounds: 20 }) },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

// Color-shape pairs
const ALL_COLORS = [
  { name: 'red',    hex: '#ef4444', colorLabel: '🔴 红', shapeLabel: '● 圆', shape: '●' },
  { name: 'blue',   hex: '#3b82f6', colorLabel: '🔵 蓝', shapeLabel: '★ 星', shape: '★' },
  { name: 'green',  hex: '#22c55e', colorLabel: '🟢 绿', shapeLabel: '▲ 三角', shape: '▲' },
  { name: 'yellow', hex: '#eab308', colorLabel: '🟡 黄', shapeLabel: '■ 方块', shape: '■' },
]

const numTypes = computed(() => props.difficulty || 2)
const colorShapes = computed(() => ALL_COLORS.slice(0, numTypes.value))
const totalRounds = computed(() => props.extraOptions.rounds || 20)
const switchAt = computed(() => Math.floor(totalRounds.value / 2))

const state = ref('idle')
const round = ref(0)
const score = ref(0)
const currentRule = ref('color')
const currentCard = ref({ hex: '#ef4444', shape: '●' })
const showFeedback = ref(false)
const lastCorrect = ref(false)
const phaseChanged = ref(false)
const answers = ref([])

function binStyle(cs) {
  if (currentRule.value === 'color') {
    return { borderColor: cs.hex, color: cs.hex }
  }
  // Shape rule: all bins same style
  return { borderColor: 'rgba(255,255,255,0.2)', color: '#94a3b8' }
}

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

// 键盘支持：数字键 1-N 选择分类桶
function onKeydown(e) {
  if (state.value !== 'playing') return
  const idx = parseInt(e.key) - 1
  if (idx >= 0 && idx < numTypes.value) {
    classify(colorShapes.value[idx])
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

onMounted(() => {
  if (!props.preview) startGame()
})

function startGame() {
  score.value = 0
  round.value = 0
  currentRule.value = 'color'
  answers.value = []
  state.value = 'playing'
  phaseChanged.value = false
  nextRound()
}

function nextRound() {
  round.value++
  if (round.value > totalRounds.value) {
    state.value = 'finished'
    emit('done', { score: score.value, total: totalRounds.value, difficulty: props.difficulty })
    return
  }

  if (round.value === switchAt.value + 1) {
    currentRule.value = 'shape'
    phaseChanged.value = true
    setTimeout(() => { phaseChanged.value = false }, 2000)
  }

  showFeedback.value = false
  const cs = colorShapes.value[Math.floor(Math.random() * numTypes.value)]
  currentCard.value = { hex: cs.hex, shape: cs.shape }
}

function classify(cs) {
  if (showFeedback.value) return

  const correct = currentRule.value === 'color'
    ? cs.hex === currentCard.value.hex
    : cs.shape === currentCard.value.shape

  lastCorrect.value = correct
  answers.value.push(correct)
  showFeedback.value = true
  if (correct) { score.value++; sounds.correct() } else { sounds.wrong() }

  setTimeout(nextRound, 700)
}
</script>

<style scoped>
.dc-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.dc-center {
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.dc-icon-display { font-size: 3rem; margin-bottom: 12px; }
.dc-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.dc-rule-label {
  color: #3b82f6;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 16px;
}
.dc-card-preview {
  width: 100px; height: 100px;
  border-radius: 16px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dc-card-shape {
  font-size: 2.4rem;
  color: #fff;
}

.dc-bins-preview {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 360px;
  margin: 0 auto;
}
.dc-bins-preview.cols-2 .dc-bin { min-width: 100px; }
.dc-bins-preview.cols-3 .dc-bin { min-width: 80px; }
.dc-bins-preview.cols-4 .dc-bin { min-width: 70px; }

.dc-bin {
  padding: 10px 16px;
  border: 2px solid;
  border-radius: 12px;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: default;
}

.dc-hint { color: #64748b; font-size: 0.8rem; margin-top: 12px; }

.dc-round { color: #64748b; font-size: 0.85rem; margin-bottom: 8px; }

.dc-phase-badge {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 8px;
}
.dc-phase-badge.color { background: rgba(59,130,246,0.15); color: #60a5fa; }
.dc-phase-badge.shape { background: rgba(168,85,247,0.15); color: #c084fc; }

.dc-switch-hint {
  color: #f59e0b;
  font-size: 0.8rem;
  margin: 0 0 12px;
  animation: blink 0.5s 3;
}
@keyframes blink { 50% { opacity: 0.3; } }

.dc-card {
  width: 110px; height: 110px;
  border-radius: 18px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.dc-bins {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 400px;
  margin: 0 auto 16px;
}
.dc-bins.cols-2 .dc-bin { min-width: 110px; }
.dc-bins.cols-3 .dc-bin { min-width: 90px; }
.dc-bins.cols-4 .dc-bin { min-width: 75px; }

.dc-bins .dc-bin {
  padding: 12px 16px;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}
.dc-bins .dc-bin:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.dc-feedback {
  font-size: 1rem;
  padding: 6px 20px;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 12px;
}
.dc-feedback.correct { background: rgba(34,197,94,0.15); color: #4ade80; }
.dc-feedback.wrong   { background: rgba(239,68,68,0.15); color: #f87171; }

.dc-stats {
  color: #94a3b8;
  font-size: 0.8rem;
  margin-bottom: 12px;
}

.dc-dots {
  display: flex;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  max-width: 300px;
  margin: 0 auto;
}
.dc-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
}
.dc-dot.done { background: #22c55e; }
.dc-dot.wrong { background: #ef4444; }

.dc-done {
  color: #94a3b8;
  font-size: 1rem;
}
</style>
