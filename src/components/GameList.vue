<template>
  <div class="game-list-wrapper">
    <div class="game-list-toolbar">
      <span class="game-count">{{ games.length }} 个训练游戏</span>
      <div class="view-toggle">
        <button
          class="view-btn"
          :class="{ active: viewMode === 'grid' }"
          title="网格视图"
          @click="$emit('update:viewMode', 'grid')"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <rect x="0" y="0" width="7" height="7" rx="1" />
            <rect x="10" y="0" width="8" height="7" rx="1" />
            <rect x="0" y="10" width="7" height="8" rx="1" />
            <rect x="10" y="10" width="8" height="8" rx="1" />
          </svg>
        </button>
        <button
          class="view-btn"
          :class="{ active: viewMode === 'list' }"
          title="列表视图"
          @click="$emit('update:viewMode', 'list')"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <rect x="0" y="1" width="18" height="3" rx="1" />
            <rect x="0" y="7" width="18" height="3" rx="1" />
            <rect x="0" y="13" width="18" height="4" rx="1" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 网格视图 -->
    <div v-if="viewMode === 'grid'" class="game-grid">
      <div v-for="(game, i) in games" :key="game.id" class="game-card" @click="onGameClick(game)" :style="{ animationDelay: i * 0.06 + 's', borderColor: game.color + '20' }">
        <div class="game-icon-circle" :style="{ background: game.color + '14', color: game.color }">
          <span class="game-icon">{{ game.icon }}</span>
        </div>
        <div class="game-info">
          <h3 class="game-name">{{ game.name }}</h3>
          <p class="game-desc">{{ game.description }}</p>
        </div>
        <div class="game-hover-hint" :style="{ color: game.color }">开始训练 →</div>
        <div class="game-color-bar" :style="{ background: game.color }"></div>
      </div>
      <div v-if="games.length === 0" class="empty-hint">
        该分类下暂无训练游戏，敬请期待
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else class="game-list">
      <div v-for="(game, i) in games" :key="game.id" class="game-row" @click="onGameClick(game)" :style="{ animationDelay: i * 0.04 + 's', borderLeftColor: game.color }">
        <div class="game-icon-circle small" :style="{ background: game.color + '14', color: game.color }">
          <span class="game-icon">{{ game.icon }}</span>
        </div>
        <div class="game-info">
          <h3 class="game-name">{{ game.name }}</h3>
          <p class="game-desc">{{ game.description }}</p>
        </div>
        <span class="game-arrow">›</span>
      </div>
      <div v-if="games.length === 0" class="empty-hint">
        该分类下暂无训练游戏，敬请期待
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  games: { type: Array, default: () => [] },
  viewMode: { type: String, default: 'grid' },
})

const emit = defineEmits(['update:viewMode', 'game-click'])

function onGameClick(game) {
  emit('game-click', game)
}
</script>

<style scoped>
.game-list-wrapper {
  padding: 24px 0;
}

.game-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.game-count {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.view-toggle {
  display: flex;
  gap: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 4px;
  border: 1px solid rgba(255,255,255,0.08);
}

.view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-btn.active {
  background: rgba(255,255,255,0.12);
  color: var(--color-cyan);
  box-shadow: var(--shadow-sm);
}

.view-btn:hover:not(.active) {
  color: var(--color-text-secondary);
  background: rgba(255,255,255,0.08);
}

/* 网格视图 */
.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
}

.game-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: 18px;
  padding: 32px 22px 28px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  border: var(--glass-border);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  animation: cardIn 0.5s ease both;
}

.game-card::before {
  content: '';
  position: absolute;
  top: 0; left: 12px; right: 12px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.game-color-bar {
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 3px;
  border-radius: 3px 3px 0 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.game-hover-hint {
  position: absolute;
  bottom: 14px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  opacity: 0;
  transform: translateY(8px);
  transition: all 0.25s ease;
}

.game-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-md);
  border-color: rgba(255,255,255,0.2);
}

.game-card:hover .game-hover-hint {
  opacity: 1;
  transform: translateY(0);
}

.game-card:hover .game-color-bar {
  opacity: 1;
}

.game-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.game-card:hover .game-icon-circle {
  transform: scale(1.12) rotate(-5deg);
  box-shadow: 0 0 0 8px rgba(59,130,246,0.06);
}

.game-icon-circle.small {
  width: 48px;
  height: 48px;
  margin: 0;
  flex-shrink: 0;
}

.game-icon {
  font-size: 1.8rem;
  line-height: 1;
}
.game-icon-circle.small .game-icon {
  font-size: 1.4rem;
}

.game-name {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.game-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* 列表视图 */
.game-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.game-row {
  display: flex;
  align-items: center;
  gap: 18px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-radius: 14px;
  padding: 18px 22px;
  box-shadow: var(--shadow-sm);
  border: var(--glass-border);
  border-left: 3px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  cursor: pointer;
  animation: cardIn 0.4s ease both;
}

.game-row:hover {
  transform: translateX(6px);
  box-shadow: var(--shadow-md);
  background: rgba(255,255,255,0.1);
}

.game-row .game-icon {
  font-size: 2rem;
  margin-bottom: 0;
  flex-shrink: 0;
}

.game-row .game-info {
  flex: 1;
}

.game-row .game-name {
  margin-bottom: 4px;
}

.game-arrow {
  font-size: 1.4rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.empty-hint {
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
  font-size: 0.95rem;
  grid-column: 1 / -1;
}

@media (max-width: 600px) {
  .game-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
  .game-card {
    padding: 18px 14px;
  }
}
</style>
