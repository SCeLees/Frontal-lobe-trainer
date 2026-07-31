<template>
  <header class="hero-section" :style="heroStyle">
    <div class="hero-blobs">
      <span class="hero-blob b1"></span>
      <span class="hero-blob b2"></span>
      <span class="hero-blob b3"></span>
    </div>
    <div class="hero-overlay" v-if="overlay"></div>
    <div class="hero-content">
      <h1 class="hero-title">{{ title }}</h1>
      <div class="hero-subrow">
        <p class="hero-subtitle">{{ subtitle }}</p>
        <a
          class="hero-github"
          href="https://github.com/SCeLees/Frontal-lobe-trainer"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </a>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '前额叶训练' },
  subtitle: { type: String, default: '科学化认知训练，提升大脑执行功能' },
  background: { type: String, default: '' },
  overlay: { type: Boolean, default: false },
})

const heroStyle = computed(() => {
  if (props.background) {
    const isImage = /^(https?:|\/)/.test(props.background)
    if (isImage) {
      return {
        backgroundImage: `url(${props.background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }
    return { background: props.background }
  }
  return {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #172554 70%, #0f172a 100%)',
  }
})
</script>

<style scoped>
.hero-section {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 340px;
  padding: 72px 24px 64px;
  color: #fff;
  text-align: center;
  overflow: hidden;
}

/* Light blobs */
.hero-blobs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
}
.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
}
.hero-blob.b1 {
  width: 320px; height: 320px;
  background: rgba(59, 130, 246, 0.18);
  top: -60px; left: -40px;
  animation: float1 8s ease-in-out infinite;
}
.hero-blob.b2 {
  width: 240px; height: 240px;
  background: rgba(139, 92, 246, 0.14);
  bottom: -40px; right: -20px;
  animation: float2 10s ease-in-out infinite;
}
.hero-blob.b3 {
  width: 200px; height: 200px;
  background: rgba(34, 197, 94, 0.1);
  top: 50%; right: 30%;
  animation: float3 7s ease-in-out infinite;
}
@keyframes float1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(40px, 30px); }
}
@keyframes float2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-30px, -25px); }
}
@keyframes float3 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 680px;
}

.hero-title {
  margin: 0 0 16px;
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 8px rgba(59, 130, 246, 0.3));
}

.hero-subtitle {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
  padding: 8px 24px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.hero-subrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-github {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 22px;
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  background: transparent;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all var(--transition-fast);
}
.hero-github:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

@media (max-width: 600px) {
  .hero-section {
    min-height: 260px;
    padding: 48px 16px 40px;
  }
  .hero-title {
    font-size: 1.9rem;
  }
  .hero-subtitle {
    font-size: 0.88rem;
    padding: 6px 18px;
  }
}
</style>
