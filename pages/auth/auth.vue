<script setup>
import { ref } from 'vue'
import { DEPARTMENTS, toastError } from '../../common/util'
import { useAuth } from '../../common/store/auth'
// 本页有同名的 tab 切换函数 switchTab，页面跳转的重命名为 switchTabPage
import { navigateBack, switchTab as switchTabPage } from '../../common/nav'

const { submitting, login, register, loginWithWechat } = useAuth()

const tab = ref('login')
const DEPARTMENT_INDEX = DEPARTMENTS.indexOf('计算机学院')

const form = ref({
  studentNo: '',
  password: '',
  name: '',
  gender: 1,
  college: '计算机学院',
})
const agree = ref(true)

function switchTab(next) {
  tab.value = next
}

function pickGender(value) {
  form.value.gender = value
}

function onCollegeChange(evt) {
  form.value.college = DEPARTMENTS[Number(evt.detail.value)]
}

async function wechatLogin() {
  if (!agree.value) {
    uni.showToast({ title: '请先勾选同意用户协议', icon: 'none' })
    return
  }
  try {
    const res = await loginWithWechat()
    uni.showToast({
      title: res.newUser ? '已创建账号，去完善资料' : '登录成功',
      icon: 'success',
    })
    setTimeout(() => {
      if (res.newUser) {
        switchTabPage('/pages/mine/mine')
      } else {
        navigateBack()
      }
    }, 600)
  } catch (e) {
    toastError(e, '微信登录失败')
  }
}

async function submit() {
  if (!agree.value) {
    uni.showToast({ title: '请先勾选同意用户协议', icon: 'none' })
    return
  }
  if (!form.value.studentNo || !form.value.password) {
    uni.showToast({ title: '请填写学号与密码', icon: 'none' })
    return
  }
  if (tab.value === 'register' && !form.value.name) {
    uni.showToast({ title: '请填写姓名', icon: 'none' })
    return
  }
  try {
    if (tab.value === 'login') {
      await login({ studentNo: form.value.studentNo, password: form.value.password })
    } else {
      await register({
        studentNo: form.value.studentNo,
        name: form.value.name,
        gender: Number(form.value.gender),
        college: form.value.college,
        password: form.value.password,
      })
    }
    uni.showToast({ title: tab.value === 'login' ? '登录成功' : '注册成功', icon: 'success' })
    setTimeout(() => {
      navigateBack()
    }, 600)
  } catch (e) {
    toastError(e, tab.value === 'login' ? '登录失败' : '注册失败')
  }
}
</script>

<template>
  <view class="page">
    <view class="head">
      <view class="head-title">数羽 SHUYU</view>
      <view class="head-sub">学号认证后，即可发布与报名球局</view>
    </view>

    <view class="tabs">
      <view :class="['tab', { active: tab === 'login' }]" @click="switchTab('login')">登录</view>
      <view :class="['tab', { active: tab === 'register' }]" @click="switchTab('register')">注册</view>
    </view>

    <view class="form">
      <view class="field">
        <text class="label">学号</text>
        <uni-easyinput v-model="form.studentNo" placeholder="请输入学号" />
      </view>
      <view class="field">
        <text class="label">密码</text>
        <uni-easyinput type="password" v-model="form.password" placeholder="请输入密码" />
      </view>

      <template v-if="tab === 'register'">
        <view class="field">
          <text class="label">姓名</text>
          <uni-easyinput v-model="form.name" placeholder="请输入真实姓名" />
        </view>
        <view class="field">
          <text class="label">性别</text>
          <view class="gender">
            <view :class="['gender-item', { active: form.gender === 1 }]" @click="pickGender(1)">男</view>
            <view :class="['gender-item', { active: form.gender === 2 }]" @click="pickGender(2)">女</view>
          </view>
        </view>
        <view class="field">
          <text class="label">学院</text>
          <picker mode="selector" :range="DEPARTMENTS" :value="DEPARTMENT_INDEX" @change="onCollegeChange">
            <view class="picker">{{ form.college }}</view>
          </picker>
        </view>
      </template>

      <view class="agree">
        <switch :checked="agree" color="#14665B" @change="agree = $event.detail.value" />
        <text class="agree-text">我已阅读并同意《用户协议》与《隐私政策》</text>
      </view>

      <button class="submit" type="button" :loading="submitting" @click="submit">
        {{ tab === 'login' ? '登录' : '注册并开始' }}
      </button>

      <view class="divider">
        <view class="line"></view>
        <text class="divider-text">或</text>
        <view class="line"></view>
      </view>
      <button class="wx-btn" type="button" :loading="submitting" @click="wechatLogin">
        微信一键登录
      </button>
      <view class="wx-tip">使用微信账号快速进入，无需学号密码</view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf7f0;
  padding-bottom: 40px;
}
.head {
  padding: 28px 20px 22px;
  background: #14665b;
  color: #faf7f0;
}
.head-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
}
.head-sub {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.9;
}
.tabs {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
}
.tab {
  padding: 6px 18px;
  border: 1px solid #e3e8e6;
  border-radius: 999px;
  background: #ffffff;
  color: #5a726d;
  font-size: 13px;
  font-weight: 600;
}
.tab.active {
  background: #14665b;
  border-color: #14665b;
  color: #faf7f0;
}
.form {
  padding: 0 20px;
}
.field {
  margin-bottom: 14px;
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
.agree {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0 18px;
}
.agree-text {
  font-size: 11px;
  color: #5a726d;
}
.submit {
  height: 44px;
  line-height: 44px;
  border: none;
  border-radius: 10px;
  background: #e5c84b;
  color: #1a2e2a;
  font-size: 15px;
  font-weight: 700;
}
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0;
}
.divider .line {
  flex: 1;
  height: 1px;
  background: #e3e8e6;
}
.divider-text {
  font-size: 11px;
  color: #5a726d;
}
.wx-btn {
  height: 44px;
  line-height: 44px;
  border: none;
  border-radius: 10px;
  background: #14665b;
  color: #faf7f0;
  font-size: 15px;
  font-weight: 700;
}
.wx-tip {
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  color: #5a726d;
}
</style>
