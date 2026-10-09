<template>
  <view class="page">
    <view class="nav">
      <text class="back" @click="handleBack">← 返回</text>
      <text class="title">SHUKE认证</text>
      <text class="skip"></text>
    </view>

    <!-- 已通过状态 -->
    <view v-if="userVerified" class="card verified">
      <!--<view class="status-icon"></view>-->
      <text class="status-title">认证通过</text>
      <button class="btn primary" @click="handleBack">返回个人中心</button>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loading" class="card loading">
      <text>正在获取题目…</text>
    </view>

    <!-- 题目 -->
    <view v-else class="card">
      <text class="question-label">问题</text>
      <text class="question-text">{{ question?.question || '题目加载失败' }}</text>

      <view class="answer-row">
        <input
          v-model="answer"
          class="answer-input"
          type="text"
          :placeholder="submitting ? '提交中…' : '请输入你的答案'"
          :disabled="submitting"
          confirm-type="send"
          @confirm="handleSubmit"
        />
        <button
          class="btn primary submit-btn"
          :disabled="!answer.trim() || submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '…' : '提交' }}
        </button>
      </view>

      <text v-if="msg" :class="['msg', msgType]">{{ msg }}</text>

      <button class="btn link" @click="refreshQuestion">换一题</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { fetchRandomQuestion, submitAnswer } from '../../common/api/verification'
import { useAuth } from '../../common/store/auth'

const { user, refreshMe } = useAuth()

const loading = ref(false)
const submitting = ref(false)
const question = ref(null)
const answer = ref('')
const msg = ref('')
const msgType = ref('') // 'correct' | 'wrong' | 'error'

const userVerified = computed(() => user.value && user.value.isVerified === true)

async function loadQuestion() {
  loading.value = true
  msg.value = ''
  msgType.value = ''
  try {
    question.value = await fetchRandomQuestion()
  } catch (e) {
    // 已通过SHUKE认证回业务异常，userVerified computed 会处理
    question.value = null
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!question.value || submitting.value) return
  if (!answer.value.trim()) return

  submitting.value = true
  msg.value = ''
  try {
    const res = await submitAnswer(question.value.id, answer.value)
    if (res && res.correct) {
      msg.value = '🎉 恭喜你，SHUKE认证已通过'
      msgType.value = 'correct'
      // 刷新本地用户状态 → isVerified 变 true
      await refreshMe()
    } else {
      msg.value = '答案不对，再想想～'
      msgType.value = 'wrong'
    }
  } catch (e) {
    msg.value = e?.message || '提交失败，请重试'
    msgType.value = 'error'
  } finally {
    submitting.value = false
  }
}

async function refreshQuestion() {
  answer.value = ''
  await loadQuestion()
}

function handleBack() {
  // 小程序：navigateBack；H5：hash 回退
  if (typeof uni !== 'undefined' && uni.navigateBack) {
    uni.navigateBack({ delta: 1 })
  } else if (window.history.length > 1) {
    window.history.back()
  }
}

// 进来时自动加载
loadQuestion()
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7f5;
  padding: 16px;
  box-sizing: border-box;
}
.nav {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.back { font-size: 14px; color: #14665b; }
.title { font-size: 17px; font-weight: 600; color: #1a2e2a; }
.skip { flex: 1; }

.card {
  background: #fff;
  border-radius: 12px;
  padding: 24px 20px;
  box-shadow: 0 2px 8px rgba(20,102,91,.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card.loading {
  align-items: center;
  color: #5a726d;
}

/* 问题展示 */
.question-label {
  font-size: 12px;
  color: #5a726d;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.question-text {
  font-size: 18px;
  color: #1a2e2a;
  font-weight: 600;
  line-height: 1.5;
}

/* 答案输入行 */
.answer-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
  margin-top: 8px;
}
.answer-input {
  flex: 1;
  border: 1px solid #d0d0c8;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 15px;
  color: #1a2e2a;
}
.submit-btn {
  flex-shrink: 0;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

/* 提示消息 */
.msg {
  font-size: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  font-weight: 500;
}
.msg.correct { background: #e8f4e0; color: #27ae60; }
.msg.wrong { background: #fdecea; color: #b33a2e; }
.msg.error { background: #f0efea; color: #5a726d; }

/* 按钮 */
.btn {
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn.primary { background: #14665b; color: #fff; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn.link {
  background: none;
  color: #14665b;
  font-weight: 500;
  margin-top: 4px;
}

/* 已通过状态 */
.card.verified {
  align-items: center;
  text-align: center;
  padding: 40px 24px;
}
.status-icon {
  font-size: 48px;
  margin-bottom: 8px;
}
.status-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a2e2a;
}
.status-desc {
  font-size: 14px;
  color: #5a726d;
  margin-bottom: 8px;
}
</style>
