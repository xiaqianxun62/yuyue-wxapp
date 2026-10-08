<script setup>
import { onMounted, ref } from 'vue'
import { switchTab } from '../../common/nav'

/**
 * 返回兜底按钮。
 *
 * 非 tabBar 页面（详情 / 登录 / 轮排 / 试算 / 聊天）正常情况下由原生导航栏提供返回箭头；
 * 但当页面栈只有一层时（分享卡片、扫码、H5 刷新直接进来），原生没有返回箭头，
 * 页面就成了"孤岛"。这里补一个「返回首页」入口：有上级页面时不显示，避免和原生按钮重复。
 */
const visible = ref(false)

onMounted(() => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  visible.value = !pages || pages.length <= 1
})

function goHome() {
  switchTab('/pages/index/index')
}
</script>

<template>
  <view v-if="visible" class="nav-back" @click="goHome">‹ 返回首页</view>
</template>

<style scoped>
.nav-back {
  position: fixed;
  top: 10px;
  left: 12px;
  z-index: 999;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(26, 46, 42, 0.5);
  color: #faf7f0;
  font-size: 13px;
}
</style>
