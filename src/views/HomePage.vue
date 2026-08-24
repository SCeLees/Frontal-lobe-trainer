<template>
  <div class="app">
    <!-- Ambient light blobs -->
    <div class="ambient" aria-hidden="true">
      <span class="ambient-blob ab-1"></span>
      <span class="ambient-blob ab-2"></span>
      <span class="ambient-blob ab-3"></span>
    </div>

    <HeroSection
      title="前额叶训练"
      subtitle="科学化认知训练，全面提升大脑执行功能"
    />

    <main class="app-main">
      <section class="app-intro">
        <h2>什么是前额叶训练？</h2>
        <p>前额叶皮层是大脑的「指挥中心」，通过科学的认知训练可以增强神经可塑性，提升专注力与思维敏捷度。</p>
        <div class="intro-cards">
          <div class="intro-card" style="--c: #3b82f6">
            <span class="intro-icon">🧠</span>
            <strong>工作记忆</strong>
            <span>短暂保持和加工信息</span>
          </div>
          <div class="intro-card" style="--c: #ef4444">
            <span class="intro-icon">🛑</span>
            <strong>抑制控制</strong>
            <span>克制冲动与干扰</span>
          </div>
          <div class="intro-card" style="--c: #8b5cf6">
            <span class="intro-icon">🔄</span>
            <strong>认知灵活性</strong>
            <span>在规则间灵活切换</span>
          </div>
          <div class="intro-card" style="--c: #22c55e">
            <span class="intro-icon">👁️</span>
            <strong>注意力</strong>
            <span>持续聚焦与快速搜索</span>
          </div>
          <div class="intro-card" style="--c: #f59e0b">
            <span class="intro-icon">🗺️</span>
            <strong>计划与决策</strong>
            <span>策略规划与问题解决</span>
          </div>
        </div>
      </section>

      <GameFilterTabs v-model="activeTag" :games="allGames" />
      <nav class="app-nav">
        <router-link class="nav-btn" to="/profile">📊 我的训练</router-link>
        <router-link class="nav-btn" to="/achievements">🏅 成就墙</router-link>
      </nav>
      <GameList
        :games="filteredGames"
        :view-mode="viewMode"
        @update:view-mode="viewMode = $event"
        @game-click="goGame"
      />
    </main>

    <footer class="app-footer">
      <div class="footer-content">
        <span class="footer-brand">🧠 前额叶训练</span>
        <div class="footer-tech">
          <a class="footer-link" href="https://vite.dev/" target="_blank" rel="noopener noreferrer">基于 Vite 构建</a>
          <span class="footer-sep">·</span>
          <a class="footer-link" href="https://deepseek.com/" target="_blank" rel="noopener noreferrer">由 DeepSeek 赋能</a>
          <span class="footer-sep">·</span>
          <a class="footer-link" href="https://vercel.com/" target="_blank" rel="noopener noreferrer">部署于 Vercel 边缘网络</a>
          <span class="footer-sep">·</span>
          <span class="footer-copy">© 2026 GTSense</span>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="footer-links">
          <a class="footer-link" href="https://github.com/SCeLees/Frontal-lobe-trainer" target="_blank" rel="noopener noreferrer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
          <span class="footer-sep">·</span>
          <a class="footer-link" href="https://gts.us.kg/" target="_blank" rel="noopener noreferrer">个人站点</a>
        </div>
      </div>
    </footer>

    <Guide :visible="showGuide" @close="closeGuide" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import HeroSection from '../components/HeroSection.vue'
import GameFilterTabs from '../components/GameFilterTabs.vue'
import GameList from '../components/GameList.vue'
import Guide from '../components/Guide.vue'

const router = useRouter()
const viewMode = ref('grid')
const activeTag = ref('all')
const showGuide = ref(false)

const allGames = [
  { id: 'digit-span',          category: 'working-memory',  icon: '🧠', name: '数字回溯',         description: 'TTS朗读数字序列，倒序复述挑战',              color: '#3b82f6' },
  { id: 'digit-memory',        category: 'working-memory',  icon: '🔢', name: '数字记忆测试',     description: '短暂显示数字后消失，凭记忆输入，逐位递增',    color: '#3b82f6' },
  { id: 'spatial-memory',      category: 'working-memory',  icon: '📋', name: '空间记忆',         description: '逐关递增格子数，答错扣命，挑战记忆极限',      color: '#3b82f6' },
  { id: 'n-back',              category: 'working-memory',  icon: '🐾', name: 'N-Back',           description: '判断当前动物是否与倒数第N个相同',              color: '#3b82f6' },
  { id: 'memory-match',        category: 'working-memory',  icon: '🃏', name: '卡片配对',         description: '翻牌配对，记住位置，用最少步数消除',           color: '#3b82f6' },
  { id: 'timed-match',         category: 'working-memory',  icon: '⏳', name: '限时翻牌配对',     description: '限时翻牌配对，超时即失败',                     color: '#3b82f6' },
  { id: 'serial-addition',     category: 'working-memory',  icon: '🧮', name: '连续加法',         description: '记住上一个数字，计算连续两数之和',            color: '#3b82f6' },
  { id: 'stroop',              category: 'inhibitory-control', icon: '🛑', name: 'Stroop 测验',   description: '忽略字义，根据字体颜色选择对应按钮',           color: '#ef4444' },
  { id: 'go-no-go',            category: 'inhibitory-control', icon: '🚦', name: 'Go/No-Go',      description: '看到P快速响应，看到R抑制冲动',                 color: '#ef4444' },
  { id: 'stop-signal',         category: 'inhibitory-control', icon: '🚫', name: '停止信号',      description: 'Go后突现停止信号，动作启动也要叫停',            color: '#ef4444' },
  { id: 'flanker',             category: 'inhibitory-control', icon: '🏹', name: 'Flanker 任务',   description: '只看中间箭头方向，忽略两侧干扰',                color: '#ef4444' },
  { id: 'brain-shift',         category: 'cognitive-flex',  icon: '⚡', name: 'Brain Shift Overdrive', description: '四张固定规则卡片，灵活切换判断',          color: '#8b5cf6' },
  { id: 'dccs',                category: 'cognitive-flex',  icon: '🎨', name: 'DCCS 卡片分类',     description: '颜色形状随机组合，颜色与形状规则中段切换',     color: '#8b5cf6' },
  { id: 'trail-making',        category: 'cognitive-flex',  icon: '🔗', name: '交替连线',         description: '按1-A-2-B顺序交替点击，训练任务切换',            color: '#8b5cf6' },
  { id: 'task-switch',         category: 'cognitive-flex',  icon: '🔀', name: '任务切换',         description: '奇偶/大小规则随机切换，快速判断',                color: '#8b5cf6' },
  { id: 'schulte-grid',        category: 'attention',       icon: '🎯', name: '舒尔特表',         description: '4×4到7×7方格随机排列，限时内依次点击',        color: '#22c55e' },
  { id: 'visual-search',       category: 'attention',       icon: '🔍', name: '视觉搜索',         description: '大量相似图形中找出唯一异类',                   color: '#22c55e' },
  { id: 'tower-of-hanoi',      category: 'planning',        icon: '🗼', name: '汉诺塔',           description: '规划移动序列，将全部圆盘移至目标柱',            color: '#f59e0b' },
  { id: 'risk-decision',       category: 'planning',        icon: '⚖️', name: '风险决策',         description: '权衡风险与收益，做出最优选择',                color: '#f59e0b' },
]

const filteredGames = computed(() => {
  if (activeTag.value === 'all') return allGames
  return allGames.filter(g => g.category === activeTag.value)
})

function goGame(game) {
  router.push({ name: 'game', params: { id: game.id } })
}

// 首次访问显示新手引导
onMounted(() => {
  try {
    if (!localStorage.getItem('pt_guided')) showGuide.value = true
  } catch {}
})

function closeGuide() {
  showGuide.value = false
  try {
    localStorage.setItem('pt_guided', '1')
  } catch {}
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

/* Ambient light blobs */
.ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.ambient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.5;
}
.ambient-blob.ab-1 {
  width: 420px; height: 420px;
  background: rgba(59, 130, 246, 0.16);
  top: -100px; left: -80px;
  animation: drift1 18s ease-in-out infinite;
}
.ambient-blob.ab-2 {
  width: 380px; height: 380px;
  background: rgba(139, 92, 246, 0.13);
  bottom: -120px; right: -60px;
  animation: drift2 22s ease-in-out infinite;
}
.ambient-blob.ab-3 {
  width: 280px; height: 280px;
  background: rgba(34, 211, 238, 0.1);
  top: 45%; left: 55%;
  animation: drift3 26s ease-in-out infinite;
}
@keyframes drift1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(60px, 40px); }
}
@keyframes drift2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-50px, -60px); }
}
@keyframes drift3 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-40px, 50px); }
}

.app-main {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px 40px;
  position: relative;
  z-index: 1;
}

.app-intro {
  text-align: center;
  padding: 36px 24px 28px;
  margin-bottom: 24px;
}

.app-intro h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 8px;
}

.app-intro > p {
  font-size: 0.92rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin: 0 auto 24px;
  max-width: 540px;
}

/* 顶部导航条 */
.app-nav {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 24px;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  color: var(--color-text-secondary);
  border-radius: 50px;
  font-size: 0.88rem;
  font-weight: 500;
  transition: all var(--transition-fast);
}
.nav-btn:hover {
  color: var(--color-text);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.intro-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  max-width: 820px;
  margin: 0 auto;
}

.intro-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-top: 3px solid var(--c);
  border-radius: 14px;
  padding: 20px 12px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  overflow: hidden;
}

.intro-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
}

.intro-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.intro-icon {
  font-size: 1.6rem;
}

.intro-card strong {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 600;
}

.intro-card span:last-child {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  line-height: 1.3;
}

@media (max-width: 700px) {
  .intro-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 440px) {
  .intro-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Footer */
.app-footer {
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 24px 24px 16px;
  margin-top: 16px;
}

.footer-content {
  max-width: 1000px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-brand {
  font-size: 0.9rem;
  font-weight: 700;
  background: linear-gradient(135deg, #60a5fa, #22d3ee);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-tech {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}

.footer-sep {
  color: var(--color-border);
  font-size: 0.82rem;
}

.footer-link {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: color 0.15s;
}
.footer-link:hover {
  color: var(--color-text);
}

.footer-bottom {
  max-width: 1000px;
  margin: 10px auto 0;
  text-align: center;
}

.footer-copy {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

@media (max-width: 600px) {
  .app-main {
    padding: 0 12px 32px;
  }
  .app-intro {
    padding: 24px 16px 20px;
  }
  .footer-content {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  .footer-tech {
    justify-content: center;
  }
  .footer-links {
    gap: 8px;
  }
}
</style>
