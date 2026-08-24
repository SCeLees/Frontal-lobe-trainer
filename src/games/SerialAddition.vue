<template>
  <div class="sa-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="sa-center">
      <div class="sa-preview-example">
        <span class="sa-prev">3</span>
        <span class="sa-plus">+</span>
        <span class="sa-curr">7</span>
        <span class="sa-eq">=</span>
        <span class="sa-ans">10</span>
      </div>
      <p class="sa-hint">记住上一个数字，把“上一个 + 当前”算出来</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="sa-center">
      <div class="sa-icon-display">🧮</div>
      <p class="sa-label">连续加法</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'gameover'" class="sa-center">
      <div class="sa-info">
        <span class="sa-round">第 {{ currentIndex }} / {{ totalRounds }} 题</span>
        <span class="sa-score">✅ {{ score }}</span>
      </div>

      <div v-if="phase === 'memorize'" class="sa-memorize">
        <p class="sa-mem-label">记住这个数字</p>
        <div class="sa-number">{{ sequence[currentIndex] }}</div>
      </div>

      <div v-else-if="phase === 'input'" class="sa-input-area">
        <p class="sa-prompt">上一个数字（已隐藏）+ 当前数字 = ?</p>
        <div class="sa-current">{{ sequence[currentIndex] }}</div>
        <div class="sa-input-row">
          <input
            ref="inputEl"
            v-model="userInput"
            class="sa-input"
            type="text"
            inputmode="numeric"
            placeholder="输入结果"
            @keydown.enter="submitAnswer"
          />
          <button class="sa-submit" @click="submitAnswer" :disabled="!userInput.trim()">确认</button>
        </div>
      </div>

      <div v-if="phase === 'feedback'" class="sa-feedback" :class="lastCorrect ? 'correct' : 'wrong'">
        {{ lastCorrect ? '✓ 正确!' : `✗ 错误，${sequence[currentIndex - 1]} + ${sequence[currentIndex]} = ${sequence[currentIndex - 1] + sequence[currentIndex]}` }}
      </div>
    </div>

    <!-- 完成 -->
    <div v-else-if="state === 'finished'" class="sa-center">
      <p class="sa-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 16 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const state = ref('idle')
const totalRounds = computed(() => props.difficulty || 16)
const sequence = ref([])
const currentIndex = ref(0)
const phase = ref('memorize') // memorize | input | feedback
const userInput = ref('')
const score = ref(0)
const lastCorrect = ref(false)
const inputEl = ref(null)
let nextTimer = null

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

onMounted(() => {
  if (!props.preview) startGame()
})

function startGame() {
  score.value = 0
  currentIndex.value = 0
  state.value = 'playing'
  phase.value = 'memorize'
  // 生成 totalRounds+1 个数字，共作答 totalRounds 次
  const seq = []
  for (let i = 0; i <= totalRounds.value; i++) {
    seq.push(Math.floor(Math.random() * 9) + 1)
  }
  sequence.value = seq
  showMemorize()
}

function showMemorize() {
  phase.value = 'memorize'
  clearTimeout(nextTimer)
  nextTimer = setTimeout(() => {
    if (currentIndex.value >= totalRounds.value) {
      finish()
      return
    }
    currentIndex.value++
    phase.value = 'input'
    userInput.value = ''
    nextTick(() => inputEl.value?.focus())
  }, 1600)
}

function submitAnswer() {
  if (state.value !== 'playing' || phase.value !== 'input' || !userInput.value.trim()) return
  const answer = Number(userInput.value.trim())
  const expected = sequence.value[currentIndex.value - 1] + sequence.value[currentIndex.value]
  lastCorrect.value = answer === expected
  phase.value = 'feedback'

  if (lastCorrect.value) {
    score.value++
    sounds.correct()
  } else {
    sounds.wrong()
  }

  clearTimeout(nextTimer)
  nextTimer = setTimeout(() => {
    if (currentIndex.value >= totalRounds.value) {
      finish()
    } else {
      currentIndex.value++
      phase.value = 'input'
      userInput.value = ''
      nextTick(() => inputEl.value?.focus())
    }
  }, lastCorrect.value ? 900 : 1600)
}

function finish() {
  state.value = 'finished'
  emit('done', { score: score.value, total: totalRounds.value, difficulty: props.difficulty })
}
</script>

<style scoped>
.sa-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.sa-center {
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.sa-icon-display { font-size: 3rem; margin-bottom: 12px; }
.sa-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }

.sa-preview-example {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 2.2rem;
  font-weight: 800;
  margin: 20px 0 12px;
  color: #f1f5f9;
}
.sa-prev { color: #64748b; }
.sa-curr { color: #3b82f6; }
.sa-ans { color: #22c55e; }
.sa-plus, .sa-eq { color: #94a3b8; font-size: 1.4rem; }

.sa-hint { color: #94a3b8; font-size: 0.85rem; }

.sa-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.sa-round { color: #64748b; font-size: 0.85rem; }
.sa-score { color: #22c55e; font-size: 0.9rem; font-weight: 600; }

.sa-memorize .sa-number {
  font-size: 5rem;
  font-weight: 800;
  color: #f1f5f9;
}
.sa-mem-label { color: #94a3b8; font-size: 0.9rem; margin-bottom: 8px; }

.sa-prompt { color: #94a3b8; font-size: 0.9rem; margin: 0 0 6px; }
.sa-current {
  font-size: 4.5rem;
  font-weight: 800;
  color: #3b82f6;
  margin-bottom: 14px;
}

.sa-input-row { display: flex; gap: 10px; justify-content: center; }
.sa-input {
  width: 140px;
  padding: 12px 16px;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  color: #f1f5f9;
  font-size: 1.2rem;
  text-align: center;
  outline: none;
}
.sa-input:focus { border-color: #3b82f6; }
.sa-submit {
  padding: 12px 22px;
  border: none;
  border-radius: 10px;
  background: #3b82f6;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
}
.sa-submit:disabled { opacity: 0.4; cursor: default; }

.sa-feedback {
  display: inline-block;
  font-size: 1rem;
  padding: 8px 20px;
  border-radius: 20px;
  margin-top: 16px;
}
.sa-feedback.correct { background: rgba(34,197,94,0.15); color: #4ade80; }
.sa-feedback.wrong   { background: rgba(239,68,68,0.15); color: #f87171; }

.sa-done { color: #94a3b8; font-size: 1rem; }
</style>
