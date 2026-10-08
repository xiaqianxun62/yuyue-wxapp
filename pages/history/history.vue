<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { toastError, resolveUrl } from '../../common/util'
import SmartImage from '../../components/SmartImage/SmartImage.vue'
import { useAuth } from '../../common/store/auth'
import { navigateTo } from '../../common/nav'
import { listMyGames } from '../../common/api/game'
import { listMyMatches, listMyRatingHistory } from '../../common/api/my'

const { isLoggedIn } = useAuth()

const TAB = { GAMES: 0, MATCHES: 1, RATING: 2 }
const tab = ref(TAB.GAMES)

const myGames = ref([])
const myMatches = ref([])
const myRatingHistory = ref([])
const loading = ref(false)

onShow(async () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 800)
    return
  }
  await loadAll()
})

async function loadAll() {
  if (loading.value) return
  loading.value = true
  try {
    const [g, m, r] = await Promise.all([
      listMyGames().catch(() => []),
      listMyMatches().catch(() => []),
      listMyRatingHistory().catch(() => []),
    ])
    myGames.value = g || []
    myMatches.value = m || []
    myRatingHistory.value = r || []
  } catch (e) {
    toastError(e, '加载历史失败')
  } finally {
    loading.value = false
  }
}

function goGameDetail(id) {
  navigateTo(`/pages/detail/detail?id=${id}`)
}

function setTab(t) { tab.value = t }

function formatDelta(h) {
  const d = h.delta || 0
  if (d > 0) return `+${d}`
  if (d < 0) return `${d}`
  return '0'
}

function formatMatch(m) {
  if (m.myWin === null || !m.settled) {
    return `${m.myScore} : ${m.oppScore} · 未结算`
  }
  return m.myWin === 1
    ? `胜 ${m.myScore} : ${m.oppScore}`
    : `负 ${m.myScore} : ${m.oppScore}`
}

function formatOpponents(m) {
  if (!m.opponents || m.opponents.length === 0) return '对手未知'
  return m.opponents.join('、')
}

function formatTeammates(m) {
  if (!m.teammates || m.teammates.length === 0) return '单打'
  return `和 ${m.teammates.join('、')}`
}

function formatFormatLabel(f) {
  return { 1: '单打', 2: '男双', 3: '女双', 4: '混双' }[f] || '未知'
}
</script>

<template>
  <view class="page">
    <view class="navbar">
      <text class="nav-title">历史场次</text>
    </view>

    <!-- tab 切换 -->
    <view class="tabs">
      <view
        :class="['tab', { active: tab === TAB.GAMES }]"
        @click="setTab(TAB.GAMES)"
      >球局 ({{ myGames.length }})</view>
      <view
        :class="['tab', { active: tab === TAB.MATCHES }]"
        @click="setTab(TAB.MATCHES)"
      >比赛 ({{ myMatches.length }})</view>
      <view
        :class="['tab', { active: tab === TAB.RATING }]"
        @click="setTab(TAB.RATING)"
      >积分 ({{ myRatingHistory.length }})</view>
    </view>

    <!-- ========== Tab 1: 历史球局 ========== -->
    <view v-if="tab === TAB.GAMES" class="content">
      <view v-if="myGames.length === 0" class="empty-hint">还没有报名过球局</view>
      <view
        v-for="g in myGames"
        :key="g.id"
        class="hg-item"
        @click="goGameDetail(g.id)"
      >
        <view class="hg-ttl">
          <text class="hg-title">{{ g.title }}</text>
          <text :class="['hg-status', 's' + g.status]">
            {{ g.status === 0 ? '报名中' : g.status === 1 ? '已编排' : '已结束' }}
          </text>
        </view>
        <view class="hg-meta">
          <text class="hg-date">{{ g.playDate }}</text>
          <text class="hg-sep">·</text>
          <text class="hg-loc">{{ g.location || '地点待定' }}</text>
          <text class="hg-sep">·</text>
          <text>{{ g.registeredCount || 0 }}/{{ g.maxPlayers }} 人</text>
        </view>
        <view v-if="g.remark" class="hg-remark">{{ g.remark }}</view>
      </view>
    </view>

    <!-- ========== Tab 2: 我的比赛 ========== -->
    <view v-if="tab === TAB.MATCHES" class="content">
      <view v-if="myMatches.length === 0" class="empty-hint">还没有打过比赛</view>
      <view
        v-for="m in myMatches"
        :key="m.matchId"
        class="match-item"
      >
        <view class="match-top">
          <text class="match-format">{{ formatFormatLabel(m.format) }}</text>
          <text class="match-game" @click="goGameDetail(m.gameId)">{{ m.gameTitle }}</text>
        </view>

        <!-- 队友头像（我 + 队友） -->
        <view class="match-avatars">
          <view class="avatar-group">
            <view v-for="(t, i) in m.teammates" :key="'t'+i" class="ma-box">
              <view class="ma-box-inner">
                <SmartImage v-if="t.avatar" class="ma-img" :src="t.avatar" mode="aspectFill" />
                <view v-else class="ma-fallback ma-teammate">{{ t.name.charAt(0) }}</view>
                <view v-if="i === 0" class="ma-me-badge">我</view>
              </view>
              <text class="ma-name">{{ t.name }}</text>
            </view>
          </view>
          <text class="match-vs-big">VS</text>
          <view class="avatar-group">
            <view v-for="(o, i) in m.opponents" :key="'o'+i" class="ma-box">
              <view class="ma-box-inner">
                <SmartImage v-if="o.avatar" class="ma-img" :src="o.avatar" mode="aspectFill" />
                <view v-else class="ma-fallback ma-opponent">{{ o.name.charAt(0) }}</view>
              </view>
              <text class="ma-name">{{ o.name }}</text>
            </view>
          </view>
        </view>

        <view class="match-bottom">
          <text :class="['match-result', m.myWin === 1 ? 'win' : m.myWin === 0 ? 'lose' : 'pending']">
            {{ formatMatch(m) }}
          </text>
          <view class="match-extras">
            <text
              v-if="m.myDelta != null"
              :class="['match-delta', m.myDelta > 0 ? 'up' : m.myDelta < 0 ? 'down' : 'zero']"
            >
              ELO {{ m.myDelta > 0 ? '+' : '' }}{{ m.myDelta }}
              <text v-if="m.myRatingAfter != null" class="match-delta-after">→ {{ m.myRatingAfter }}</text>
            </text>
            <text class="match-date">{{ m.gamePlayDate }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ========== Tab 3: 积分明细 ========== -->
    <view v-if="tab === TAB.RATING" class="content">
      <view v-if="myRatingHistory.length === 0" class="empty-hint">还没有积分变动记录</view>
      <view
        v-for="h in myRatingHistory"
        :key="h.id"
        class="rh-item"
      >
        <view class="rh-left">
          <text :class="['rh-delta', h.delta > 0 ? 'up' : h.delta < 0 ? 'down' : 'zero']">
            {{ formatDelta(h) }}
          </text>
          <text class="rh-after">→ {{ h.ratingAfter }}</text>
        </view>
        <text class="rh-time">{{ h.createTime ? h.createTime.slice(0, 16).replace('T', ' ') : '' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf7f0;
}
.navbar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0c3125;
  padding: 10px 0;
}
.nav-title {
  font-size: 16px;
  font-weight: 700;
  color: #faf7f0;
}
.tabs {
  display: flex;
  background: #ffffff;
  border-bottom: 1px solid #e3e8e6;
}
.tab {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  font-size: 14px;
  color: #5a726d;
  position: relative;
  font-weight: 600;
}
.tab.active {
  color: #14665b;
  font-weight: 800;
}
.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  border-radius: 2px;
  background: #14665b;
}
.content {
  padding: 10px 16px;
}
.empty-hint {
  padding: 60px 0;
  text-align: center;
  font-size: 13px;
  color: #8ba8a3;
}

/* 历史球局 */
.hg-item {
  padding: 12px 14px;
  margin-bottom: 10px;
  background: #ffffff;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
}
.hg-ttl {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.hg-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a2e2a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hg-status {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  font-weight: 700;
  flex-shrink: 0;
}
.hg-status.s0 { background: #fef3d7; color: #a05a00; }
.hg-status.s1 { background: #e0f1ec; color: #14665b; }
.hg-status.s2 { background: #ececec; color: #5a726d; }
.hg-meta {
  font-size: 12px;
  color: #5a726d;
}
.hg-sep { margin: 0 4px; color: #9db5b0; }
.hg-remark {
  margin-top: 8px;
  padding: 6px 10px;
  background: #f3f7f4;
  border-left: 3px solid #2d7a66;
  border-radius: 0 4px 4px 0;
  font-size: 11px;
  color: #4a5a53;
  line-height: 1.5;
  white-space: pre-wrap;
}

/* match 明细 */
.match-item {
  padding: 12px 14px;
  margin-bottom: 10px;
  background: #ffffff;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
}
.match-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.match-format {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #14665b;
  color: #faf7f0;
  font-weight: 700;
  flex-shrink: 0;
}
.match-game {
  font-size: 13px;
  font-weight: 700;
  color: #1a2e2a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.match-line {
  display: none;
}

/* 头像组 */
.match-avatars {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.avatar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.avatar-group:last-child { justify-content: flex-end; }
.ma-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.ma-box-inner {
  position: relative;
}
.ma-img, .ma-fallback {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}
.ma-img { border: 2px solid #e3e8e6; display: block; }
.ma-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
}
.ma-teammate { background: #14665b; }
.ma-opponent { background: #8a2a2a; }
.ma-name {
  font-size: 10px;
  color: #5a726d;
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.ma-me-badge {
  position: absolute;
  bottom: -2px;
  right: -4px;
  font-size: 8px;
  padding: 0 4px;
  border-radius: 6px;
  background: #f08a22;
  color: #ffffff;
  font-weight: 800;
  line-height: 12px;
  border: 1.5px solid #ffffff;
}
.match-vs-big {
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #ececec;
  color: #5a726d;
  font-weight: 800;
}
.match-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.match-result {
  font-size: 13px;
  font-weight: 800;
}
.match-result.win { color: #14665b; }
.match-result.lose { color: #8a2a2a; }
.match-result.pending { color: #a05a00; font-weight: 700; }
.match-extras {
  display: flex;
  align-items: center;
  gap: 10px;
}
.match-delta {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f4f7f6;
}
.match-delta.up { background: #e0f1ec; color: #14665b; }
.match-delta.down { background: #fdecec; color: #8a2a2a; }
.match-delta.zero { background: #ececec; color: #5a726d; }
.match-delta-after {
  font-weight: 500;
  opacity: 0.8;
}
.match-date { font-size: 11px; color: #5a726d; }

/* 积分明细 */
.rh-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  margin-bottom: 8px;
  background: #ffffff;
  border: 1px solid #e3e8e6;
  border-radius: 10px;
}
.rh-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.rh-delta {
  font-size: 18px;
  font-weight: 800;
}
.rh-delta.up { color: #14665b; }
.rh-delta.down { color: #8a2a2a; }
.rh-delta.zero { color: #5a726d; }
.rh-after {
  font-size: 12px;
  color: #5a726d;
}
.rh-time {
  font-size: 11px;
  color: #8ba8a3;
}
</style>
