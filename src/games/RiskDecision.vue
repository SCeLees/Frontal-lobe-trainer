<template>
  <div class="rd-game">
    <!-- 预览 -->
    <div v-if="preview && state === 'idle'" class="rd-center">
      <div class="rd-preview-label">风险决策</div>
      <div class="rd-preview-choices">
        <div class="rd-choice-preview safe">
          <span class="rd-cp-label">稳妥</span>
          <span class="rd-cp-value">+10 金币</span>
        </div>
        <div class="rd-choice-preview risky">
          <span class="rd-cp-label">冒险</span>
          <span class="rd-cp-value">50% → +30 金币</span>
        </div>
      </div>
      <p class="rd-hint">权衡风险与收益，做出最优选择</p>
    </div>

    <!-- 空闲 -->
    <div v-else-if="state === 'idle'" class="rd-center">
      <div class="rd-icon-display">⚖️</div>
      <p class="rd-label">风险决策</p>
    </div>

    <!-- 游戏中 -->
    <div v-else-if="state === 'playing' || state === 'finished'" class="rd-center">
      <div v-if="state === 'playing'" class="rd-round">第 {{ round }} / {{ totalRounds }} 轮</div>
      <div class="rd-score">💰 {{ score }} 金币</div>

      <div v-if="state === 'playing'" class="rd-question">
        <p class="rd-q-title">选择你的策略：</p>
        <div class="rd-choices">
          <button class="rd-choice safe" :disabled="busy" @click="choose('safe')">
            <span class="rd-label-text">稳妥</span>
            <span class="rd-value">+{{ safeGain }} 金币</span>
            <span class="rd-note">100% 获得</span>
          </button>
          <button class="rd-choice risky" :disabled="busy" @click="choose('risky')">
            <span class="rd-label-text">冒险</span>
            <span class="rd-value">+{{ riskyGain }} 金币</span>
            <span class="rd-note">{{ riskPct }}% 概率</span>
          </button>
        </div>
        <div v-if="lastOutcome" class="rd-outcome" :class="lastOutcome.type">
          {{ lastOutcome.text }}
        </div>
      </div>

      <div v-else-if="state === 'finished'" class="rd-result">
        <div class="rd-result-icon">{{ resultIcon }}</div>
        <p class="rd-result-text">{{ resultText }}</p>
        <p class="rd-result-sub">总收益：{{ score }} 金币</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { sounds } from '../utils/sound.js'

const props = defineProps({
  difficulty: { type: Number, default: 15 },
  preview: { type: Boolean, default: false },
})

const emit = defineEmits(['done'])

const state = ref('idle')
const round = ref(0)
const totalRounds = computed(() => props.difficulty || 15)
const score = ref(0)
const safeGain = ref(10)
const riskyGain = ref(0)
const riskPct = ref(50)
const riskyFails = ref(0)
const busy = ref(false)
const lastOutcome = ref(null)

const resultIcon = computed(() => {
  const avg = score.value / totalRounds.value
  if (avg >= 15) return '🏆'
  if (avg >= 10) return '🎯'
  return '💪'
})
const resultText = computed(() => {
  const avg = score.value / totalRounds.value
  if (avg >= 15) return '出色的风险权衡！'
  if (avg >= 10) return '不错的决策！'
  return '稳健保守的风格'
})

watch(() => props.preview, (p) => {
  if (!p && state.value === 'idle') startGame()
})

// 键盘支持：1/← 稳妥，2/→ 冒险
function onKeydown(e) {
  if (state.value !== 'playing') return
  if (e.key === '1' || e.key === 'ArrowLeft') choose('safe')
  if (e.key === '2' || e.key === 'ArrowRight') choose('risky')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

onMounted(() => {
  if (!props.preview) startGame()
})

function startGame() {
  round.value = 0
  score.value = 0
  riskyFails.value = 0
  busy.value = false
  lastOutcome.value = null
  state.value = 'playing'
  nextRound()
}

function nextRound() {
  round.value++
  if (round.value > totalRounds.value) {
    state.value = 'finished'
    emit('done', { score: score.value, total: totalRounds.value, riskyFails: riskyFails.value, difficulty: props.difficulty })
    return
  }
  busy.value = false
  lastOutcome.value = null
  // Generate a risky option: 40-80% chance of 2-5x multiplier
  riskPct.value = 40 + Math.floor(Math.random() * 41)  // 40-80
  const mult = 2 + Math.floor(Math.random() * 4)       // 2-5
  riskyGain.value = safeGain.value * mult
}

function choose(type) {
  if (state.value !== 'playing' || busy.value) return
  busy.value = true
  sounds.flip()
  if (type === 'safe') {
    score.value += safeGain.value
    lastOutcome.value = { type: 'safe', text: `稳妥获得 +${safeGain.value} 金币` }
  } else {
    if (Math.random() * 100 < riskPct.value) {
      score.value += riskyGain.value
      sounds.correct()
      lastOutcome.value = { type: 'success', text: `冒险成功！获得 +${riskyGain.value} 金币` }
    } else {
      riskyFails.value++
      sounds.wrong()
      lastOutcome.value = { type: 'fail', text: `冒险失败，本轮 +0 金币` }
    }
  }
  setTimeout(nextRound, 850)
}
</script>

<style scoped>
.rd-game {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.rd-center {
  text-align: center;
  max-width: 420px;
  width: 100%;
}

.rd-icon-display { font-size: 3rem; margin-bottom: 12px; }
.rd-label { font-size: 1.2rem; font-weight: 600; color: #f1f5f9; }

.rd-preview-label { color: #f59e0b; font-size: 0.9rem; font-weight: 600; margin-bottom: 12px; }
.rd-preview-choices { display: flex; gap: 12px; justify-content: center; margin-bottom: 12px; }
.rd-choice-preview {
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.12);
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.8rem;
}
.rd-choice-preview.safe { background: rgba(52,211,153,0.1); color: #34d399; }
.rd-choice-preview.risky { background: rgba(251,191,36,0.1); color: #fbbf24; }
.rd-cp-value { font-weight: 600; font-size: 0.9rem; }

.rd-hint { color: #94a3b8; font-size: 0.85rem; }

.rd-round { color: #94a3b8; font-size: 0.85rem; margin-bottom: 4px; }
.rd-score { color: #fbbf24; font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; }

.rd-q-title { color: #94a3b8; font-size: 0.9rem; margin-bottom: 14px; }

.rd-choices {
  display: flex;
  gap: 14px;
  justify-content: center;
}

.rd-choice {
  flex: 1;
  max-width: 170px;
  padding: 18px 14px;
  border-radius: 14px;
  border: 1.5px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: #f1f5f9;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all var(--transition-fast);
}
.rd-choice:hover {
  transform: translateY(-3px);
}
.rd-choice.safe:hover {
  border-color: #34d399;
  background: rgba(52,211,153,0.1);
}
.rd-choice.risky:hover {
  border-color: #fbbf24;
  background: rgba(251,191,36,0.1);
}

.rd-label-text { font-size: 1rem; font-weight: 700; }
.rd-value { font-size: 0.95rem; font-weight: 600; }
.rd-choice.safe .rd-value { color: #34d399; }
.rd-choice.risky .rd-value { color: #fbbf24; }
.rd-note { font-size: 0.72rem; color: #94a3b8; }

.rd-choice:disabled {
  opacity: 0.55;
  cursor: default;
  transform: none;
}

.rd-outcome {
  margin-top: 14px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  display: inline-block;
}
.rd-outcome.safe    { background: rgba(52,211,153,0.14); color: #34d399; }
.rd-outcome.success { background: rgba(251,191,36,0.14); color: #fbbf24; }
.rd-outcome.fail    { background: rgba(248,113,113,0.14); color: #f87171; }

.rd-result { margin-top: 8px; }
.rd-result-icon { font-size: 2.5rem; }
.rd-result-text { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; }
.rd-result-sub { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
</style>
