<script setup>
import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { ARRANGE_SCHEMES, GAME_STATUS, MATCH_FORMAT, arrangeGame, getGame, registerGame } from '../../common/api/game'
import { AVATAR_COLORS, genderText, shortDate, shortTime, toastError } from '../../common/util'
import { useAuth } from '../../common/store/auth'
import { navigateTo } from '../../common/nav'

const { isLoggedIn, user } = useAuth()

const gameId = ref(0)
const game = ref(null)
const loading = ref(false)
const arranging = ref(false)
const matches = ref(null)
const joining = ref(false)
const pickerVisible = ref(false)
const roundRobin = ref(false)
const schemeId = ref(0)

const statusInfo = computed(() => GAME_STATUS[game.value ? game.value.status : 0])
const registered = computed(() => {
  if (!game.value || !user.value) return false
  return game.value.registrations.some((r) => r.anonymousName === user.value.name)
})

async function load() {
  if (!gameId.value) return
  loading.value = true
  try {
    game.value = await getGame(gameId.value)
  } catch (e) {
    toastError(e, '球局加载失败')
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

onLoad((options) => {
  gameId.value = Number(options.id || 0)
  load()
})

onPullDownRefresh(() => {
  load()
})

async function join() {
  if (!isLoggedIn.value) {
    navigateTo('/pages/auth/auth')
    return
  }
  joining.value = true
  try {
    await registerGame(gameId.value)
    uni.showToast({ title: '报名成功', icon: 'success' })
    await load()
  } catch (e) {
    toastError(e, '报名失败')
  } finally {
    joining.value = false
  }
}

function goRotation() {
  navigateTo(`/pages/rotation/rotation?gameId=${gameId.value}`)
}

function nameOf(id) {
  const reg = game.value && game.value.registrations.find((r) => r.userId === id)
  return reg ? reg.anonymousName : String(id)
}

/** 点击编排：弹出方案选择面板（微信小程序 ActionSheet 最多 6 项，故用自绘弹层） */
function pickArrange() {
  pickerVisible.value = true
}

function closePicker() {
  if (!arranging.value) pickerVisible.value = false
}

async function doArrange(schemeId, roundRobin) {
  arranging.value = true
  try {
    const res = await arrangeGame(gameId.value, { schemeId, roundRobin })
    matches.value = res
    pickerVisible.value = false
    uni.showToast({ title: '编排完成', icon: 'success' })
    await load()
  } catch (e) {
    toastError(e, '编排失败')
  } finally {
    arranging.value = false
  }
}

function colorOf(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}
</script>

<template>
  <view class="page">
    <view v-if="!game" class="state">{{ loading ? '加载中…' : '球局不存在' }}</view>

    <view v-else class="content">
      <view class="head">
        <view class="head-top">
          <text class="title">{{ game.title }}</text>
          <text :class="['badge', statusInfo.type]">{{ statusInfo.text }}</text>
        </view>
        <view class="line">
          <uni-icons type="calendar" size="14" color="#5A726D" />
          <text>{{ shortDate(game.playDate) }} {{ shortTime(game.startTime) }}-{{ shortTime(game.endTime) }}</text>
        </view>
        <view class="line">
          <uni-icons type="location" size="14" color="#5A726D" />
          <text>{{ game.location || '地点待定' }}</text>
        </view>
        <view class="line">
          <uni-icons type="person" size="14" color="#5A726D" />
          <text>{{ game.registeredCount }} / {{ game.maxPlayers }} 人已报名</text>
        </view>
      </view>

      <view class="actions">
        <button v-if="!registered" class="btn primary" :loading="joining" @click="join">
          {{ isLoggedIn ? '匿名报名' : '登录后报名' }}
        </button>
        <view v-else class="joined">已报名，等待开赛</view>
        <button v-if="game.status === 0" class="btn ghost" :loading="arranging" @click="pickArrange">
          自动编排
        </button>
        <button v-if="game.registrations.length >= 4" class="btn ghost" @click="goRotation">
          轮排安排
        </button>
      </view>

      <view class="panel">
        <view class="panel-title">报名名单</view>
        <view v-if="!game.registrations.length" class="panel-empty">还没有人报名</view>
        <view v-for="(r, i) in game.registrations" :key="r.userId" class="member">
          <view class="avatar" :style="{ background: colorOf(i) }">{{ (r.anonymousName || '?').charAt(0) }}</view>
          <view class="member-info">
            <text class="member-name">{{ r.anonymousName }}</text>
            <text class="member-meta">{{ genderText(r.gender) }} · ELO {{ r.rating }}</text>
          </view>
        </view>
      </view>

      <view v-if="matches" class="panel">
        <view class="panel-title">
          编排结果 · {{ matches.schemeName }}
          <text v-if="matches.roundRobin" class="rr-badge">循环赛</text>
        </view>
        <view v-for="(m, i) in matches.matches" :key="i" class="match">
          <view class="match-type">{{ MATCH_FORMAT[m.format] || '双打' }}</view>
          <view class="match-row">
            <text class="side">A：{{ m.teamA.map(nameOf).join(' / ') }}</text>
          </view>
          <view class="match-row">
            <text class="side">B：{{ m.teamB.map(nameOf).join(' / ') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 编排方案选择弹层（微信小程序 ActionSheet 最多 6 项，故自绘） -->
    <view v-if="pickerVisible" class="mask" @click="closePicker">
      <view class="picker" @click.stop>
        <view class="picker-head">
          <text class="picker-title">选择编排方案</text>
          <text class="picker-close" @click="closePicker">✕</text>
        </view>
        <scroll-view scroll-y class="picker-list">
          <view
            v-for="s in ARRANGE_SCHEMES"
            :key="s.id"
            :class="['scheme', { active: schemeId === s.id }]"
            @click="schemeId = s.id"
          >
            <text class="scheme-name">{{ s.name }}</text>
            <text class="scheme-desc">{{ s.desc }}</text>
          </view>
        </scroll-view>
        <view class="picker-toggle" @click="roundRobin = !roundRobin">
          <text>循环赛模式（每支队伍与其他队伍各打一场）</text>
          <view :class="['switch', { on: roundRobin }]">
            <view class="knob" />
          </view>
        </view>
        <button class="btn primary picker-go" :loading="arranging" @click="doArrange(schemeId, roundRobin)">
          开始编排
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf7f0;
  padding: 16px 16px 40px;
}
.state {
  margin-top: 80px;
  text-align: center;
  font-size: 13px;
  color: #5a726d;
}
.head {
  padding: 16px;
  border-radius: 12px;
  background: #14665b;
  color: #faf7f0;
}
.head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.title {
  flex: 1;
  margin-right: 8px;
  font-size: 18px;
  font-weight: 800;
}
.badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.badge.primary {
  background: #e5c84b;
  color: #1a2e2a;
}
.badge.warning {
  background: #fbf1cd;
  color: #8a6d1a;
}
.badge.default {
  background: #e3e8e6;
  color: #5a726d;
}
.line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 13px;
  opacity: 0.92;
}
.actions {
  display: flex;
  gap: 10px;
  margin: 14px 0;
}
.btn {
  flex: 1;
  height: 42px;
  line-height: 42px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
}
.btn.primary {
  border: none;
  background: #e5c84b;
  color: #1a2e2a;
}
.btn.ghost {
  border: 1px solid #14665b;
  background: #ffffff;
  color: #14665b;
}
.joined {
  flex: 1;
  height: 42px;
  line-height: 42px;
  text-align: center;
  border-radius: 10px;
  background: #e0f1ec;
  color: #14665b;
  font-size: 14px;
  font-weight: 700;
}
.panel {
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(20, 102, 91, 0.08);
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 800;
  color: #1a2e2a;
}
.panel-empty {
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
  color: #5a726d;
}
.member {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0efea;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
}
.member-info {
  display: flex;
  flex-direction: column;
}
.member-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a2e2a;
}
.member-meta {
  font-size: 11px;
  color: #5a726d;
}
.match {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 10px;
  background: #faf7f0;
}

/* ---------- 编排方案弹层 ---------- */
.mask {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(26, 46, 42, 0.45);
  display: flex;
  align-items: flex-end;
}
.picker {
  width: 100%;
  border-radius: 16px 16px 0 0;
  background: #ffffff;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
}
.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.picker-title {
  font-size: 15px;
  font-weight: 800;
  color: #1a2e2a;
}
.picker-close {
  padding: 4px;
  font-size: 14px;
  color: #5a726d;
}
.picker-list {
  max-height: 320px;
}
.scheme {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid #e3e8e6;
  border-radius: 10px;
  background: #faf7f0;
}
.scheme.active {
  border-color: #14665b;
  background: #e0f1ec;
}
.scheme-name {
  font-size: 14px;
  font-weight: 700;
  color: #1a2e2a;
}
.scheme-desc {
  font-size: 11px;
  color: #5a726d;
}
.picker-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 13px;
  color: #1a2e2a;
}
.switch {
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: #d8dcd6;
  padding: 2px;
  box-sizing: border-box;
  transition: background 0.2s;
}
.switch.on {
  background: #14665b;
}
.switch .knob {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.2s;
}
.switch.on .knob {
  transform: translateX(18px);
}
.picker-go {
  margin-top: 8px;
  width: 100%;
}
.rr-badge {
  padding: 1px 8px;
  border-radius: 999px;
  background: #fbf1cd;
  color: #8a6d1a;
  font-size: 10px;
  font-weight: 700;
}
.match-type {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #14665b;
}
.match-row {
  display: flex;
  align-items: center;
}
.side {
  font-size: 13px;
  color: #1a2e2a;
}
</style>
