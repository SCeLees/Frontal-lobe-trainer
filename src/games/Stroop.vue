<template>
  <div class="st-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="st-center">
      <div class="st-example-label">示例</div>
      <div class="st-word-preview" style="color: #3b82f6;">红</div>
      <p class="st-example-hint">字体颜色是蓝色 → 正确答案：<span class="st-example-ans">蓝色</span></p>
      <div class="st-btns-preview">
        <span v-for="c in COLORS" :key="c.name" class="st-btn-preview">
          {{ c.label }}
        </span>
      </div>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="st-center">
      <div class="st-icon-display">🛑</div>
      <p class="st-label">Stroop 测验</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing'" class="st-center">
      <div class="st-round">第 {{ round }} / {{ totalRounds }} 轮</div>
      <div class="st-score">得分：{{ score }}</div>

      <div class="st-word" :style="{ color: currentColor }">
        {{ currentWord }}
      </div>
      <p class="st-hint">请选择字体<strong>颜色</strong>（忽略文字内容）</p>

      <div class="st-buttons">
        <button
          v-for="c in COLORS"
          :key="c.name"
          class="st-btn"
          :disabled="showFeedback"
          @click="answer(c.name)"
        >
          {{ c.label }}
        </button>
      </div>

      <div v-if="showFeedback" class="st-feedback" :class="lastCorrect ? 'correct' : 'wrong'">
        {{ lastCorrect ? '✓ 正确!' : `✗ 错误，正确答案是「${correctLabel}」(字体颜色)` }}
      </div>
    </div>

    <!-- 完成 -->
    <div v-else-if="state === 'finished'" class="st-center">
      <p class="st-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 0 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const COLORS = [
  { name: 'red',    label: '红色', hex: '#ef4444' },
  { name: 'blue',   label: '蓝色', hex: '#3b82f6' },
  { name: 'green',  label: '绿色', hex: '#22c55e' },
  { name: 'yellow', label: '黄色', hex: '#eab308' },
  { name: 'purple', label: '紫色', hex: '#a855f7' },
  { name: 'black',  label: '黑色', hex: '#1e293b' },
]

const WORDS = ['红', '蓝', '绿', '黄', '紫', '黑']

const state = ref('idle')
const round = ref(0)
const totalRounds = computed(() => props.difficulty || 18)
const score = ref(0)
const currentWord = ref('')
const currentColor = ref('')
const showFeedback = ref(false)
const lastCorrect = ref(false)
const correctLabel = ref('')

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

// 键盘支持：数字键 1-6 选择颜色
function onKeydown(e) {
  if (state.value !== 'playing') return
  const idx = parseInt(e.key) - 1
  if (idx >= 0 && idx < COLORS.length) {
    answer(COLORS[idx].name)
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

onMounted(() => {
  if (!props.preview) startGame()
})

let answerResolve = null

async function startGame() {
  score.value = 0
  round.value = 0
  state.value = 'playing'
  nextRound()
}

function nextRound() {
  round.value++
  if (round.value > totalRounds.value) {
    state.value = 'finished'
    emit('done', { score: score.value, total: totalRounds.value, difficulty: props.difficulty })
    return
  }
  showFeedback.value = false

  // Pick random word and color, ensure they're different ~70% of the time (incongruent)
  const wordIdx = Math.floor(Math.random() * WORDS.length)
  let colorIdx
  if (Math.random() < 0.7) {
    do {
      colorIdx = Math.floor(Math.random() * COLORS.length)
    } while (colorIdx === wordIdx)
  } else {
    colorIdx = wordIdx
  }

  currentWord.value = WORDS[wordIdx]
  currentColor.value = COLORS[colorIdx].hex
}

function answer(colorName) {
  if (showFeedback.value) return
  const correctName = COLORS.find(c => c.hex === currentColor.value).name
  lastCorrect.value = colorName === correctName
  correctLabel.value = COLORS.find(c => c.name === correctName).label

  showFeedback.value = true
  if (lastCorrect.value) { score.value++; sounds.correct() } else { sounds.wrong() }

  setTimeout(nextRound, 1200)
}
</script>

<style scoped>
.st-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.st-center {
  text-align: center;
  max-width: 440px;
  width: 100%;
}

.st-icon-display { font-size: 3rem; margin-bottom: 12px; }
.st-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.st-example-label {
  color: #64748b;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.st-word-preview {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.st-example-hint {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0 0 16px;
}
.st-example-ans {
  color: #3b82f6;
  font-weight: 600;
}

.st-btns-preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 280px;
  margin: 0 auto;
}

.st-btn-preview {
  padding: 8px 12px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.2);
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}

.st-round { color: #64748b; font-size: 0.85rem; margin-bottom: 4px; }
.st-score { color: #22c55e; font-size: 0.9rem; margin-bottom: 20px; }

.st-word {
  font-size: 4rem;
  font-weight: 800;
  margin: 0 0 12px;
  line-height: 1.1;
}

.st-hint {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0 0 24px;
}

.st-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  max-width: 320px;
  margin: 0 auto 16px;
}

.st-btn {
  padding: 14px 8px;
  border: 2px solid rgba(255,255,255,0.25);
  border-radius: 10px;
  background: transparent;
  color: #f1f5f9;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s, background 0.1s;
}
.st-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.st-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.st-feedback {
  font-size: 1rem;
  padding: 8px 20px;
  border-radius: 20px;
  display: inline-block;
}
.st-feedback.correct {
  background: rgba(34,197,94,0.15);
  color: #4ade80;
}
.st-feedback.wrong {
  background: rgba(239,68,68,0.15);
  color: #f87171;
}

.st-done {
  color: #94a3b8;
  font-size: 1rem;
}
</style>
