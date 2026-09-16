<script setup>
import { computed, ref } from 'vue'
import { createGame } from '../../common/api/game'
import { LOCATIONS, TIME_SLOTS, toastError } from '../../common/util'
import { useAuth } from '../../common/store/auth'
import { navigateTo, switchTab } from '../../common/nav'

const { isLoggedIn } = useAuth()

const DEFAULT_MAX = 8

const form = ref({
  title: '',
  location: '',
  playDate: '',
  startTime: '',
  endTime: '',
  maxPlayers: DEFAULT_MAX,
})
const submitting = ref(false)

/** 默认明天 */
const today = new Date()
const tomorrow = new Date(today.getTime() + 86400000)
form.value.playDate = [
  tomorrow.getFullYear(),
  String(tomorrow.getMonth() + 1).padStart(2, '0'),
  String(tomorrow.getDate()).padStart(2, '0'),
].join('-')
form.value.startTime = TIME_SLOTS[0].start.slice(0, 5)
form.value.endTime = TIME_SLOTS[0].end.slice(0, 5)

const canSubmit = computed(
  () => !!form.value.title && !!form.value.playDate && !!form.value.startTime,
)

function pickSlot(index) {
  form.value.startTime = TIME_SLOTS[index].start.slice(0, 5)
  form.value.endTime = TIME_SLOTS[index].end.slice(0, 5)
}

function pickLocation(item) {
  form.value.location = item
}

function onTimeChange(evt, key) {
  form.value[key] = evt.detail.value
}

async function submit() {
  if (!isLoggedIn.value) {
    navigateTo('/pages/auth/auth')
    return
  }
  if (!canSubmit.value) {
    uni.showToast({ title: '请填写标题、日期与开始时间', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await createGame({
      title: form.value.title,
      location: form.value.location || undefined,
      playDate: form.value.playDate,
      startTime: `${form.value.startTime}:00`,
      endTime: form.value.endTime ? `${form.value.endTime}:00` : undefined,
      maxPlayers: Number(form.value.maxPlayers),
    })
    uni.showToast({ title: '球局已发布', icon: 'success' })
    setTimeout(() => {
      switchTab('/pages/index/index')
    }, 600)
  } catch (e) {
    toastError(e, '发布失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <scroll-view class="body" scroll-y>
      <view class="section">
        <view class="label">球局标题</view>
        <uni-easyinput
          v-model="form.title"
          placeholder="例如：周末双打局 · 新手友好"
          :maxlength="30"
        />
      </view>

      <view class="section">
        <view class="label">地点</view>
        <uni-easyinput v-model="form.location" placeholder="例如：体育馆羽毛球场" />
        <scroll-view class="chips" scroll-x>
          <view
            v-for="item in LOCATIONS"
            :key="item"
            class="chip"
            @click="pickLocation(item)"
          >
            {{ item }}
          </view>
        </scroll-view>
      </view>

      <view class="section">
        <view class="label">日期</view>
        <uni-datetime-picker type="date" v-model="form.playDate" :clear-icon="false" />
      </view>

      <view class="section">
        <view class="label">时段</view>
        <view class="row">
          <picker mode="time" :value="form.startTime" @change="onTimeChange($event, 'startTime')">
            <view class="time-box">{{ form.startTime }}</view>
          </picker>
          <text class="dash">—</text>
          <picker mode="time" :value="form.endTime" @change="onTimeChange($event, 'endTime')">
            <view class="time-box">{{ form.endTime }}</view>
          </picker>
        </view>
        <scroll-view class="chips" scroll-x>
          <view
            v-for="(slot, i) in TIME_SLOTS"
            :key="i"
            class="chip"
            @click="pickSlot(i)"
          >
            {{ slot.start.slice(0, 5) }}-{{ slot.end.slice(0, 5) }}
          </view>
        </scroll-view>
      </view>

      <view class="section">
        <view class="label">人数上限</view>
        <uni-number-box v-model="form.maxPlayers" :min="2" :max="24" />
      </view>

      <button class="submit" type="button" :loading="submitting" @click="submit">
        {{ isLoggedIn ? '发布球局' : '登录后发布' }}
      </button>
      <view class="tip">发布后可在球局详情页邀请球友报名</view>
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf7f0;
}
.body {
  padding: 16px 16px 30px;
  box-sizing: border-box;
}
.section {
  margin-bottom: 18px;
}
.label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1a2e2a;
}
.chips {
  margin-top: 10px;
  white-space: nowrap;
}
.chip {
  display: inline-block;
  margin-right: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #e3e8e6;
  color: #5a726d;
  font-size: 12px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.time-box {
  padding: 9px 18px;
  border: 1px solid #e3e8e6;
  border-radius: 8px;
  background: #ffffff;
  font-size: 14px;
  color: #1a2e2a;
}
.dash {
  color: #5a726d;
}
.submit {
  margin-top: 8px;
  height: 44px;
  line-height: 44px;
  border: none;
  border-radius: 10px;
  background: #e5c84b;
  color: #1a2e2a;
  font-size: 15px;
  font-weight: 700;
}
.tip {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: #5a726d;
}
</style>
