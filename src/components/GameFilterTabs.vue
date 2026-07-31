<template>
  <div class="filter-tabs" role="tablist" aria-label="按认知领域筛选游戏">
    <button
      class="filter-tab"
      :class="{ active: modelValue === 'all' }"
      role="tab"
      :aria-selected="modelValue === 'all'"
      @click="$emit('update:modelValue', 'all')"
    >
      全部
    </button>
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="filter-tab"
      :class="{ active: modelValue === tab.key }"
      role="tab"
      :aria-selected="modelValue === tab.key"
      @click="$emit('update:modelValue', tab.key)"
    >
      <span class="tab-dot" :style="{ background: tab.color }"></span>
      {{ tab.label }}
      <span class="tab-count">{{ counts[tab.key] }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: 'all' },
  games: { type: Array, default: () => [] },
})

defineEmits(['update:modelValue'])

const tabs = [
  { key: 'working-memory',       label: '工作记忆',   color: '#3b82f6' },
  { key: 'inhibitory-control',   label: '抑制控制',   color: '#ef4444' },
  { key: 'cognitive-flex',       label: '认知灵活性', color: '#8b5cf6' },
  { key: 'attention',            label: '注意力',     color: '#22c55e' },
  { key: 'planning',             label: '计划与决策', color: '#f59e0b' },
]

const counts = computed(() => {
  const result = {}
  for (const t of tabs) {
    result[t.key] = props.games.filter(g => g.category === t.key).length
  }
  return result
})
</script>

<style scoped>
.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-secondary);
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.filter-tab:hover {
  background: rgba(255, 255, 255, 0.09);
  color: var(--color-text);
  transform: translateY(-1px);
}

.filter-tab.active {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.tab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tab-count {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 1px 7px;
  line-height: 1.4;
}

.filter-tab.active .tab-count {
  color: var(--color-text-secondary);
}
</style>
