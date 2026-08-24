<template>
  <div class="ach-page">
    <header class="page-header">
      <button class="back-btn" @click="$router.push({ name: 'home' })">← 返回</button>
      <h1>成就墙</h1>
      <span class="progress">{{ unlockedCount }} / {{ totalCount }}</span>
    </header>

    <main class="page-main">
      <!-- 全局成就 -->
      <section class="panel">
        <h2>训练成就</h2>
        <div class="ach-grid">
          <div
            v-for="a in globalDefs"
            :key="a.id"
            class="ach-card"
            :class="{ locked: !unlockedSet.has(a.id) }"
          >
            <span class="ach-icon">{{ unlockedSet.has(a.id) ? a.icon : '🔒' }}</span>
            <strong>{{ a.name }}</strong>
            <span class="ach-desc">{{ a.desc }}</span>
          </div>
        </div>
      </section>

      <!-- 各游戏成就 -->
      <section v-for="g in gameDefs" :key="g.id" class="panel">
        <h2>{{ g.meta.name }} <span class="game-icon-sm">{{ g.meta.icon }}</span></h2>
        <div class="ach-grid">
          <div
            v-for="a in g.defs"
            :key="a.id"
            class="ach-card"
            :class="{ locked: !unlockedSet.has(a.id) }"
          >
            <span class="ach-icon">{{ unlockedSet.has(a.id) ? a.icon : '🔒' }}</span>
            <strong>{{ a.name }}</strong>
            <span class="ach-desc">{{ a.desc }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { GLOBAL_ACHIEVEMENTS, buildGameAchievements, getUnlocked } from '../utils/achievements.js'

const GAME_META = {
  'digit-span': { name: '数字回溯', icon: '🧠' },
  'digit-memory': { name: '数字记忆测试', icon: '🔢' },
  'spatial-memory': { name: '空间记忆', icon: '📋' },
  'n-back': { name: 'N-Back', icon: '🐾' },
  'memory-match': { name: '卡片配对', icon: '🃏' },
  'timed-match': { name: '限时翻牌配对', icon: '⏳' },
  'serial-addition': { name: '连续加法', icon: '🧮' },
  'stroop': { name: 'Stroop 测验', icon: '🛑' },
  'go-no-go': { name: 'Go/No-Go', icon: '🚦' },
  'stop-signal': { name: '停止信号', icon: '🚫' },
  'flanker': { name: 'Flanker 任务', icon: '🏹' },
  'brain-shift': { name: 'Brain Shift', icon: '⚡' },
  'dccs': { name: 'DCCS 卡片分类', icon: '🎨' },
  'trail-making': { name: '交替连线', icon: '🔗' },
  'task-switch': { name: '任务切换', icon: '🔀' },
  'schulte-grid': { name: '舒尔特表', icon: '🎯' },
  'visual-search': { name: '视觉搜索', icon: '🔍' },
  'tower-of-hanoi': { name: '汉诺塔', icon: '🗼' },
  'risk-decision': { name: '风险决策', icon: '⚖️' },
}

const unlockedSet = ref(new Set())

onMounted(() => {
  unlockedSet.value = new Set(getUnlocked())
})

const globalDefs = GLOBAL_ACHIEVEMENTS

const gameDefs = computed(() =>
  Object.entries(GAME_META).map(([id, meta]) => ({
    id,
    meta,
    defs: buildGameAchievements({ id, ...meta }),
  }))
)

const totalCount = computed(() => globalDefs.length + gameDefs.value.reduce((n, g) => n + g.defs.length, 0))
const unlockedCount = computed(() => unlockedSet.value.size)
</script>

<style scoped>
.ach-page {
  min-height: 100vh;
  background: var(--color-bg-grad);
  background-attachment: fixed;
  color: var(--color-text);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(15,23,42,0.7);
  backdrop-filter: blur(16px);
  position: sticky;
  top: 0;
  z-index: 20;
}
.page-header h1 {
  font-size: 1.1rem;
  font-weight: 700;
  flex: 1;
}
.progress {
  font-size: 0.82rem;
  color: var(--color-cyan);
  font-weight: 600;
}

.back-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: #cbd5e1;
  border-radius: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}
.back-btn:hover {
  background: rgba(255,255,255,0.12);
  transform: translateX(-2px);
}

.page-main {
  max-width: 860px;
  margin: 0 auto;
  padding: 28px 24px 48px;
}

.panel {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}
.panel h2 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.game-icon-sm { font-size: 0.95rem; }

.ach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.ach-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  text-align: center;
  transition: all 0.2s;
}
.ach-card:not(.locked):hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: rgba(255,255,255,0.2);
}
.ach-card.locked {
  opacity: 0.45;
  filter: grayscale(0.6);
}

.ach-icon {
  font-size: 1.8rem;
}
.ach-card strong {
  font-size: 0.82rem;
  font-weight: 600;
}
.ach-desc {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

@media (max-width: 600px) {
  .page-main {
    padding: 20px 12px 32px;
  }
}
</style>
