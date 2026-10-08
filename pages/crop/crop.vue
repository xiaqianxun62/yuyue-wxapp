<script setup>
import { onLoad, onReady } from '@dcloudio/uni-app'

/**
 * 头像裁剪页：Canvas 2D 全屏画布，正方形裁剪框（圆形引导），
 * 单指拖动 + 双指缩放，确认后导出 480x480 jpg，通过全局事件回传给上一页上传。
 */

let canvas = null
let ctx = null
let image = null

/** 画布逻辑尺寸（CSS px），与窗口同大 */
let canvasW = 0
let canvasH = 0
/** 裁剪框正方形边长与左上角坐标 */
let frame = 0
let frameX = 0
let frameY = 0

/** 当前图片相对裁剪框中心的缩放与位移 */
let scale = 1
let minScale = 1
let maxScale = 5
let offsetX = 0
let offsetY = 0

/** 手势过程中的起始状态 */
let startDist = 0
let startScale = 1
let startMidX = 0
let startMidY = 0
let startOffsetX = 0
let startOffsetY = 0
let startX = 0
let startY = 0

const srcRef = { value: '' }

onLoad((options) => {
  srcRef.value = options && options.src ? decodeURIComponent(options.src) : ''
})

onReady(() => {
  initCanvas()
})

function initCanvas() {
  const info = uni.getSystemInfoSync()

  const query = uni.createSelectorQuery()
  query.select('#cropCanvas').fields({ node: true, size: true }).exec((res) => {
    if (!res || !res[0] || !res[0].node) {
      uni.showToast({ title: '裁剪组件初始化失败', icon: 'none' })
      return
    }
    // 画布逻辑尺寸取节点实际布局尺寸：H5 在 PC 宽屏下外层是 430px 手机外壳，
    // 不能用 info.windowWidth（那是整窗宽度，会让绘制坐标偏移）
    canvasW = res[0].width
    canvasH = res[0].height
    frame = Math.min(canvasW - 56, 340)
    frameX = (canvasW - frame) / 2
    // 裁剪框略偏上，给底部按钮留空间
    frameY = canvasH * 0.42 - frame / 2

    canvas = res[0].node
    ctx = canvas.getContext('2d')
    // #ifdef H5
    // H5 端 canvas 组件已内置 HiDPI：backing store 自动 ×dpr，
    // 且 ctx 的绘制方法被运行时按 dpr 自动换算。这里再设置 width/scale
    // 会与内置逻辑叠加，导致裁剪框被放大并向右下偏移，故完全不干预。
    // #endif
    // #ifndef H5
    // 小程序端无内置 dpr 适配，需要手动放大画布并缩放上下文，保证高清
    const dpr = info.pixelRatio || 1
    canvas.width = Math.round(canvasW * dpr)
    canvas.height = Math.round(canvasH * dpr)
    ctx.scale(dpr, dpr)
    // #endif
    loadImage()
  })
}

function loadImage() {
  if (!srcRef.value) {
    uni.showToast({ title: '图片地址缺失', icon: 'none' })
    return
  }
  // #ifdef H5
  // H5 浏览器环境：用标准 Image 对象
  image = new Image()
  // #endif
  // #ifndef H5
  // 小程序端不能 new Image()，用 canvas.createImage
  image = canvas.createImage()
  // #endif
  image.onload = () => {
    minScale = Math.max(frame / image.width, frame / image.height)
    maxScale = minScale * 5
    scale = minScale
    offsetX = 0
    offsetY = 0
    draw()
  }
  image.onerror = () => {
    uni.showToast({ title: '图片加载失败', icon: 'none' })
  }
  image.src = srcRef.value
}

/** 所有绘制都在同步内存数据上进行，手势热路径不做任何异步 IO */
function draw() {
  if (!ctx || !image) return
  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = '#0f0f0f'
  ctx.fillRect(0, 0, canvasW, canvasH)

  const cx = frameX + frame / 2 + offsetX
  const cy = frameY + frame / 2 + offsetY
  const w = image.width * scale
  const h = image.height * scale

  ctx.save()
  ctx.beginPath()
  ctx.rect(frameX, frameY, frame, frame)
  ctx.clip()
  ctx.drawImage(image, cx - w / 2, cy - h / 2, w, h)
  ctx.restore()

  // 裁剪框外压暗（四块矩形，避免全屏遮罩盖住框内图片）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, 0, canvasW, frameY)
  ctx.fillRect(0, frameY + frame, canvasW, canvasH - frameY - frame)
  ctx.fillRect(0, frameY, frameX, frame)
  ctx.fillRect(frameX + frame, frameY, canvasW - frameX - frame, frame)

  // 圆形引导环（前端按圆形展示，导出仍是正方形）
  ctx.beginPath()
  ctx.arc(frameX + frame / 2, frameY + frame / 2, frame / 2 - 1, 0, Math.PI * 2)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.stroke()

  // 四角标识
  ctx.beginPath()
  const corner = 18
  const gap = 4
  const left = frameX - gap
  const right = frameX + frame + gap
  const top = frameY - gap
  const bottom = frameY + frame + gap
  ctx.moveTo(left, top + corner)
  ctx.lineTo(left, top)
  ctx.lineTo(left + corner, top)
  ctx.moveTo(right - corner, top)
  ctx.lineTo(right, top)
  ctx.lineTo(right, top + corner)
  ctx.moveTo(right, bottom - corner)
  ctx.lineTo(right, bottom)
  ctx.lineTo(right - corner, bottom)
  ctx.moveTo(left + corner, bottom)
  ctx.lineTo(left, bottom)
  ctx.lineTo(left, bottom - corner)
  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
}

function clampOffset() {
  const maxX = Math.max((image.width * scale - frame) / 2, 0)
  const maxY = Math.max((image.height * scale - frame) / 2, 0)
  offsetX = Math.min(maxX, Math.max(-maxX, offsetX))
  offsetY = Math.min(maxY, Math.max(-maxY, offsetY))
}

function onTouchStart(e) {
  const touches = e.touches || []
  if (touches.length === 1) {
    startX = touches[0].clientX
    startY = touches[0].clientY
  } else if (touches.length === 2) {
    startDist = distance(touches[0], touches[1])
    startScale = scale
    startMidX = (touches[0].clientX + touches[1].clientX) / 2
    startMidY = (touches[0].clientY + touches[1].clientY) / 2
    startOffsetX = offsetX
    startOffsetY = offsetY
  }
}

function onTouchMove(e) {
  const touches = e.touches || []
  if (touches.length === 1) {
    offsetX += touches[0].clientX - startX
    offsetY += touches[0].clientY - startY
    startX = touches[0].clientX
    startY = touches[0].clientY
    clampOffset()
    draw()
  } else if (touches.length === 2 && startDist > 0) {
    const dist = distance(touches[0], touches[1])
    const ratio = dist / startDist
    scale = Math.min(maxScale, Math.max(minScale, startScale * ratio))
    const midX = (touches[0].clientX + touches[1].clientX) / 2
    const midY = (touches[0].clientY + touches[1].clientY) / 2
    offsetX = startOffsetX + (midX - startMidX)
    offsetY = startOffsetY + (midY - startMidY)
    clampOffset()
    draw()
  }
}

function onTouchEnd(e) {
  const touches = e.touches || []
  if (touches.length < 2) {
    startDist = 0
  }
  if (touches.length === 1) {
    startX = touches[0].clientX
    startY = touches[0].clientY
  }
}

function distance(a, b) {
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onCancel() {
  uni.navigateBack()
}

function onConfirm() {
  if (!image) return
  uni.showLoading({ title: '处理中', mask: true })
  // #ifdef H5
  // H5 端 uni.canvasToTempFilePath 只走 canvasId 旧桥接；type="2d" 的 canvas
  // 没有 canvas-id，组件把 viewMethod 注册成了 canvas.contextN，桥接找不到
  // canvas.cropCanvas 会静默 success 但 tempFilePath 为空，头像上传请求根本不会发出。
  // 故 H5 直接用 canvas node 按裁剪框区域离屏导出 480x480 jpeg（data URL 可被
  // uni.uploadFile 识别并转成 multipart File，文件名为 .jpeg，后端校验通过）。
  try {
    // 源画布 backing store 与逻辑(CSS)尺寸之比，运行时内置 HiDPI 下等于 dpr
    const ratio = canvas.width / canvasW
    const out = document.createElement('canvas')
    out.width = 480
    out.height = 480
    const octx = out.getContext('2d')
    octx.fillStyle = '#ffffff'
    octx.fillRect(0, 0, 480, 480)
    octx.drawImage(
      canvas,
      frameX * ratio,
      frameY * ratio,
      frame * ratio,
      frame * ratio,
      0,
      0,
      480,
      480,
    )
    const dataUrl = out.toDataURL('image/jpeg', 0.9)
    uni.hideLoading()
    uni.$emit('avatar-cropped', dataUrl)
    uni.navigateBack()
  } catch (err) {
    console.error('[crop] H5 裁剪导出失败', err)
    uni.hideLoading()
    uni.showToast({ title: '裁剪失败，请重试', icon: 'none' })
  }
  return
  // #endif
  // #ifndef H5
  uni.canvasToTempFilePath({
    canvasId: 'cropCanvas',
    canvas,
    x: frameX,
    y: frameY,
    width: frame,
    height: frame,
    destWidth: 480,
    destHeight: 480,
    fileType: 'jpg',
    quality: 0.9,
    success: (res) => {
      uni.hideLoading()
      uni.$emit('avatar-cropped', res.tempFilePath)
      uni.navigateBack()
    },
    fail: (res) => {
      console.error('[crop] 裁剪导出失败', res)
      uni.hideLoading()
      uni.showToast({ title: '裁剪失败，请重试', icon: 'none' })
    },
  })
  // #endif
}
</script>

<template>
  <view class="crop-page">
    <canvas
      id="cropCanvas"
      type="2d"
      class="crop-canvas"
      @touchstart.stop="onTouchStart"
      @touchmove.stop="onTouchMove"
      @touchend.stop="onTouchEnd"
    />
    <view class="top-tip">拖动调整位置，双指缩放</view>
    <view class="bottom-bar">
      <button class="btn cancel" @click="onCancel">取消</button>
      <button class="btn confirm" @click="onConfirm">确定</button>
    </view>
  </view>
</template>

<style>
.crop-page {
  position: relative;
  /* 100% 而不是 100vw：H5 在 PC 宽屏下外层是 430px 手机外壳 */
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #0f0f0f;
}

.crop-canvas {
  position: absolute;
  top: 0;
  left: 0;
  /* 用 100% 而不是 100vw：H5 在 PC 宽屏下外层是 430px 手机外壳，100vw 会溢出到整窗 */
  width: 100%;
  height: 100vh;
}

.top-tip {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 24rpx);
  left: 0;
  right: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 28rpx;
  pointer-events: none;
}

.bottom-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + 32rpx);
  display: flex;
  justify-content: center;
  gap: 80rpx;
}

.btn {
  width: 220rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  text-align: center;
  border: none;
}

.btn.cancel {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.btn.confirm {
  background: #14665b;
  color: #ffffff;
}

.btn::after {
  border: none;
}
</style>
