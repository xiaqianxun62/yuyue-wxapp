<script setup>
import { nextTick, onLoad, onUnload, ref } from 'vue'
import { AVATAR_COLORS, randomUid } from '../../common/util'

/**
 * 临时聊天室：后端暂无聊天接口，此处与官网一致，用内存变量模拟，
 * 页面卸载后消息不保留。
 */
const NICKNAMES = ['高远:', '网前雨', '反手无力', '杀球小王子', '三号场常客', '搓大师']
const REPLIES = [
  '明晚三号场有人吗？',
  '我右手抽球还需要提高，谁来陪练？',
  '刚打完，累并快乐着。',
  '有没有女双缺人的？',
  '想约一个势均力敌的对手。',
  '我带两筒球，谁要？',
  '刚被拉了 400 分，认输。',
  '周末早场 9 点有人吗？',
]

const SEED = [
  { id: 1, self: false, author: '高远球', text: '今晚有人打吗？三号场。', time: '19:02' },
  { id: 2, self: false, author: '搓球大师', text: '我八点到，算我一个。', time: '19:04' },
]

const nick = ref('')
const messages = ref(SEED.map((m) => ({ ...m })))
const input = ref('')
const scrollTop = ref(0)
let seq = SEED.length
let timer = null

onLoad((options) => {
  nick.value = options.nick || `球友#${randomUid()}`
})

timer = setInterval(() => {
  onMessage({
    author: NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)],
    text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
  })
}, 12000)

onUnload(() => {
  if (timer) clearInterval(timer)
})

async function onMessage(msg) {
  seq += 1
  messages.value.push({
    id: seq,
    self: !!msg.self,
    author: msg.author,
    text: msg.text,
    time: msg.time || nowText(),
  })
  await nextTick()
  scrollTop.value = messages.value.length * 100
}

function nowText() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function send() {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  onMessage({ self: true, author: nick.value, text })

  // 模拟自动回复：1-3 秒后有球友接话
  const delay = 1000 + Math.floor(Math.random() * 2000)
  setTimeout(() => {
    onMessage({
      author: NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)],
      text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
    })
  }, delay)
}

function colorOf(name) {
  let sum = 0
  for (let i = 0; i < name.length; i += 1) {
    sum += name.charCodeAt(i)
  }
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}
</script>

<template>
  <view class="page">
    <view class="bar">
      <view class="bar-left">
        <text class="bar-title">临时聊天室</text>
        <text class="bar-badge">临时会话 · 不保存</text>
      </view>
      <text class="bar-nick">我是 {{ nick }}</text>
    </view>

    <scroll-view class="body" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view v-for="msg in messages" :key="msg.id" :class="['msg', { self: msg.self }]">
        <view class="avatar" :style="{ background: colorOf(msg.author) }">{{ msg.author.charAt(0) }}</view>
        <view class="bubble">
          <text class="author" v-if="!msg.self">{{ msg.author }} · {{ msg.time }}</text>
          <text class="text">{{ msg.text }}</text>
        </view>
      </view>
      <view class="gap"></view>
    </scroll-view>

    <view class="composer">
      <input class="input" v-model="input" placeholder="说点什么…" confirm-type="send" @confirm="send" />
      <view class="send-btn" @click="send">发送</view>
    </view>

    <view class="foot">消息仅本次会话展示，关闭后不保留任何记录</view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #faf7f0;
}
.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #14665b;
  color: #faf7f0;
}
.bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bar-title {
  font-size: 15px;
  font-weight: 800;
}
.bar-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5c84b;
  color: #1a2e2a;
  font-size: 10px;
  font-weight: 700;
}
.bar-nick {
  font-size: 11px;
  opacity: 0.9;
}
.body {
  flex: 1;
  padding: 14px 14px 0;
  box-sizing: border-box;
}
.msg {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.msg.self {
  flex-direction: row-reverse;
}
.avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
}
.bubble {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  padding: 9px 12px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e3e8e6;
}
.msg.self .bubble {
  background: #14665b;
  border-color: #14665b;
}
.author {
  margin-bottom: 3px;
  font-size: 10px;
  color: #5a726d;
}
.msg.self .author {
  color: rgba(250, 247, 240, 0.75);
}
.msg.self .text {
  color: #faf7f0;
}
.text {
  font-size: 14px;
  line-height: 1.6;
  color: #1a2e2a;
}
.gap {
  height: 8px;
}
.composer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #e3e8e6;
  background: #ffffff;
}
.input {
  flex: 1;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #e3e8e6;
  border-radius: 19px;
  background: #faf7f0;
  font-size: 14px;
}
.send-btn {
  height: 38px;
  line-height: 38px;
  padding: 0 18px;
  border-radius: 19px;
  background: #e5c84b;
  color: #1a2e2a;
  font-size: 14px;
  font-weight: 700;
}
.foot {
  flex-shrink: 0;
  padding: 8px 0 10px;
  text-align: center;
  font-size: 10px;
  color: #5a726d;
  background: #ffffff;
}
</style>
