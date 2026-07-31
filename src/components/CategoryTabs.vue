<template>
  <div class="category-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-btn"
      :class="{ active: tab.key === modelValue }"
      @click="$emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
      <span class="tab-en">{{ tab.en }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
})

defineEmits(['update:modelValue'])

const tabs = [
  { key: 'working-memory',    label: '工作记忆',   en: 'Working Memory' },
  { key: 'inhibitory-control', label: '抑制控制',   en: 'Inhibitory Control' },
  { key: 'cognitive-flex',    label: '认知灵活性', en: 'Cognitive Flexibility' },
  { key: 'attention',         label: '注意力',     en: 'Attention' },
  { key: 'planning',          label: '计划与决策', en: 'Planning & Decision-Making' },
]
</script>

<style scoped>
.category-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e2e8f0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-btn {
  flex-shrink: 0;
  padding: 14px 20px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color 0.2s, background 0.2s;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.tab-btn:hover {
  color: #334155;
  background: #f8fafc;
}

.tab-btn.active {
  color: #0f3460;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: #0f3460;
  border-radius: 3px 3px 0 0;
}

.tab-en {
  font-size: 0.7rem;
  opacity: 0.5;
  font-weight: 400;
}

.tab-btn.active .tab-en {
  opacity: 0.7;
}

@media (max-width: 600px) {
  .tab-btn {
    padding: 12px 14px;
    font-size: 0.85rem;
  }
  .tab-en {
    font-size: 0.65rem;
  }
}
</style>
