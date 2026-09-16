<script setup>
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { GAME_STATUS, listGames } from '../../common/api/game'
import { shortDate, shortTime, toastError } from '../../common/util'
import { useAuth } from '../../common/store/auth'
import { navigateTo, switchTab } from '../../common/nav'

const { user } = useAuth()

const games = ref([])
const loading = ref(false)
const tabIndex = ref(0)
const TABS = [
  { text: '全部', status: null },
  { text: '报名中', status: 0 },
  { text: '已编排', status: 1 },
  { text: '已结束', status: 2 },
]

const visible = computed(() => {
  const status = TABS[tabIndex.value].status
  return status === null ? games.value : games.value.filter((g) => g.status === status)
})

async function load() {
  loading.value = true
  try {
    games.value = await listGames()
  } catch (e) {
    toastError(e, '球局加载失败')
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

onShow(() => {
  load()
})

onPullDownRefresh(() => {
  load()
})

function goDetail(id) {
  navigateTo(`/pages/detail/detail?id=${id}`)
}

function goCreate() {
  switchTab('/pages/create/create')
}

function goLogin() {
  navigateTo('/pages/auth/auth')
}

function goRotation() {
  navigateTo('/pages/rotation/rotation')
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <view class="hero-row">
        <view class="hero-brand">数羽 SHUYU</view>
        <view class="hero-user" v-if="user">
          <text class="hero-user-name">{{ user.name }}</text>
          <text class="hero-user-rating">ELO {{ user.rating }}</text>
        </view>
        <view class="hero-user" v-else @click="goLogin">
          <text class="hero-user-name">未登录 · 点击登录</text>
        </view>
      </view>
      <view class="hero-title">今天，有没有一场势均力敌的球局？</view>
      <view class="hero-actions">
        <button class="hero-btn" type="button" @click="goCreate">发布球局</button>
        <button class="hero-btn ghost" type="button" @click="goRotation">轮排安排</button>
      </view>
    </view>

    <view class="tabs">
      <view
        v-for="(tab, i) in TABS"
        :key="tab.text"
        :class="['tab', { active: i === tabIndex }]"
        @click="tabIndex = i"
      >
        {{ tab.text }}
      </view>
    </view>

    <view class="list">
      <view v-if="loading && !games.length" class="state">加载中…</view>
      <view v-else-if="!visible.length" class="state">暂无球局，去发布一个吧</view>

      <view v-for="game in visible" :key="game.id" class="card" @click="goDetail(game.id)">
        <view class="card-head">
          <text class="card-title">{{ game.title }}</text>
          <text :class="['badge', GAME_STATUS[game.status].type]">
            {{ GAME_STATUS[game.status].text }}
          </text>
        </view>
        <view class="meta">
          <uni-icons type="calendar" size="14" color="#5A726D" />
          <text>{{ shortDate(game.playDate) }} {{ shortTime(game.startTime) }}-{{ shortTime(game.endTime) }}</text>
        </view>
        <view class="meta">
          <uni-icons type="location" size="14" color="#5A726D" />
          <text>{{ game.location || '地点待定' }}</text>
        </view>
        <view class="card-foot">
          <text class="count">{{ game.registeredCount }} / {{ game.maxPlayers }} 人</text>
          <text class="link">查看报名 ›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf7f0;
  padding-bottom: 30px;
}

/* Hero */
.hero {
  padding: 20px 16px 22px;
  background: #14665b;
  color: #faf7f0;
}
.hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hero-brand {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
}
.hero-user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.hero-user-name {
  font-size: 12px;
  opacity: 0.95;
}
.hero-user-rating {
  font-size: 11px;
  color: #e5c84b;
  font-weight: 700;
}
.hero-title {
  margin: 16px 0 14px;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.5;
}
.hero-actions {
  display: flex;
  gap: 10px;
}
.hero-btn {
  height: 38px;
  line-height: 38px;
  padding: 0 20px;
  border: none;
  border-radius: 19px;
  background: #e5c84b;
  color: #1a2e2a;
  font-size: 14px;
  font-weight: 700;
}
.hero-btn.ghost {
  border: 1px solid rgba(250, 247, 240, 0.6);
  background: transparent;
  color: #faf7f0;
}

/* 筛选 */
.tabs {
  display: flex;
  gap: 8px;
  padding: 14px 16px 6px;
}
.tab {
  padding: 5px 14px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #e3e8e6;
  color: #5a726d;
  font-size: 12px;
  font-weight: 600;
}
.tab.active {
  background: #14665b;
  border-color: #14665b;
  color: #faf7f0;
}

/* 列表 */
.list {
  padding: 8px 16px;
}
.state {
  margin-top: 60px;
  text-align: center;
  font-size: 13px;
  color: #5a726d;
}
.card {
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(20, 102, 91, 0.08);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.card-title {
  flex: 1;
  margin-right: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1a2e2a;
}
.badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.badge.primary {
  background: #e0f1ec;
  color: #14665b;
}
.badge.warning {
  background: #fbf1cd;
  color: #8a6d1a;
}
.badge.default {
  background: #f0efea;
  color: #6b6b6b;
}
.meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #5a726d;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0efea;
}
.count {
  font-size: 13px;
  font-weight: 700;
  color: #14665b;
}
.link {
  font-size: 12px;
  color: #5a726d;
}
</style>
