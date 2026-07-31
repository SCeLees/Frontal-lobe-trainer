// Web Audio 合成音效（无音频文件依赖）
let ctx = null
let enabled = true

const SOUND_KEY = 'pt_sound'

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) ctx = new AC()
  }
  if (ctx && ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function isSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(v) {
  enabled = v
  try {
    localStorage.setItem(SOUND_KEY, v ? 'on' : 'off')
  } catch {}
}

export function initSound() {
  enabled = isSoundEnabled()
}

function tone(freq, start, dur, type = 'sine', gain = 0.08) {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + dur + 0.05)
}

export const sounds = {
  correct() {
    if (!enabled) return
    tone(523.25, 0, 0.12, 'sine')
    tone(783.99, 0.08, 0.18, 'sine')
  },
  wrong() {
    if (!enabled) return
    tone(220, 0, 0.2, 'sawtooth', 0.05)
    tone(174.61, 0.1, 0.22, 'sawtooth', 0.05)
  },
  flip() {
    if (!enabled) return
    tone(880, 0, 0.06, 'triangle', 0.04)
  },
  match() {
    if (!enabled) return
    tone(659.25, 0, 0.1, 'triangle')
    tone(987.77, 0.07, 0.14, 'triangle')
  },
  win() {
    if (!enabled) return
    tone(523.25, 0, 0.12)
    tone(659.25, 0.12, 0.12)
    tone(783.99, 0.24, 0.12)
    tone(1046.5, 0.36, 0.3)
  },
  achievement() {
    if (!enabled) return
    tone(659.25, 0, 0.1, 'triangle')
    tone(880, 0.1, 0.1, 'triangle')
    tone(1318.5, 0.2, 0.25, 'triangle')
  },
}
