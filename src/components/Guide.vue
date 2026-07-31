<template>
  <div v-if="visible" class="guide-overlay">
    <div class="guide-card">
      <div class="guide-badges" aria-hidden="true">
        <span>🧠</span><span>⚡</span><span>🧩</span>
      </div>
      <h2>{{ steps[step].title }}</h2>
      <p>{{ steps[step].desc }}</p>
      <div class="guide-dots">
        <span
          v-for="(_, i) in steps.length"
          :key="i"
          class="guide-dot"
          :class="{ active: i === step }"
        ></span>
      </div>
      <div class="guide-actions">
        <button v-if="step > 0" class="guide-btn ghost" @click="step--">上一步</button>
        <button v-if="step < steps.length - 1" class="guide-btn primary" @click="step++">下一步</button>
        <button v-else class="guide-btn primary" @click="finish">开始训练</button>
        <button class="guide-btn ghost" @click="finish">跳过</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const step = ref(0)

watch(() => props.visible, (v) => {
  if (v) step.value = 0
})

const steps = [
  { title: '欢迎来到前额叶训练', desc: '这里汇集了 15 个科学认知训练游戏，覆盖工作记忆、抑制控制、认知灵活性、注意力与计划决策五大领域。' },
  { title: '按领域筛选游戏', desc: '使用顶部的标签可以按认知领域筛选游戏，快速找到你想训练的方面；「全部」显示所有游戏。' },
  { title: '开始你的训练', desc: '点击任意游戏卡片，先阅读规则、选择难度，再点击任意处开始。完成后可查看「我的训练」档案和「成就墙」！' },
]

function finish() {
  emit('close')
}
</script>

<style scoped>
.guide-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 14, 23, 0.82);
  backdrop-filter: blur(8px);
}

.guide-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 20px;
  padding: 36px 32px;
  max-width: 380px;
  width: 90%;
  text-align: center;
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
  animation: guideIn 0.35s ease;
}
@keyframes guideIn {
  from { transform: translateY(14px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.guide-card::before {
  content: '';
  position: absolute;
  top: 0; left: 16px; right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
}

.guide-badges {
  display: flex;
  justify-content: center;
  gap: 10px;
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.guide-card h2 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 10px;
}
.guide-card p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: 20px;
}

.guide-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 20px;
}
.guide-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  transition: all 0.2s;
}
.guide-dot.active {
  background: var(--color-cyan);
  width: 22px;
  border-radius: 4px;
}

.guide-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}
.guide-btn {
  padding: 9px 22px;
  border-radius: 50px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: var(--color-text-secondary);
}
.guide-btn.ghost:hover {
  background: rgba(255,255,255,0.08);
  color: var(--color-text);
}
.guide-btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.guide-btn.primary:hover {
  background: var(--color-primary-hover);
}
</style>
