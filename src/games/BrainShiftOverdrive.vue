<template>
  <div class="bso-game">
    <!-- 预览：展示四张规则卡片 -->
    <div v-if="preview && state === 'idle'" class="bso-center">
      <div class="bso-grid">
        <div class="bso-card top-left">
          <div class="bso-card-label">数字</div>
          <div class="bso-card-rule">偶数→是，奇数→否</div>
        </div>
        <div class="bso-card top-right">
          <div class="bso-card-label">字母</div>
          <div class="bso-card-rule">元音→是，辅音→否</div>
        </div>
        <div class="bso-card bottom-left">
          <div class="bso-card-label">数字</div>
          <div class="bso-card-rule">奇数→是，偶数→否</div>
        </div>
        <div class="bso-card bottom-right">
          <div class="bso-card-label">字母</div>
          <div class="bso-card-rule">辅音→是，元音→否</div>
        </div>
      </div>
      <p class="bso-preview-hint">四张规则卡片，刺激随机出现在某个位置</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="bso-center">
      <div class="bso-icon-display">⚡</div>
      <p class="bso-label">Brain Shift Overdrive</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing'" class="bso-center">
      <div class="bso-round">第 {{ round }} / {{ totalRounds }} 轮</div>

      <div class="bso-grid">
        <div
          v-for="card in positions"
          :key="card.pos"
          class="bso-card"
          :class="{
            active: activePosition === card.pos,
          }"
        >
          <div class="bso-card-label">{{ card.label }}</div>
          <div class="bso-card-rule">{{ card.rule }}</div>
          <div v-if="activePosition === card.pos && showStimulus" class="bso-stimulus">
            {{ currentStimulus }}
          </div>
        </div>
      </div>

      <div v-if="showStimulus && !showFeedback" class="bso-buttons">
        <button class="bso-btn yes" @click="judge(true)">
          👍 是
        </button>
        <button class="bso-btn no" @click="judge(false)">
          👎 否
        </button>
      </div>

      <div v-if="showFeedback" class="bso-feedback" :class="lastCorrect ? 'correct' : 'wrong'">
        {{ lastCorrect ? '✓ 正确!' : '✗ 错误' }}
        <span class="bso-reason">{{ feedbackReason }}</span>
      </div>

      <div v-if="showStimulus && !showFeedback" class="bso-timer">
        <div class="bso-timer-bar" :style="{ width: timerPct + '%' }" />
      </div>
    </div>

    <!-- 完成 -->
    <div v-else-if="state === 'finished'" class="bso-center">
      <p class="bso-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 2000 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

// Helper: extract digit/letter from combo like "M4" or "5J"
function extractDigit(s) {
  return /\d/.test(s[0]) ? parseInt(s[0]) : parseInt(s[1])
}
function extractLetter(s) {
  return /[A-Z]/i.test(s[0]) ? s[0] : s[1]
}

// Fixed-position rule cards (positions never shuffle)
const FIXED_POSITIONS = [
  { pos: 'top-left',     label: '数字', rule: '偶数→是，奇数→否', test: (s) => extractDigit(s) % 2 === 0 },
  { pos: 'top-right',    label: '字母', rule: '元音→是，辅音→否', test: (s) => /^[aeiou]$/i.test(extractLetter(s)) },
  { pos: 'bottom-left',  label: '数字', rule: '奇数→是，偶数→否', test: (s) => extractDigit(s) % 2 !== 0 },
  { pos: 'bottom-right', label: '字母', rule: '辅音→是，元音→否', test: (s) => /^[a-z]$/i.test(extractLetter(s)) && !/^[aeiou]$/i.test(extractLetter(s)) },
]

const POS_KEYS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

const state = ref('idle')
const round = ref(0)
const totalRounds = 16
const score = ref(0)
const positions = ref([])
const activePosition = ref(null)
const currentStimulus = ref('')
const showStimulus = ref(false)
const showFeedback = ref(false)
const lastCorrect = ref(false)
const feedbackReason = ref('')
const timerPct = ref(100)
let timerInterval = null

const intervalMs = computed(() => props.difficulty)

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

async function startGame() {
  score.value = 0
  round.value = 0
  state.value = 'playing'
  initPositions()
  nextRound()
}

function initPositions() {
  positions.value = [...FIXED_POSITIONS]
}

function randomCombo() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const letter = letters[Math.floor(Math.random() * letters.length)]
  const digit = Math.floor(Math.random() * 10)
  // Randomly decide letter-first or digit-first
  return Math.random() < 0.5
    ? letter + String(digit)
    : String(digit) + letter
}

function nextRound() {
  round.value++
  if (round.value > totalRounds) {
    state.value = 'finished'
    emit('done', { score: score.value, total: totalRounds, difficulty: props.difficulty })
    return
  }

  showFeedback.value = false

  const posIdx = Math.floor(Math.random() * 4)
  activePosition.value = POS_KEYS[posIdx]
  currentStimulus.value = randomCombo()

  showStimulus.value = true
  startTimer()
}

function startTimer() {
  timerPct.value = 100
  const start = Date.now()
  const total = intervalMs.value
  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - start
    timerPct.value = Math.max(0, Math.round(100 - (elapsed / total) * 100))
    if (elapsed >= total) {
      clearInterval(timerInterval)
      handleJudgment(null)
    }
  }, 50)
}

function judge(answer) {
  clearInterval(timerInterval)
  handleJudgment(answer)
}

function handleJudgment(playerAnswer) {
  if (!showStimulus.value || showFeedback.value) return

  const card = positions.value.find(p => p.pos === activePosition.value)
  const stim = currentStimulus.value
  const expected = card.test(stim)
  const correct = playerAnswer === expected

  showFeedback.value = true
  lastCorrect.value = correct

  const isDigitCard = card.label === '数字'
  if (isDigitCard) {
    const d = extractDigit(stim)
    feedbackReason.value = `「${stim}」数字部分 ${d} 是${d % 2 === 0 ? '偶数' : '奇数'}，应回答「${expected ? '是' : '否'}」`
  } else {
    const l = extractLetter(stim)
    const isVowel = /^[aeiou]$/i.test(l)
    feedbackReason.value = `「${stim}」字母部分 ${l} 是${isVowel ? '元音' : '辅音'}，应回答「${expected ? '是' : '否'}」`
  }

  if (correct) { score.value++; sounds.correct() } else { sounds.wrong() }

  setTimeout(() => {
    showStimulus.value = false
    nextRound()
  }, 1200)
}

watch(() => state.value, (s) => {
  if (s !== 'playing') clearInterval(timerInterval)
})
</script>

<style scoped>
.bso-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.bso-center {
  text-align: center;
  max-width: 520px;
  width: 100%;
}

.bso-icon-display { font-size: 3rem; margin-bottom: 12px; }
.bso-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.bso-preview-hint {
  color: #94a3b8;
  font-size: 0.8rem;
  margin-top: 12px;
}

.bso-round {
  color: #64748b;
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.bso-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 10px;
  max-width: 440px;
  margin: 0 auto 20px;
}

.bso-card {
  aspect-ratio: 1;
  min-height: 120px;
  background: rgba(255,255,255,0.04);
  border: 2px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.25s;
}

.bso-card.active {
  border-color: #3b82f6;
  background: rgba(59,130,246,0.1);
  box-shadow: 0 0 20px rgba(59,130,246,0.2);
}

.bso-card-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.bso-card-rule {
  font-size: 0.72rem;
  color: #94a3b8;
  line-height: 1.4;
  text-align: center;
}

.bso-stimulus {
  font-size: 2.8rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-top: 8px;
  animation: popIn 0.25s ease-out;
}

@keyframes popIn {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.bso-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 16px;
}

.bso-btn {
  padding: 14px 36px;
  border: 2px solid;
  border-radius: 14px;
  font-size: 1.15rem;
  cursor: pointer;
  transition: all 0.15s;
  background: transparent;
}
.bso-btn.yes {
  border-color: #22c55e;
  color: #22c55e;
}
.bso-btn.yes:hover { background: rgba(34,197,94,0.1); }
.bso-btn.no {
  border-color: #ef4444;
  color: #ef4444;
}
.bso-btn.no:hover { background: rgba(239,68,68,0.1); }

.bso-feedback {
  font-size: 1rem;
  padding: 6px 20px;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 8px;
}
.bso-feedback.correct {
  background: rgba(34,197,94,0.15);
  color: #4ade80;
}
.bso-feedback.wrong {
  background: rgba(239,68,68,0.15);
  color: #f87171;
}
.bso-reason {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
  margin-top: 2px;
}

.bso-timer {
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
  max-width: 300px;
  margin: 0 auto;
}
.bso-timer-bar {
  height: 100%;
  background: #f59e0b;
  border-radius: 2px;
  transition: width 0.05s linear;
}

.bso-done {
  color: #94a3b8;
  font-size: 1rem;
}
</style>
