<template>
  <div class="dm-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="dm-center">
      <div class="dm-digit-preview">3847</div>
      <div class="dm-timer-bar"><div class="dm-timer-fill" style="width:40%" /></div>
      <p class="dm-hint">短暂显示数字后凭记忆输入</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="dm-center">
      <div class="dm-icon-display">🔢</div>
      <p class="dm-label">数字记忆测试</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'gameover'" class="dm-center">
      <div class="dm-info">
        <span class="dm-level">当前位数：{{ level }}</span>
        <span class="dm-best" v-if="bestLevel > 0">🏆 最高：{{ bestLevel }} 位</span>
      </div>

      <!-- 记忆阶段 -->
      <div v-if="phase === 'memorize'" class="dm-digit-display">
        {{ currentNumber }}
      </div>
      <div v-if="phase === 'memorize'" class="dm-timer-bar">
        <div class="dm-timer-fill" :style="{ width: timerPct + '%' }" />
      </div>

      <!-- 输入阶段 -->
      <div v-if="phase === 'input'" class="dm-input-area">
        <p class="dm-prompt">输入你记住的数字：</p>
        <input
          ref="inputEl"
          v-model="userInput"
          class="dm-input"
          type="text"
          inputmode="numeric"
          :placeholder="level + ' 位数字'"
          @keydown.enter="submitAnswer"
        />
        <button class="dm-submit" @click="submitAnswer" :disabled="!userInput.trim()">
          确认
        </button>
      </div>

      <!-- 反馈 -->
      <div v-if="phase === 'feedback'" class="dm-feedback" :class="lastCorrect ? 'correct' : 'wrong'">
        {{ lastCorrect ? '✓ 正确！准备下一轮...' : `✗ 错误！正确答案：${correctAnswer}` }}
      </div>

      <!-- Game Over -->
      <div v-if="state === 'gameover'" class="dm-gameover">
        <p>💔 游戏结束</p>
        <div class="dm-records">
          <div class="dm-record">
            <span class="dm-rec-label">🏆 最高纪录</span>
            <span class="dm-rec-val">{{ bestLevel }} 位</span>
          </div>
          <div class="dm-record">
            <span class="dm-rec-label">📋 本次成绩</span>
            <span class="dm-rec-val">{{ level - 1 }} 位</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 0 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const state = ref('idle')
const level = ref(1)
const bestLevel = ref(0)
const currentNumber = ref('')
const userInput = ref('')
const phase = ref('memorize')   // 'memorize' | 'input' | 'feedback'
const lastCorrect = ref(false)
const correctAnswer = ref('')
const timerPct = ref(100)
const inputEl = ref(null)

const speedMap = { 1: [2000, 500], 2: [1500, 350], 3: [1000, 250] }

const memoryTime = computed(() => {
  const [base, per] = speedMap[props.difficulty] || speedMap[1]
  return Math.max(base, base + (level.value - 1) * per)
})

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

async function startGame() {
  level.value = 1
  bestLevel.value = 0
  state.value = 'playing'
  nextRound()
}

async function nextRound() {
  userInput.value = ''
  phase.value = 'memorize'

  // Generate random number of `level` digits
  let num = ''
  num += String(Math.floor(Math.random() * 9) + 1) // first digit non-zero
  for (let i = 1; i < level.value; i++) {
    num += String(Math.floor(Math.random() * 10))
  }
  currentNumber.value = num

  // Countdown
  const total = memoryTime.value
  const start = Date.now()
  timerPct.value = 100
  const interval = setInterval(() => {
    const elapsed = Date.now() - start
    timerPct.value = Math.max(0, Math.round(100 - (elapsed / total) * 100))
    if (elapsed >= total) {
      clearInterval(interval)
      timerPct.value = 0
      phase.value = 'input'
      nextTick(() => inputEl.value?.focus())
    }
  }, 30)
}

function submitAnswer() {
  if (!userInput.value.trim() || phase.value !== 'input') return

  correctAnswer.value = currentNumber.value
  lastCorrect.value = userInput.value.trim() === correctAnswer.value
  lastCorrect.value ? sounds.correct() : sounds.wrong()
  phase.value = 'feedback'

  if (lastCorrect.value) {
    if (level.value > bestLevel.value) bestLevel.value = level.value
    setTimeout(() => {
      level.value++
      nextRound()
    }, 1000)
  } else {
    if (bestLevel.value === 0) bestLevel.value = level.value - 1
    setTimeout(() => {
      state.value = 'gameover'
      emit('done', { score: bestLevel.value, total: level.value - 1, difficulty: props.difficulty })
    }, 1500)
  }
}
</script>

<style scoped>
.dm-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.dm-center {
  text-align: center;
  max-width: 400px;
  width: 100%;
  position: relative;
}

.dm-icon-display { font-size: 3rem; margin-bottom: 12px; }
.dm-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; margin: 0; }

.dm-digit-preview {
  font-size: 3rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: 0.15em;
  margin-bottom: 12px;
}

.dm-hint { color: #64748b; font-size: 0.85rem; }

.dm-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.dm-level { color: #3b82f6; font-size: 0.9rem; font-weight: 600; }
.dm-best { color: #f59e0b; font-size: 0.8rem; }

.dm-digit-display {
  font-size: 3.5rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: 0.2em;
  margin-bottom: 16px;
}

.dm-timer-bar {
  height: 5px;
  background: rgba(255,255,255,0.08);
  border-radius: 3px;
  overflow: hidden;
  max-width: 300px;
  margin: 0 auto 20px;
}
.dm-timer-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 3px;
  transition: width 0.03s linear;
}

.dm-input-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.dm-prompt {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
}
.dm-input {
  width: 200px;
  padding: 12px 16px;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  color: #f1f5f9;
  font-size: 1.2rem;
  text-align: center;
  letter-spacing: 0.15em;
  outline: none;
  transition: border-color 0.2s;
}
.dm-input:focus { border-color: #3b82f6; }
.dm-submit {
  padding: 10px 28px;
  border: none;
  border-radius: 10px;
  background: #3b82f6;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
}
.dm-submit:hover { background: #2563eb; }
.dm-submit:disabled { opacity: 0.4; cursor: default; }

.dm-feedback {
  font-size: 1.05rem;
  padding: 10px 24px;
  border-radius: 12px;
  margin-top: 16px;
  display: inline-block;
}
.dm-feedback.correct { background: rgba(34,197,94,0.15); color: #4ade80; }
.dm-feedback.wrong   { background: rgba(239,68,68,0.15); color: #f87171; }

.dm-gameover {
  margin-top: 20px;
}
.dm-gameover > p {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 16px;
}
.dm-records {
  display: flex;
  justify-content: center;
  gap: 32px;
}
.dm-record {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.dm-rec-label { font-size: 0.75rem; color: #64748b; }
.dm-rec-val  { font-size: 1.4rem; font-weight: 700; color: #f1f5f9; }
</style>
