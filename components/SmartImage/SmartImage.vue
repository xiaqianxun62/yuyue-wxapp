<template>
  <view class="smart-image-wrap" :class="{ fading, 'is-loading': !loaded }">
    <!-- 实际显示的图 -->
    <image
      :src="displaySrc"
      :mode="mode"
      :class="{ fade-in: fading }"
      class="smart-image"
      @error="onError"
      @load="onLoad"
    />
    <!-- 隐藏的高清图预加载器：用来触发下载，完成后替换 displaySrc -->
    <image
      v-if="preloadHd && hdSrc"
      :src="hdSrc"
      mode="aspectFill"
      class="hd-preloader"
      @load="onHdLoad"
      @error="onHdError"
    />
  </view>
</template>

<script setup>
/**
 * uni-app SmartImage：缩略图 + 静默预加载高清图
 *
 * 策略同 PC 官网版：
 *   1. 立即显示缩略图（从 src 按命名约定算出 _thumb.jpg 路径）
 *   2. 后台用隐藏 <image> 预加载高清原图
 *   3. 高清图加载完成 → 无感替换 displaySrc + fade 过渡
 *   4. 缩略图 404（历史图片还没生成缩略图）→ 降级显示原图
 *
 * 后端约定：/uploads/avatar_xxx.jpeg → /uploads/avatar_xxx_thumb.jpg
 */
import { computed, ref, watch } from 'vue'
import { resolveUrl, thumbUrl } from '../../common/util'

const props = withDefaults(defineProps({
  /** 原图 URL（后端返回的相对路径 /uploads/xxx，或完整 http(s) URL） */
  src: { type: String, default: '' },
  /** <image mode>，默认 aspectFill（头像/封面常用） */
  mode: { type: String, default: 'aspectFill' },
}), {})

const loaded = ref(false)
const fading = ref(false)
const preloadHd = ref(false)
const displaySrc = ref('')

// 原图完整 URL
const fullSrc = computed(() => resolveUrl(props.src))
// 缩略图完整 URL（跨域 URL 不走缩略图）
const fullThumb = computed(() => {
  if (!props.src || /^https?:\/\//.test(props.src)) return fullSrc.value
  return resolveUrl(thumbUrl(props.src))
})
const hdSrc = computed(() => fullSrc.value)

/** 缩略图 404 → 降级显示原图 */
function onError(e) {
  // 如果当前显示的是缩略图，且缩略图 ≠ 原图 → 降级
  if (displaySrc.value === fullThumb.value && fullThumb.value !== fullSrc.value) {
    displaySrc.value = fullSrc.value
    loaded.value = true
    return
  }
  // 原图也挂了，停止预加载
  preloadHd.value = false
}

function onLoad() {
  loaded.value = true
}

function onHdLoad() {
  // 高清图下载完成 → 替换 displaySrc
  if (preloadHd.value && hdSrc.value && displaySrc.value !== hdSrc.value) {
    fading.value = true
    displaySrc.value = hdSrc.value
    loaded.value = true
    preloadHd.value = false
    // 让 CSS 过渡跑完后重置 fading
    setTimeout(() => { fading.value = false }, 250)
  }
}

function onHdError() {
  // 高清图也加载失败，放弃预加载（已经有缩略图兜底）
  preloadHd.value = false
}

/** src 变化：重置显示缩略图 → 触发高清图预加载 */
watch(
  () => props.src,
  () => {
    loaded.value = false
    fading.value = false
    displaySrc.value = fullThumb.value
    // 如果原图和缩略图路径不同（后端路径才有缩略图），触发预加载
    if (fullSrc.value && fullThumb.value !== fullSrc.value) {
      // 延迟一下再开预加载，等缩略图先渲染出来
      setTimeout(() => { preloadHd.value = true }, 150)
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.smart-image-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.smart-image {
  width: 100%;
  height: 100%;
  display: block;
  transition: opacity 0.25s ease;
  opacity: 1;
}
.smart-image.fade-in {
  opacity: 0.85;
}
/* 预加载器：完全移出布局，不占位置，不渲染 */
.hd-preloader {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
