<script setup>
/**
 * 跨端地图显示组件（可拖拽）
 * - 微信小程序：原生 <map> 组件；
 * - H5：同源 iframe 挂 static/qqmap.html（自包含腾讯地图页：单份 SDK、独立文档渲染瓦片）。
 *   原因：项目 manifest 配置了 tencent key，uni 构建内置了一份腾讯 SDK，H5 地图
 *   实例能创建但瓦片拉取不可控（灰底）；iframe 隔离后与独立复现页行为一致，稳定显示。
 *   iframe 同源，可读父页 query 传参，静态页路径以 BASE_URL 前缀动态解析。
 * 坐标统一接收 WGS84（后端 court 表存储格式），内部转 GCJ-02。
 */
import { computed, ref } from 'vue'
import { wgs84ToGcj02 } from '../../common/coord'

const props = defineProps({
  /** WGS84 纬度（后端 court 表坐标） */
  latitude: { type: [Number, String], default: 0 },
  /** WGS84 经度 */
  longitude: { type: [Number, String], default: 0 },
  /** 标记点标题 */
  title: { type: String, default: '球场位置' },
  /** 地图高度（px） */
  height: { type: Number, default: 280 },
  /** 容器圆角（贴边矩形可传 0） */
  radius: { type: Number, default: 10 },
})

const emit = defineEmits(['tap'])

/** 是否有有效坐标 */
const hasPoint = computed(
  () => Number(props.latitude) !== 0 && Number(props.longitude) !== 0,
)

/** WGS84 → GCJ-02（腾讯/微信地图都认 GCJ-02）
 * 防御：中国境内纬度 ≤~54°、经度 ≥~73°；库里部分历史记录 lat/lng 存反（实测
 * 健康城球场 courtLat=113.4），检测到 Swap 一次，避免 marker 和地图都落到
 * 经度当纬度的位置上 */
const correctedPoint = computed(() => {
  let lat = Number(props.latitude)
  let lng = Number(props.longitude)
  if (Math.abs(lat) > 60 && Math.abs(lng) < 60) {
    const t = lat; lat = lng; lng = t
  }
  return { lat, lng }
})

const gcjPoint = computed(() => {
  const p = correctedPoint.value
  const [gcjLng, gcjLat] = wgs84ToGcj02(p.lng, p.lat)
  return { latitude: gcjLat, longitude: gcjLng }
})

/** 标记 + 常显气泡（callout 为 uni map 原生支持，小程序端通用） */
const markers = computed(() => {
  if (!hasPoint.value) return []
  return [{
    id: 1,
    latitude: gcjPoint.value.latitude,
    longitude: gcjPoint.value.longitude,
    title: props.title,
    width: 28,
    height: 36,
    callout: {
      content: props.title,
      color: '#1a2e2a',
      fontSize: 13,
      borderRadius: 8,
      bgColor: '#ffffff',
      padding: 10,
      display: 'ALWAYS',
      textAlign: 'left',
    },
  }]
})

/** H5 iframe 地址：static 下的静态地图页，坐标/标题走 query。
 * 关键：static 目录只随 uni H5 构建产物存在（开发时在 localhost:5175/h5/static/），
 * 必须相对当前页面 origin + 路由基路径解析，不能指向后端地址（否则 404） */
const H5_MAP_PAGE = computed(() => {
  let root = '/'
  // #ifdef H5
  try {
    const p = window.location.pathname
    root = p.endsWith('/') ? p : p.slice(0, p.lastIndexOf('/') + 1)
  } catch (e) { /* ignore */ }
  // #endif
  const src = root + 'static/qqmap.html'
  const qs = 'lat=' + encodeURIComponent(gcjPoint.value.latitude) +
    '&lng=' + encodeURIComponent(gcjPoint.value.longitude) +
    '&title=' + encodeURIComponent(props.title) +
    '&h=' + Math.round(props.height)
  return src + '?' + qs
})
</script>

<template>
  <view class="qq-map-view" :style="{ height: height + 'px', borderRadius: radius + 'px' }">
    <!-- #ifdef MP-WEIXIN -->
    <map
      v-if="hasPoint"
      class="qq-map-native"
      :latitude="gcjPoint.latitude"
      :longitude="gcjPoint.longitude"
      :scale="16"
      :markers="markers"
      :show-location="false"
      :enable-zoom="true"
      :enable-scroll="true"
      @tap="emit('tap')"
    />
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <iframe
      v-if="hasPoint"
      class="qq-map-iframe"
      :src="H5_MAP_PAGE"
      :style="{ height: height + 'px' }"
      frameborder="0"
      allowfullscreen
    />
    <!-- #endif -->
    <view v-if="!hasPoint" class="qq-map-tip qq-map-tip-clickable" @tap="emit('tap')">
      <text>📍 {{ title }}</text>
      <text class="qq-map-tip-sub">暂无精确坐标 · 点击导航</text>
    </view>
  </view>
</template>

<style scoped>
.qq-map-view {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #eef1ef;
}
.qq-map-native,
.qq-map-iframe {
  width: 100%;
  height: 100%;
}
.qq-map-iframe {
  display: block;
  border: none;
}
.qq-map-tip {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #f1f5f3;
  color: #14665b;
  font-size: 14px;
  font-weight: 600;
}
.qq-map-tip-clickable {
  cursor: pointer;
}
.qq-map-tip-sub {
  font-size: 11px;
  font-weight: 400;
  color: #5a726d;
}
</style>
