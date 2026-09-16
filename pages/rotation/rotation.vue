<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { planRotation, planRotationForGame } from '../../common/api/rotation'
import { listGames } from '../../common/api/game'
import { genderText, toastError } from '../../common/util'

/**
 * 轮排：人数多于同时上场人数时，按轮安排谁上场、谁休息。
 * 规则由后端 RotationEngine 保证：上场次数差 ≤ 1、尽量不重复搭档、每场实力接近。
 */

const mode = ref('quick') // quick=快速名单 game=真实球局报名名单
const games = ref([])
const gameIndex = ref(0)

const peopleCount = ref(12)
const players = ref([])
const courts = ref(2)
const rounds = ref(6)
const format = ref(2) // 1 单打 2 双打
const balance = ref(true)

const result = ref(null)
const loading = ref(false)

const perMatch = computed(() => (format.value === 1 ? 2 : 4))
const onCourt = computed(() => Math.min(courts.value, Math.floor(peopleCount.value / perMatch.value)) * perMatch.value)
const restingPerRound = computed(() => Math.max(peopleCount.value - onCourt.value, 0))
const canGenerate = computed(() =>
  mode.value === 'game' ? games.value.length > 0 : players.value.length >= perMatch.value,
)
const selectedGame = computed(() => games.value[gameIndex.value] || null)

function rebuildPlayers() {
  const n = Number(peopleCount.value)
  const next = []
  for (let i = 0; i < n; i += 1) {
    const old = players.value[i]
    next.push(old || { userId: i + 1, label: `球员${i + 1}`, gender: 0, rating: 1200 })
  }
  players.value = next
}

function shuffleRatings() {
  players.value = players.value.map((p) => ({
    ...p,
    rating: 1200 + Math.floor(Math.random() * 300) - 150,
  }))
}

watch(peopleCount, rebuildPlayers, { immediate: true })

onLoad((options) => {
  loadGames(options)
})

async function loadGames(options) {
  try {
    games.value = await listGames()
  } catch (e) {
    games.value = []
  }
  if (options && options.gameId) {
    const idx = games.value.findIndex((g) => String(g.id) === String(options.gameId))
    if (idx >= 0) {
      gameIndex.value = idx
      mode.value = 'game'
    }
  }
}

function onGameChange(evt) {
  gameIndex.value = Number(evt.detail.value)
}

async function generate() {
  if (!canGenerate.value) {
    uni.showToast({
      title: `人数不足，至少需要 ${perMatch.value} 人`,
      icon: 'none',
    })
    return
  }
  loading.value = true
  try {
    const payload = {
      courts: Number(courts.value),
      rounds: Number(rounds.value),
      format: Number(format.value),
      balanceStrength: balance.value,
      players: players.value,
    }
    result.value =
      mode.value === 'game'
        ? await planRotationForGame(selectedGame.value.id, payload)
        : await planRotation(payload)
  } catch (e) {
    toastError(e, '生成失败')
  } finally {
    loading.value = false
  }
}

function namesOf(list) {
  return (list || []).map((p) => p.label).join(' / ')
}
</script>

<template>
  <view class="page">
    <scroll-view class="body" scroll-y>
      <view class="hero">
        <view class="hero-title">轮排</view>
        <view class="hero-desc">
          人多场少时按轮轮换上场：每人上场次数差不超过 1 轮，尽量避免重复搭档，每场两队实力接近。
        </view>
      </view>

      <view class="tabs">
        <view :class="['tab', { active: mode === 'quick' }]" @click="mode = 'quick'">快速名单</view>
        <view :class="['tab', { active: mode === 'game' }]" @click="mode = 'game'">真实球局</view>
      </view>

      <view class="panel">
        <view v-if="mode === 'game'" class="field">
          <text class="label">选择球局</text>
          <picker mode="selector" :range="games" range-key="title" :value="gameIndex" @change="onGameChange">
            <view class="picker">
              {{ selectedGame ? selectedGame.title + `（${selectedGame.registeredCount} 人已报名）` : '暂无球局' }}
            </view>
          </picker>
        </view>

        <view v-else class="field">
          <text class="label">人数（{{ peopleCount }} 人）</text>
          <uni-number-box v-model="peopleCount" :min="2" :max="40" />
          <view class="chips">
            <view class="chip" @click="shuffleRatings">随机实力（1200±150）</view>
            <view v-for="n in [4, 6, 8, 10, 12, 16]" :key="n" class="chip" @click="peopleCount = n">
              {{ n }} 人
            </view>
          </view>
        </view>

        <view class="row">
          <text class="label">场地数</text>
          <uni-number-box v-model="courts" :min="1" :max="8" />
        </view>
        <view class="row">
          <text class="label">轮数</text>
          <uni-number-box v-model="rounds" :min="1" :max="20" />
        </view>
        <view class="row">
          <text class="label">赛制</text>
          <view class="seg">
            <view :class="['seg-item', { active: format === 2 }]" @click="format = 2">双打（4 人/场）</view>
            <view :class="['seg-item', { active: format === 1 }]" @click="format = 1">单打（2 人/场）</view>
          </view>
        </view>
        <view class="row">
          <text class="label">实力均衡</text>
          <switch :checked="balance" color="#14665B" @change="balance = $event.detail.value" />
        </view>

        <view class="summary">
          <text>每轮 {{ onCourt }} 人上场</text>
          <text v-if="restingPerRound"> · {{ restingPerRound }} 人休息</text>
        </view>

        <button class="run" type="button" :loading="loading" @click="generate">生成轮排表</button>
      </view>

      <view v-if="result" class="result">
        <view class="result-title">轮排表 · {{ result.formatName }} · {{ result.courts }} 片场地</view>

        <view v-for="r in result.rotation" :key="r.round" class="round">
          <view class="round-head">
            <text class="round-no">第 {{ r.round }} 轮</text>
            <text v-if="r.resting.length" class="round-rest">休息：{{ namesOf(r.resting) }}</text>
            <text v-else class="round-rest">全员上场</text>
          </view>
          <view v-for="m in r.matches" :key="m.court" class="court">
            <view class="court-head">
              <text class="court-no">{{ m.court }} 号场</text>
              <text class="court-score">{{ m.sumA }} vs {{ m.sumB }}</text>
            </view>
            <view class="side">A：{{ namesOf(m.teamA) }}</view>
            <view class="side">B：{{ namesOf(m.teamB) }}</view>
          </view>
        </view>

        <view class="result-title">上场统计</view>
        <view class="stats">
          <view v-for="s in result.stats" :key="s.userId" class="stat">
            <text class="stat-name">{{ s.label }}</text>
            <text class="stat-meta">{{ genderText(s.gender) }} · ELO {{ s.rating }}</text>
            <view class="stat-bar">
              <view class="bar-play" :style="{ flex: s.playCount }"></view>
              <view class="bar-rest" :style="{ flex: s.restCount }"></view>
            </view>
            <text class="stat-count">上场 {{ s.playCount }} · 休息 {{ s.restCount }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf7f0;
}
.body {
  padding: 16px 16px 40px;
  box-sizing: border-box;
}
.hero {
  padding: 18px 16px;
  border-radius: 12px;
  background: #14665b;
  color: #faf7f0;
}
.hero-title {
  font-size: 20px;
  font-weight: 800;
}
.hero-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
  opacity: 0.92;
}
.tabs {
  display: flex;
  gap: 8px;
  padding: 14px 0 6px;
}
.tab {
  padding: 5px 14px;
  border: 1px solid #e3e8e6;
  border-radius: 999px;
  background: #ffffff;
  color: #5a726d;
  font-size: 12px;
  font-weight: 600;
}
.tab.active {
  background: #14665b;
  border-color: #14665b;
  color: #faf7f0;
}
.panel {
  margin-top: 8px;
  padding: 14px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(20, 102, 91, 0.08);
}
.field {
  margin-bottom: 12px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0efea;
}
.label {
  font-size: 13px;
  font-weight: 700;
  color: #1a2e2a;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.chip {
  padding: 4px 10px;
  border: 1px solid #e3e8e6;
  border-radius: 999px;
  background: #faf7f0;
  color: #5a726d;
  font-size: 11px;
}
.seg {
  display: flex;
  gap: 6px;
}
.seg-item {
  padding: 5px 12px;
  border: 1px solid #e3e8e6;
  border-radius: 999px;
  background: #ffffff;
  color: #5a726d;
  font-size: 12px;
}
.seg-item.active {
  background: #14665b;
  border-color: #14665b;
  color: #faf7f0;
  font-weight: 700;
}
.picker {
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid #e3e8e6;
  border-radius: 8px;
  background: #faf7f0;
  font-size: 13px;
  color: #1a2e2a;
}
.summary {
  margin-top: 10px;
  font-size: 12px;
  color: #5a726d;
}
.run {
  margin-top: 12px;
  height: 44px;
  line-height: 44px;
  border: none;
  border-radius: 10px;
  background: #e5c84b;
  color: #1a2e2a;
  font-size: 15px;
  font-weight: 700;
}

.result {
  margin-top: 16px;
}
.result-title {
  margin: 14px 0 8px;
  font-size: 14px;
  font-weight: 800;
  color: #1a2e2a;
}
.round {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  background: #ffffff;
}
.round-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
.round-no {
  font-size: 14px;
  font-weight: 800;
  color: #14665b;
}
.round-rest {
  font-size: 11px;
  color: #5a726d;
}
.court {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 10px;
  background: #faf7f0;
}
.court-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.court-no {
  font-size: 12px;
  font-weight: 700;
  color: #14665b;
}
.court-score {
  font-size: 11px;
  color: #5a726d;
}
.side {
  font-size: 13px;
  color: #1a2e2a;
  line-height: 1.7;
}

.stats {
  padding: 12px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  background: #ffffff;
}
.stat {
  padding: 8px 0;
  border-bottom: 1px solid #f0efea;
}
.stat-name {
  font-size: 13px;
  font-weight: 700;
  color: #1a2e2a;
}
.stat-meta {
  margin-left: 6px;
  font-size: 11px;
  color: #5a726d;
}
.stat-bar {
  display: flex;
  height: 6px;
  margin: 6px 0 4px;
  border-radius: 3px;
  overflow: hidden;
  background: #f0efea;
}
.bar-play {
  background: #14665b;
}
.bar-rest {
  background: #d8e2de;
}
.stat-count {
  font-size: 11px;
  color: #5a726d;
}
</style>
