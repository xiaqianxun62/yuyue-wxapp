<script setup>
import { ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { updateProfile } from '../../common/api/auth'
import { DEPARTMENTS, genderText, randomUid, toastError } from '../../common/util'
import { useAuth } from '../../common/store/auth'
import { navigateTo, switchTab } from '../../common/nav'

const { user, isLoggedIn, logout, restore, applyProfile } = useAuth()

/** 资料编辑：微信首次登录的用户没有姓名学号，在这里补齐 */
const profileForm = ref({ name: '', gender: 0, college: '计算机学院' })
const saving = ref(false)

watch(
  user,
  (u) => {
    if (u) {
      profileForm.value = {
        name: u.name || '',
        gender: u.gender || 0,
        college: u.college || '计算机学院',
      }
    }
  },
  { immediate: true },
)

onShow(() => {
  restore()
})

async function saveProfile() {
  if (!profileForm.value.name.trim()) {
    uni.showToast({ title: '请填写姓名', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const profile = {
      name: profileForm.value.name.trim(),
      gender: Number(profileForm.value.gender),
      college: profileForm.value.college,
    }
    const updated = await updateProfile(profile)
    applyProfile(updated)
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    toastError(e, '保存失败')
  } finally {
    saving.value = false
  }
}

function onCollegeChange(evt) {
  profileForm.value.college = DEPARTMENTS[Number(evt.detail.value)]
}

function pickGender(value) {
  profileForm.value.gender = value
}

async function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    success: async (res) => {
      if (!res.confirm) return
      await logout()
      uni.showToast({ title: '已退出', icon: 'success' })
    },
  })
}

function goLogin() {
  navigateTo('/pages/auth/auth')
}

function goChat() {
  navigateTo(`/pages/chat/chat?nick=球友#${randomUid()}`)
}

function goElo() {
  switchTab('/pages/elo/elo')
}

function goRotation() {
  navigateTo('/pages/rotation/rotation')
}
</script>

<template>
  <view class="page">
    <view v-if="isLoggedIn && user" class="profile">
      <view class="avatar">{{ user.name.charAt(0) }}</view>
      <view class="name">{{ user.name }}</view>
      <view class="meta">{{ user.college || '未填写学院' }} · {{ genderText(user.gender) }}</view>
      <view class="stats">
        <view class="stat">
          <text class="stat-value">{{ user.rating }}</text>
          <text class="stat-label">ELO 积分</text>
        </view>
        <view class="stat">
          <text class="stat-value">{{ user.gamesPlayed }}</text>
          <text class="stat-label">历史场次</text>
        </view>
      </view>
    </view>

    <view v-else class="guest">
      <view class="guest-title">还没有登录</view>
      <view class="guest-desc">学号注册后即可发布球局、匿名报名、查看 ELO 积分榜</view>
      <button class="primary-btn" type="button" @click="goLogin">登录 / 注册</button>
    </view>

    <view class="menu">
      <view class="item" @click="goRotation">
        <uni-icons type="refresh" size="16" color="#14665B" />
        <text class="item-text">轮排安排</text>
        <text class="arrow">›</text>
      </view>
      <view class="item" @click="goElo">
        <uni-icons type="compose" size="16" color="#14665B" />
        <text class="item-text">ELO 试算实验室</text>
        <text class="arrow">›</text>
      </view>
      <view class="item" @click="goChat">
        <uni-icons type="chatboxes" size="16" color="#14665B" />
        <text class="item-text">临时聊天室</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="isLoggedIn" class="item danger" @click="handleLogout">
        <uni-icons type="close" size="16" color="#9AA8A4" />
        <text class="item-text">退出登录</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <view v-if="isLoggedIn" class="panel">
      <view class="panel-title">完善资料</view>
      <view class="field">
        <text class="label">姓名</text>
        <uni-easyinput v-model="profileForm.name" placeholder="填写真实姓名，便于球友辨认" />
      </view>
      <view class="field">
        <text class="label">性别</text>
        <view class="gender">
          <view :class="['gender-item', { active: profileForm.gender === 1 }]" @click="pickGender(1)">男</view>
          <view :class="['gender-item', { active: profileForm.gender === 2 }]" @click="pickGender(2)">女</view>
        </view>
      </view>
      <view class="field">
        <text class="label">学院</text>
        <picker
          mode="selector"
          :range="DEPARTMENTS"
          :value="DEPARTMENTS.indexOf(profileForm.college)"
          @change="onCollegeChange"
        >
          <view class="picker">{{ profileForm.college }}</view>
        </picker>
      </view>
      <button class="save-btn" type="button" :loading="saving" @click="saveProfile">保存资料</button>
    </view>

    <view class="foot">演示项目 · 数据由后端 yuyue-backend 提供</view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf7f0;
  padding-bottom: 30px;
}
.profile,
.guest {
  padding: 24px 16px 26px;
  text-align: center;
  background: #14665b;
  color: #faf7f0;
}
.avatar {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5c84b;
  color: #1a2e2a;
  font-size: 26px;
  font-weight: 800;
}
.name {
  font-size: 18px;
  font-weight: 800;
}
.meta {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.9;
}
.stats {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.stat {
  flex: 1;
  padding: 12px 8px;
  border: 1px solid rgba(250, 247, 240, 0.35);
  border-radius: 12px;
}
.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 800;
  color: #e5c84b;
}
.stat-label {
  font-size: 11px;
  opacity: 0.85;
}
.guest-title {
  font-size: 18px;
  font-weight: 800;
}
.guest-desc {
  margin: 8px 0 18px;
  font-size: 12px;
  line-height: 1.7;
  opacity: 0.9;
}
.primary-btn {
  height: 42px;
  line-height: 42px;
  border: none;
  border-radius: 10px;
  background: #e5c84b;
  color: #1a2e2a;
  font-size: 15px;
  font-weight: 700;
}
.menu {
  margin: 14px 16px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px;
  border-bottom: 1px solid #f0efea;
}
.item.danger .item-text {
  color: #9aa8a4;
}
.item-text {
  flex: 1;
  font-size: 14px;
  color: #1a2e2a;
}
.arrow {
  font-size: 16px;
  color: #5a726d;
}
.panel {
  margin: 0 16px;
  padding: 14px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  background: #ffffff;
}
.panel-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 800;
  color: #1a2e2a;
}
.field {
  margin-bottom: 12px;
}
.label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #1a2e2a;
}
.gender {
  display: flex;
  gap: 10px;
}
.gender-item {
  flex: 1;
  height: 38px;
  line-height: 38px;
  text-align: center;
  border: 1px solid #e3e8e6;
  border-radius: 8px;
  background: #ffffff;
  color: #5a726d;
  font-size: 14px;
}
.gender-item.active {
  border-color: #14665b;
  background: #e0f1ec;
  color: #14665b;
  font-weight: 700;
}
.picker {
  height: 38px;
  line-height: 38px;
  padding: 0 10px;
  border: 1px solid #e3e8e6;
  border-radius: 8px;
  background: #ffffff;
  font-size: 14px;
  color: #1a2e2a;
}
.save-btn {
  height: 42px;
  line-height: 42px;
  border: 1px solid #14665b;
  border-radius: 10px;
  background: #ffffff;
  color: #14665b;
  font-size: 15px;
  font-weight: 700;
}
.foot {
  margin-top: 20px;
  text-align: center;
  font-size: 11px;
  color: #5a726d;
}
</style>
