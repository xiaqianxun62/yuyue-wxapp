<template>
  <view class="page">
    <!-- 主布局：横屏→左右排列 | 竖屏→上下排列 -->
    <view class="main" :class="{ 'landscape': isLandscape, 'portrait': !isLandscape }">

      <!-- ===== 左：倒计时控制 ===== -->
      <view class="timer-panel">
        <view class="timer-display">
          <text class="timer-num">{{ displayMin }}</text>
          <text class="timer-colon">:</text>
          <text class="timer-num">{{ displaySec }}</text>
        </view>

        <!-- 预设时间 -->
        <view class="presets">
          <button
            v-for="p in presets"
            :key="p.label"
            class="preset-btn"
            :class="{ active: presetMin === p.min && presetSec === p.sec }"
            @click="setPreset(p.min, p.sec)"
          >{{ p.label }}</button>
        </view>

        <!-- 自定义时间 -->
        <view class="custom-row">
          <view class="time-input">
            <input class="num-input" type="number" :value="presetMin"
              @input="(e) => presetMin = clamp(Number(e.detail.value) || 0, 0, 99)" />
            <text class="unit">分</text>
          </view>
          <view class="time-input">
            <input class="num-input" type="number" :value="presetSec"
              @input="(e) => presetSec = clamp(Number(e.detail.value) || 0, 0, 59)" />
            <text class="unit">秒</text>
          </view>
        </view>

        <!-- 控制按钮 -->
        <view class="controls">
          <button v-if="!running" class="ctrl-btn primary" :disabled="totalSeconds <= 0"
            @click="start">开始</button>
          <button v-else class="ctrl-btn pause" @click="pause">暂停</button>
          <button class="ctrl-btn" @click="reset">重置</button>
        </view>

        <!-- 切换频率 -->
        <view class="speed-row">
          <text class="speed-label">频率</text>
          <button v-for="s in speeds" :key="s.label" class="speed-btn"
            :class="{ active: interval === s.ms }"
            @click="interval = s.ms">{{ s.label.replace('慢 ','').replace('中 ','').replace('快 ','') }}</button>
        </view>
      </view>

      <!-- ===== 右：场地 + 状态 ===== -->
      <view class="right-col">
        <view class="court">
          <svg class="court-svg" viewBox="0 440 360 380" preserveAspectRatio="xMidYMid meet">
            <rect x="20" y="40" width="320" height="720" fill="#208050"/>
            <rect x="20" y="40" width="320" height="720" fill="none" stroke="#fff" stroke-width="3"/>
            <line x1="20" y1="733.28" x2="340" y2="733.28" stroke="#fff" stroke-width="3"/>
            <line x1="20" y1="440" x2="340" y2="440" stroke="#eee" stroke-width="6"/>
            <line x1="20" y1="546.27" x2="340" y2="546.27" stroke="#fff" stroke-width="3"/>
            <line x1="60.89" y1="40" x2="60.89" y2="760" stroke="#fff" stroke-width="3"/>
            <line x1="299.11" y1="40" x2="299.11" y2="760" stroke="#fff" stroke-width="3"/>
            <line x1="180" y1="546.27" x2="180" y2="733.28" stroke="#fff" stroke-width="3"/>
            <circle cx="20" cy="440" r="5" fill="#333"/>
            <circle cx="340" cy="440" r="5" fill="#333"/>
          </svg>

          <!-- 训练标记点 -->
          <view v-if="running || elapsed > 0" class="marker" :style="markerStyle">
            <view class="marker-ring"></view>
            <view class="marker-dot"></view>
          </view>
        </view>

        <!-- 状态提示 -->
        <view v-if="running" class="tip">
          剩余 {{ displayMin }}:{{ displaySec }}
        </view>
        <view v-else-if="finished" class="tip done">
          训练完成
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

/** 是否横屏（宽 > 高） */
const isLandscape = ref(false)

function checkOrientation() {
  try {
    const info = uni.getSystemInfoSync()
    isLandscape.value = (info.windowWidth || 0) > (info.windowHeight || 0)
  } catch (e) {
    // 兜底：用 window.inner
    isLandscape.value = typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  }
}

let resizeHandler = null

onMounted(() => {
  checkOrientation()
  // #ifdef H5
  resizeHandler = () => checkOrientation()
  window.addEventListener('resize', resizeHandler)
  window.addEventListener('orientationchange', resizeHandler)
  // #endif
  // #ifdef APP-PLUS || MP-WEIXIN
  resizeHandler = () => checkOrientation()
  uni.onWindowResize(resizeHandler)
  // #endif
})

onBeforeUnmount(() => {
  stopTimers()
  // #ifdef H5
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    window.removeEventListener('orientationchange', resizeHandler)
  }
  // #endif
  // #ifdef APP-PLUS || MP-WEIXIN
  if (resizeHandler) uni.offWindowResize(resizeHandler)
  // #endif
})

/**
 * 6 点步伐训练（只显示自己半场）
 * viewBox="0 420 360 380"：显示 y=420~800 的区域
 * 网带 y=440 → 显示区顶部 ≈5%
 * 发球区中线 y=546.27 → ≈33%
 * 单打边线 y=733.28 → ≈82%
 * 底线 y=760 → ≈89%
 */
const POINTS = [
  { x: 20, y: 12, label: '网前左' },
  { x: 80, y: 12, label: '网前右' },
  { x: 20, y: 35, label: '中场左' },
  { x: 80, y: 35, label: '中场右' },
  { x: 20, y: 75, label: '后场左' },
  { x: 80, y: 75, label: '后场右' },
]

/** 预设时间 */
const presets = [
  { label: '30秒', min: 0, sec: 30 },
  { label: '1分钟', min: 1, sec: 0 },
  { label: '3分钟', min: 3, sec: 0 },
  { label: '5分钟', min: 5, sec: 0 },
]

/** 切换频率 */
const speeds = [
  { label: '慢 2s', ms: 2000 },
  { label: '中 1s', ms: 1000 },
  { label: '快 0.5s', ms: 500 },
]

const presetMin = ref(1)
const presetSec = ref(0)
const remaining = ref(60)       // 剩余秒数
const elapsed = ref(0)          // 已用秒数
const running = ref(false)
const finished = ref(false)
const interval = ref(1000)      // 标记切换频率
const currentPoint = ref(0)     // 当前 point index

let timerId = null
let pointTimerId = null

const totalSeconds = computed(() => presetMin.value * 60 + presetSec.value)
const displayMin = computed(() => String(Math.floor(remaining.value / 60)).padStart(2, '0'))
const displaySec = computed(() => String(remaining.value % 60).padStart(2, '0'))

const markerStyle = computed(() => {
  const p = POINTS[currentPoint.value]
  return {
    left: p.x + '%',
    top: p.y + '%',
  }
})

function clamp(v, lo, hi) {
  if (v == null || v === '' || isNaN(v)) return lo
  return Math.max(lo, Math.min(hi, Math.floor(v)))
}

function setPreset(min, sec) {
  presetMin.value = min
  presetSec.value = sec
  if (!running.value) {
    remaining.value = min * 60 + sec
  }
}

function start() {
  if (totalSeconds.value <= 0) return
  finished.value = false
  if (remaining.value <= 0 || (elapsed.value > 0 && remaining.value <= 0)) {
    remaining.value = totalSeconds.value
    elapsed.value = 0
  }
  running.value = true
  // 先立即跳一次
  currentPoint.value = Math.floor(Math.random() * POINTS.length)
  startTimers()
}

function pause() {
  running.value = false
  stopTimers()
}

function reset() {
  running.value = false
  finished.value = false
  stopTimers()
  remaining.value = totalSeconds.value
  elapsed.value = 0
}

function startTimers() {
  stopTimers()
  // 倒计时
  timerId = setInterval(() => {
    if (remaining.value > 0) {
      remaining.value -= 1
      elapsed.value += 1
    } else {
      finished.value = true
      running.value = false
      stopTimers()
      uni.vibrateLong({})
    }
  }, 1000)
  // 标记点切换
  pointTimerId = setInterval(() => {
    // 随机选一个不同于当前的点
    let next = Math.floor(Math.random() * POINTS.length)
    while (next === currentPoint.value && POINTS.length > 1) {
      next = Math.floor(Math.random() * POINTS.length)
    }
    currentPoint.value = next
  }, interval.value)
}

function stopTimers() {
  if (timerId) { clearInterval(timerId); timerId = null }
  if (pointTimerId) { clearInterval(pointTimerId); pointTimerId = null }
}

/** 监听频率变化，运行中即时生效 */
watch(interval, () => {
  if (running.value) {
    // 重新启动 pointTimer
    if (pointTimerId) clearInterval(pointTimerId)
    pointTimerId = setInterval(() => {
      let next = Math.floor(Math.random() * POINTS.length)
      while (next === currentPoint.value && POINTS.length > 1) {
        next = Math.floor(Math.random() * POINTS.length)
      }
      currentPoint.value = next
    }, interval.value)
  }
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0c3125 0%, #1a4a38 40%, #2d5e45 100%);
  padding: 10px;
  box-sizing: border-box;
}

/* ===== 主布局 ===== */
.main {
  display: flex;
  gap: 10px;
}

/* 横屏：左右排列 */
.main.landscape {
  flex-direction: row;
  height: calc(100vh - 20px);
  min-height: 480px;
}
.main.landscape .timer-panel {
  flex: 0 0 130px;
}
.main.landscape .court {
  flex: 1;
  min-height: 0;
}

/* 竖屏：上下排列 */
.main.portrait {
  flex-direction: column;
  height: auto;
  min-height: calc(100vh - 20px);
}
.main.portrait .timer-panel {
  flex: none;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}
.main.portrait .timer-display {
  margin-bottom: 0;
}
.main.portrait .presets {
  flex: 1;
  grid-template-columns: repeat(4, 1fr);
  min-width: 180px;
}
.main.portrait .controls {
  flex-direction: row;
}
.main.portrait .speed-row {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px;
}
.main.portrait .speed-btn {
  width: auto;
  padding: 0 10px;
}
.main.portrait .right-col {
  flex: 1;
  min-height: 300px;
}
.main.portrait .court {
  flex: 1;
  width: 100%;
  max-height: 50vh;
}

/* ===== 左列：倒计时面板 ===== */
.timer-panel {
  flex: 0 0 130px;
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.2);
}

.timer-display {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 2px;
}
.timer-num {
  font-size: 36px;
  font-weight: 800;
  font-family: 'Courier New', monospace;
  color: #14665b;
  letter-spacing: 1px;
}
.timer-colon {
  font-size: 30px;
  font-weight: 800;
  color: #14665b;
  line-height: 1;
  margin-bottom: 2px;
}

.presets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.preset-btn {
  height: 28px;
  font-size: 11px;
  font-weight: 600;
  color: #14665b;
  background: #e6f1ed;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0;
  margin: 0;
  line-height: 26px;
  transition: all 0.15s;
}
.preset-btn.active {
  background: #14665b;
  color: #ffffff;
  border-color: #14665b;
}

.custom-row {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}
.time-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.num-input {
  width: 38px;
  height: 28px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #14665b;
  background: #f0f5f3;
  border: 1px solid #cfe0d8;
  border-radius: 6px;
  padding: 0;
}
.unit {
  font-size: 10px;
  color: #5a726d;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ctrl-btn {
  height: 32px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  background: #e3e8e6;
  color: #1a2e2a;
  padding: 0;
  margin: 0;
  line-height: 32px;
  transition: transform 0.08s, background 0.15s;
}
.ctrl-btn:active { transform: scale(0.97); }
.ctrl-btn.primary { background: #14665b; color: #ffffff; }
.ctrl-btn.pause { background: #e5a91a; color: #ffffff; }
.ctrl-btn[disabled] { opacity: 0.5; }

/* 频率 */
.speed-row {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed #d4e0db;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.speed-label {
  font-size: 11px;
  font-weight: 600;
  color: #5a726d;
  text-align: center;
}
.speed-btn {
  width: 100%;
  height: 26px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  background: #e6f1ed;
  color: #14665b;
  padding: 0;
  margin: 0;
  line-height: 26px;
}
.speed-btn.active {
  background: #14665b;
  color: #ffffff;
}

/* ===== 右列：场地 ===== */
.right-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.court {
  position: relative;
  flex: 1;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
}
.court-svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* 训练标记点 */
.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  transition: left 0.25s ease, top 0.25s ease;
  pointer-events: none;
  z-index: 10;
}
.marker-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 85, 85, 0.25);
  animation: ring-pulse 1.2s ease-out infinite;
}
.marker-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ff4545;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(255, 69, 69, 0.6);
}
@keyframes ring-pulse {
  0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}

/* 状态提示 */
.tip {
  padding: 8px 12px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 10px;
}
.tip.done {
  background: rgba(212, 160, 23, 0.35);
}
</style>
