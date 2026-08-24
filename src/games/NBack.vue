<template>
  <div class="nb-game">
    <!-- 预览：展示静态的 N-Back 界面 -->
    <div v-if="preview && state === 'idle'" class="nb-center">
      <div class="nb-n-label">{{ nValue }}-Back</div>
      <div class="nb-stimulus appear">🐶</div>
      <div class="nb-buttons">
        <span class="nb-btn same">✅ 相同</span>
        <span class="nb-btn diff">❌ 不同</span>
      </div>
      <div class="nb-progress">
        <div class="nb-progress-bar" :style="{ width: '30%' }" />
      </div>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="nb-center">
      <div class="nb-icon-display">🔢</div>
      <p class="nb-label">N-Back</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing'" class="nb-center">
      <div class="nb-round">第 {{ displayRound }} / {{ totalRounds }} 轮</div>
      <div class="nb-n-label">{{ nValue }}-Back</div>

      <div class="nb-stimulus" :class="{ appear: showStimulus }">
        {{ currentStimulus }}
      </div>

      <p v-if="skipping" class="nb-skip">等待刺激序列建立...</p>

      <div v-else-if="showStimulus && !showFeedback" class="nb-buttons">
        <button class="nb-btn same" @click="judge('same')">
          ✅ 相同
        </button>
        <button class="nb-btn diff" @click="judge('diff')">
          ❌ 不同
        </button>
      </div>

      <div v-if="showFeedback" class="nb-feedback" :class="lastCorrect ? 'correct' : 'wrong'">
        {{ timedOut ? '⏱ 超时' : (lastCorrect ? '✓ 正确!' : '✗ 错误') }}
      </div>

      <div class="nb-progress">
        <div class="nb-progress-bar" :style="{ width: progressPct + '%' }" />
      </div>
    </div>

    <!-- 完成 -->
    <div v-else-if="state === 'finished'" class="nb-center">
      <p class="nb-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 2 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const ANIMALS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵']

const state = ref('idle')
const totalRounds = 20
const score = ref(0)
const nValue = computed(() => props.difficulty)
const currentStimulus = ref('')
const showStimulus = ref(false)
const skipping = ref(false)
const showFeedback = ref(false)
const lastCorrect = ref(false)
const timedOut = ref(false)
const stimuliCount = ref(0)

const RESPONSE_WINDOW = 2000

const displayRound = computed(() => {
  const n = nValue.value
  const effective = stimuliCount.value - n
  return effective > 0 ? effective : 0
})

const progressPct = computed(() => {
  const effectiveTotal = totalRounds - nValue.value
  const current = displayRound.value
  return effectiveTotal > 0 ? Math.round((current / effectiveTotal) * 100) : 0
})

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

// 键盘支持：1/← 相同，2/→ 不同
function onKeydown(e) {
  if (state.value !== 'playing') return
  if (e.key === '1' || e.key === 'ArrowLeft') judge('same')
  if (e.key === '2' || e.key === 'ArrowRight') judge('diff')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(judgmentTimer)
})

onMounted(() => {
  if (!props.preview) startGame()
})

async function startGame() {
  score.value = 0
  stimuliCount.value = 0
  showFeedback.value = false
  state.value = 'playing'

  const seq = []
  for (let i = 0; i < totalRounds; i++) {
    if (i >= nValue.value && Math.random() < 0.3) {
      seq.push(seq[i - nValue.value])
    } else {
      let animal
      do {
        animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
      } while (i >= nValue.value && animal === seq[i - nValue.value])
      seq.push(animal)
    }
  }

  for (let i = 0; i < seq.length; i++) {
    currentStimulus.value = seq[i]
    showStimulus.value = true
    stimuliCount.value = i + 1

    if (i < nValue.value) {
      skipping.value = true
      await delay(1000)
      showStimulus.value = false
      skipping.value = false
      await delay(300)
      continue
    }

    timedOut.value = false
    const result = await waitForJudgment(RESPONSE_WINDOW)
    showFeedback.value = true

    const expected = seq[i] === seq[i - nValue.value]
    const answer = result === 'same'
    timedOut.value = result === null
    lastCorrect.value = !timedOut.value && answer === expected
    if (lastCorrect.value) { score.value++; sounds.correct() } else { sounds.wrong() }

    await delay(600)
    showStimulus.value = false
    showFeedback.value = false
    lastCorrect.value = false
    timedOut.value = false
    await delay(400)
  }

  state.value = 'finished'
  const effectiveTotal = totalRounds - nValue.value
  emit('done', { score: score.value, total: effectiveTotal > 0 ? effectiveTotal : totalRounds, difficulty: props.difficulty })
}

let judgmentResolver = null
let judgmentTimer = null
function judge(answer) {
  if (state.value !== 'playing' || !judgmentResolver) return
  judgmentResolver(answer)
  judgmentResolver = null
  clearTimeout(judgmentTimer)
}

function waitForJudgment(timeout) {
  return new Promise((resolve) => {
    judgmentResolver = resolve
    clearTimeout(judgmentTimer)
    judgmentTimer = setTimeout(() => {
      if (judgmentResolver) {
        judgmentResolver(null)
        judgmentResolver = null
      }
    }, timeout)
  })
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}
</script>

<style scoped>
.nb-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.nb-center {
  text-align: center;
  max-width: 360px;
  width: 100%;
}

.nb-icon-display { font-size: 3rem; margin-bottom: 12px; }
.nb-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.nb-round { color: #64748b; font-size: 0.85rem; margin-bottom: 4px; }
.nb-n-label {
  color: #3b82f6;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 20px;
}

.nb-stimulus {
  font-size: 5rem;
  margin: 0 0 24px;
  transition: transform 0.25s, opacity 0.25s;
  opacity: 0;
  transform: scale(0.7);
}
.nb-stimulus.appear {
  opacity: 1;
  transform: scale(1);
}

.nb-skip {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0 0 24px;
}

.nb-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 12px;
}

.nb-btn {
  padding: 14px 32px;
  border: 2px solid;
  border-radius: 14px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.15s;
  background: transparent;
  display: inline-block;
}
.nb-btn.same {
  border-color: #22c55e;
  color: #22c55e;
}
button.nb-btn.same:hover { background: rgba(34,197,94,0.1); }
.nb-btn.diff {
  border-color: #ef4444;
  color: #ef4444;
}
button.nb-btn.diff:hover { background: rgba(239,68,68,0.1); }

.nb-feedback {
  font-size: 1rem;
  margin-bottom: 16px;
  padding: 6px 20px;
  border-radius: 20px;
  display: inline-block;
}
.nb-feedback.correct {
  background: rgba(34,197,94,0.15);
  color: #4ade80;
}
.nb-feedback.wrong {
  background: rgba(239,68,68,0.15);
  color: #f87171;
}

.nb-progress {
  height: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
  max-width: 280px;
  margin: 0 auto;
}
.nb-progress-bar {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  transition: width 0.3s;
}

.nb-done {
  color: #94a3b8;
  font-size: 1rem;
}
</style>
