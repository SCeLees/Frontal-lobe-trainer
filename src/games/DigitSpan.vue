<template>
  <div class="ds-game">
    <!-- 预览：展示游戏界面 -->
    <div v-if="preview && state === 'idle'" class="ds-center">
      <div class="ds-speaker">🔊</div>
      <p class="ds-label">数字回溯</p>
      <div class="ds-input-area">
        <input class="ds-input" type="text" placeholder="倒序输入数字" disabled />
        <button class="ds-submit" disabled>确认</button>
      </div>
      <p class="ds-hint">TTS 语音朗读后倒序输入</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="ds-center">
      <div class="ds-icon-display">🧠</div>
      <p class="ds-label">数字回溯</p>
    </div>

    <!-- 播放阶段 -->
    <div v-else-if="state === 'playing'" class="ds-center">
      <div class="ds-round">第 {{ round }} / {{ totalRounds }} 轮</div>
      <div class="ds-speaker" :class="{ speaking: isSpeaking }">
        🔊
      </div>
      <p class="ds-instruction">{{ isSpeaking ? '仔细听...' : '请倒序输入你听到的数字' }}</p>

      <!-- 输入区 -->
      <div class="ds-input-area" v-if="!isSpeaking && !feedback">
        <input
          ref="inputEl"
          v-model="userInput"
          class="ds-input"
          type="text"
          inputmode="numeric"
          placeholder="倒序输入数字"
          maxlength="20"
          @keydown.enter="submitAnswer"
        />
        <button class="ds-submit" @click="submitAnswer" :disabled="!userInput.trim()">
          确认
        </button>
      </div>

      <!-- 反馈 -->
      <div v-if="feedback" class="ds-feedback" :class="feedback.correct ? 'correct' : 'wrong'">
        <div class="ds-fb-icon">{{ feedback.correct ? '✅' : '❌' }}</div>
        <p>正确答案：{{ feedback.answer }}</p>
        <p>你的答案：{{ feedback.user }}</p>
      </div>
    </div>

    <!-- 完成状态 -->
    <div v-else-if="state === 'finished'" class="ds-center">
      <p class="ds-done">本轮训练完成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 4 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const state = ref('idle')       // idle | playing | finished
const round = ref(0)
const totalRounds = 5
const score = ref(0)
const sequence = ref([])         // current digit sequence
const isSpeaking = ref(false)
const userInput = ref('')
const feedback = ref(null)       // { correct, answer, user }
const inputEl = ref(null)

// Only auto-start when not in preview mode
watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

// Handle remount (e.g. "play again") where preview is already false
onMounted(() => {
  if (!props.preview) startGame()
})

// Start the game
function startGame() {
  score.value = 0
  round.value = 0
  state.value = 'playing'
  nextRound()
}

async function nextRound() {
  round.value++
  if (round.value > totalRounds) {
    state.value = 'finished'
    emit('done', { score: score.value, total: totalRounds })
    return
  }

  feedback.value = null
  userInput.value = ''

  // Generate sequence
  const seq = []
  for (let i = 0; i < props.difficulty; i++) {
    seq.push(Math.floor(Math.random() * 10))
  }
  sequence.value = seq

  // Read digits via TTS
  isSpeaking.value = true
  await speakDigits(seq)
  isSpeaking.value = false

  await nextTick()
  inputEl.value?.focus()
}

function speakDigits(digits) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      // Fallback: show digits briefly
      setTimeout(resolve, digits.length * 800 + 200)
      return
    }
    let idx = 0
    function speakNext() {
      if (idx >= digits.length) {
        setTimeout(resolve, 400)
        return
      }
      const u = new SpeechSynthesisUtterance(String(digits[idx]))
      u.lang = 'zh-CN'
      u.rate = 0.85
      u.pitch = 1.0
      u.onend = () => { idx++; speakNext() }
      u.onerror = () => { idx++; speakNext() }
      speechSynthesis.speak(u)
    }
    speakNext()
  })
}

function submitAnswer() {
  if (!userInput.value.trim()) return
  const expected = [...sequence.value].reverse().join('')
  const actual = userInput.value.trim()
  const correct = expected === actual

  feedback.value = { correct, answer: expected, user: actual }
  if (correct) { score.value++; sounds.correct() } else { sounds.wrong() }

  setTimeout(nextRound, 1800)
}
</script>

<style scoped>
.ds-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.ds-center {
  text-align: center;
  max-width: 360px;
  width: 100%;
}

.ds-icon-display { font-size: 3rem; margin-bottom: 12px; }
.ds-label { font-size: 1.2rem; font-weight: 600; color: #e2e8f0; }
.ds-hint { color: #64748b; font-size: 0.8rem; margin-top: 4px; }

.ds-round {
  color: #64748b;
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.ds-speaker {
  font-size: 3.5rem;
  margin-bottom: 12px;
  transition: transform 0.2s;
}
.ds-speaker.speaking {
  animation: pulse 0.6s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.7; }
}

.ds-instruction {
  color: #94a3b8;
  font-size: 0.95rem;
  margin: 0 0 20px;
}

.ds-input-area {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.ds-input {
  width: 180px;
  padding: 12px 16px;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
  font-size: 1.1rem;
  text-align: center;
  letter-spacing: 0.15em;
  outline: none;
  transition: border-color 0.2s;
}
.ds-input:focus {
  border-color: #3b82f6;
}

.ds-submit {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: #3b82f6;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.15s;
}
.ds-submit:hover { background: #2563eb; }
.ds-submit:disabled { opacity: 0.4; cursor: default; }

.ds-feedback {
  margin-top: 12px;
  padding: 16px;
  border-radius: 10px;
}
.ds-feedback.correct {
  background: rgba(34,197,94,0.12);
  border: 1px solid rgba(34,197,94,0.25);
}
.ds-feedback.wrong {
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.25);
}
.ds-fb-icon { font-size: 2rem; margin-bottom: 4px; }
.ds-feedback p {
  margin: 2px 0;
  font-size: 0.9rem;
  color: #cbd5e1;
}

.ds-done {
  color: #94a3b8;
  font-size: 1rem;
}
</style>
