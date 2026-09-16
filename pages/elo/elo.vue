<script setup>
import { computed, ref } from 'vue'
import { simulateElo } from '../../common/api/elo'
import { toastError } from '../../common/util'

const maleCount = ref(4)
const femaleCount = ref(2)
const gamesPlayed = ref(0)
const roundRobin = ref(false)
const ratingsText = ref('1200,1300,1400,1250,1180,1320')
const result = ref(null)
const computing = ref(false)

const ratings = computed(() =>
  ratingsText.value
    .split(/[,，\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n)),
)

const countMismatch = computed(
  () => ratings.value.length && ratings.value.length !== Number(maleCount.value) + Number(femaleCount.value),
)

async function run() {
  if (countMismatch.value) {
    uni.showToast({
      title: `人数 ${Number(maleCount.value) + Number(femaleCount.value)} 与积分数量 ${ratings.value.length} 不一致`,
      icon: 'none',
    })
    return
  }
  computing.value = true
  try {
    result.value = await simulateElo({
      maleCount: Number(maleCount.value),
      femaleCount: Number(femaleCount.value),
      ratings: ratings.value,
      gamesPlayed: Number(gamesPlayed.value),
      roundRobin: roundRobin.value,
    })
  } catch (e) {
    toastError(e, '试算失败')
  } finally {
    computing.value = false
  }
}

function deltaText(delta) {
  return delta >= 0 ? `+${delta}` : String(delta)
}

function sideNames(sides) {
  return sides.map((s) => s.label).join(' / ')
}

function allSides(match) {
  return match.teamA.concat(match.teamB)
}
</script>

<template>
  <view class="page">
    <scroll-view class="body" scroll-y>
      <view class="intro">
        <view class="intro-title">ELO 试算实验室</view>
        <view class="intro-desc">
          调用后端真实编排引擎与 ELO 计算器，按「先男后女」顺序传入初始积分，预演一场球局结束后的积分变化（不落库）。
        </view>
      </view>

      <view class="panel">
        <view class="row">
          <text class="row-label">男生</text>
          <uni-number-box v-model="maleCount" :min="0" :max="12" />
        </view>
        <view class="row">
          <text class="row-label">女生</text>
          <uni-number-box v-model="femaleCount" :min="0" :max="12" />
        </view>
        <view class="row">
          <text class="row-label">历史场次</text>
          <uni-number-box v-model="gamesPlayed" :min="0" :max="60" />
        </view>
        <view class="row">
          <text class="row-label">循环赛</text>
          <switch :checked="roundRobin" color="#14665B" @change="roundRobin = $event.detail.value" />
        </view>
        <view class="col">
          <text class="row-label">初始积分（逗号分隔，先男后女）</text>
          <uni-easyinput type="textarea" v-model="ratingsText" placeholder="1200,1300,1400" />
          <text class="hint">已解析 {{ ratings.length }} 个积分</text>
        </view>
        <button class="run" type="button" :loading="computing" @click="run">开始试算</button>
      </view>

      <view v-if="result" class="panel">
        <view class="panel-title">方案：{{ result.schemeName }}</view>

        <view class="sub">积分变化</view>
        <view v-for="p in result.players" :key="p.id" class="player">
          <text class="player-label">{{ p.label }}</text>
          <text class="player-from">{{ p.rating }}</text>
          <text class="player-after">
            {{ p.finalRating == null ? p.rating : p.finalRating }}
          </text>
        </view>

        <view class="sub">对阵</view>
        <view v-for="(m, i) in result.matches" :key="i" class="match">
          <view class="match-head">
            <text class="format">{{ m.formatName }}</text>
            <text class="exp">A 胜率 {{ Math.round(m.expectedA * 100) }}%</text>
          </view>
          <view class="side">A：{{ sideNames(m.teamA) }}</view>
          <view class="side">B：{{ sideNames(m.teamB) }}</view>
          <view class="winner">胜方：{{ m.winner === 1 ? 'A 队' : 'B 队' }}</view>
          <view v-for="s in allSides(m)" :key="s.id" class="delta">
            {{ s.label }} {{ deltaText(s.delta) }} → {{ s.ratingAfter }}
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
.intro {
  padding: 16px;
  border-radius: 12px;
  background: #14665b;
  color: #faf7f0;
}
.intro-title {
  font-size: 18px;
  font-weight: 800;
}
.intro-desc {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  opacity: 0.92;
}
.panel {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(20, 102, 91, 0.08);
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0efea;
}
.row-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a2e2a;
}
.col {
  padding: 12px 0 0;
}
.hint {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: #5a726d;
}
.run {
  margin-top: 14px;
  height: 42px;
  line-height: 42px;
  border: none;
  border-radius: 10px;
  background: #e5c84b;
  color: #1a2e2a;
  font-size: 15px;
  font-weight: 700;
}
.panel-title {
  font-size: 14px;
  font-weight: 800;
  color: #1a2e2a;
}
.sub {
  margin: 14px 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: #5a726d;
}
.player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  color: #1a2e2a;
}
.player-after {
  min-width: 60px;
  text-align: right;
  font-weight: 800;
  color: #14665b;
}
.match {
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 10px;
  background: #faf7f0;
}
.match-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.format {
  font-size: 12px;
  font-weight: 700;
  color: #14665b;
}
.exp {
  font-size: 11px;
  color: #5a726d;
}
.side {
  font-size: 13px;
  color: #1a2e2a;
}
.winner {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #2e8b57;
}
.delta {
  font-size: 11px;
  color: #5a726d;
}
</style>
