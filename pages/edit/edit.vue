<script setup>
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getGame, updateGame, uploadCover } from '../../common/api/game'
import { listCourts } from '../../common/api/court'
import { TIME_SLOTS, toastError, resolveUrl } from '../../common/util'
import { useAuth } from '../../common/store/auth'
import { navigateTo } from '../../common/nav'

const { isLoggedIn } = useAuth()

const DEFAULT_MAX = 8

/** 两种发布模式：0 预报名（定时间地点） 1 现场报名（只约人数与场地） */
const MODES = [
  { id: 0, name: '预报名', desc: '定好时间地点，提前约人' },
  { id: 1, name: '现场报名', desc: '只约人数与场地，人齐后现场编排' },
]

/** 编辑专用页：isEdit 永远是 true（由 detail 跳转过来必带 id） */
const isEdit = ref(true)
const editingId = ref(0)

const form = ref({
  mode: 0,
  title: '',
  location: '',
  courtId: null,
  playDate: '',
  startTime: '',
  endTime: '',
  maxPlayers: DEFAULT_MAX,
  courtCount: 2,
  cover: '',
})
const coverPreview = ref('')
const uploadingCover = ref(false)
const submitting = ref(false)

/** 现场报名的球局没有时间地点，人齐了现场开打 */
const isOnsite = computed(() => form.value.mode === 1)

/** 球场字典（下拉框数据源） */
const courts = ref([])
const showCourtSheet = ref(false)
const customLocation = ref('')
const showOtherModal = ref(false)

async function loadCourts() {
  try {
    courts.value = await listCourts()
  } catch (e) {
    courts.value = []
  }
}
onMounted(loadCourts)

function openCourtSheet() { showCourtSheet.value = true }
function closeCourtSheet() { showCourtSheet.value = false }

function pickCourt(index) {
  showCourtSheet.value = false
  if (index === courts.value.length) {
    customLocation.value = form.value.location && !courts.value.some((c) => c.name === form.value.location)
      ? form.value.location : ''
    showOtherModal.value = true
    form.value.courtId = null
  } else {
    form.value.location = courts.value[index].name
    form.value.courtId = courts.value[index].id
  }
}

function confirmCustomLocation() {
  const v = (customLocation.value || '').trim()
  if (!v) { toastError(new Error('请填写场地名称'), '提示'); return }
  form.value.location = v
  form.value.courtId = null
  showOtherModal.value = false
}

function cancelCustomLocation() {
  showOtherModal.value = false
  if (!customLocation.value.trim()) { form.value.location = ''; form.value.courtId = null }
}

/** URL 必须带 id → 拉详情回填 */
onLoad(async (options) => {
  const id = Number(options && options.id)
  if (!id) {
    toastError(new Error('缺少球局 ID'), '参数错误')
    setTimeout(() => uni.navigateBack(), 500)
    return
  }
  editingId.value = id
  try {
    const g = await getGame(id)
    uni.setNavigationBarTitle({ title: `编辑 · ${g.title || '球局'}` })
    form.value.mode = g.mode ?? 0
    form.value.title = g.title ?? ''
    form.value.location = g.location ?? ''
    form.value.courtId = g.courtId ?? null
    form.value.playDate = g.playDate ?? form.value.playDate
    form.value.startTime = (g.startTime || '').slice(0, 5) || form.value.startTime
    form.value.endTime = (g.endTime || '').slice(0, 5) || form.value.endTime
    form.value.maxPlayers = g.maxPlayers ?? DEFAULT_MAX
    form.value.courtCount = g.courtCount ?? 2
    form.value.cover = g.cover ?? ''
    coverPreview.value = g.cover ? resolveUrl(g.cover) : ''
  } catch (e) {
    toastError(e, '加载球局失败')
    setTimeout(() => uni.navigateBack(), 500)
  }
})

const canSubmit = computed(() => {
  if (!form.value.title) return false
  return isOnsite.value ? true : !!form.value.playDate && !!form.value.startTime
})

function pickMode(id) {
  form.value.mode = id
}

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

/** 选封面 */
async function pickCover() {
  if (uploadingCover.value) return
  try {
    const { tempFilePaths } = await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      })
    })
    const file = tempFilePaths && tempFilePaths[0]
    if (!file) return
    coverPreview.value = file
    uploadingCover.value = true
    const url = await uploadCover(file)
    form.value.cover = url
    uni.showToast({ title: '封面已上传', icon: 'success' })
  } catch (e) {
    toastError(e, '封面上传失败（可跳过）')
    coverPreview.value = ''
    form.value.cover = ''
  } finally {
    uploadingCover.value = false
  }
}

function removeCover() {
  coverPreview.value = ''
  form.value.cover = ''
}

async function submit() {
  if (!isLoggedIn.value) {
    navigateTo('/pages/auth/auth')
    return
  }
  if (!canSubmit.value) {
    uni.showToast({
      title: isOnsite.value ? '请填写球局标题' : '请填写标题、日期与开始时间',
      icon: 'none',
    })
    return
  }
  submitting.value = true
  try {
    const payload = {
      title: form.value.title,
      mode: form.value.mode,
      maxPlayers: Number(form.value.maxPlayers),
      courtCount: Number(form.value.courtCount),
    }
    if (form.value.cover) payload.cover = form.value.cover
    if (!isOnsite.value) {
      payload.playDate = form.value.playDate
      payload.startTime = `${form.value.startTime}:00`
      if (form.value.endTime) payload.endTime = `${form.value.endTime}:00`
    }
    if (form.value.location) payload.location = form.value.location
    await updateGame(editingId.value, payload)
    uni.showToast({ title: '球局已修改', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    toastError(e, '修改失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <scroll-view class="body" scroll-y>
      <view class="section">
        <view class="label">发布模式</view>
        <view class="modes">
          <view
            v-for="m in MODES"
            :key="m.id"
            :class="['mode', { active: form.mode === m.id }]"
            hover-class="mode-hv"
            hover-stay-time="120"
            @click="pickMode(m.id)"
          >
            <text class="mode-name">{{ m.name }}</text>
            <text class="mode-desc">{{ m.desc }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="label">球局标题</view>
        <uni-easyinput
          v-model="form.title"
          :placeholder="isOnsite ? '例如：临时双打局 · 人齐就开' : '例如：周末双打局 · 新手友好'"
          :maxlength="30"
        />
      </view>

      <view class="section">
        <view class="label">封面图 <text class="optional">（可选）</text></view>
        <view class="cover-picker" @click="pickCover">
          <image
            v-if="coverPreview || form.cover"
            class="cover-preview"
            :src="coverPreview || resolveUrl(form.cover)"
            mode="aspectFill"
          />
          <view v-else class="cover-placeholder">
            <text class="cover-plus">+</text>
            <text class="cover-hint">{{ uploadingCover ? '上传中…' : '点选球局封面' }}</text>
          </view>
          <view v-if="coverPreview || form.cover" class="cover-remove" @click.stop="removeCover">×</view>
        </view>
        <view class="hint">上传后展示在首页球局卡片顶部；支持 jpg/png/webp/gif，≤ 5MB</view>
      </view>

      <view class="section">
        <view class="label">场地</view>
        <view class="picker-box" @click="openCourtSheet">
          <text v-if="form.location" class="picker-selected">{{ form.location }}</text>
          <text v-else class="picker-placeholder">请选择球场场地</text>
          <text class="picker-arrow">▾</text>
        </view>
        <view class="hint">如需新增场地，请联系管理员在后台添加</view>
      </view>

      <view v-if="!isOnsite" class="section">
        <view class="label">日期</view>
        <uni-datetime-picker type="date" v-model="form.playDate" :clear-icon="false" />
      </view>

      <view v-if="!isOnsite" class="section">
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
        <uni-number-box v-model="form.maxPlayers" :min="4" :max="24" />
      </view>

      <view class="section">
        <view class="label">场地数量</view>
        <uni-number-box v-model="form.courtCount" :min="1" :max="10" />
        <view class="hint">同时开几片场地，现场编排后按场地轮转上场</view>
      </view>

      <button class="submit" type="button" :loading="submitting" @click="submit">
        保存修改
      </button>
      <view class="tip">
        仅可修改报名中的球局（已编排/已结束的请联系管理员处理）
      </view>
    </scroll-view>

    <!-- 场地选择底部弹层 -->
    <view v-if="showCourtSheet" class="sheet-mask" @click="closeCourtSheet">
      <view class="sheet-drawer" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-title">选择场地</view>
        <scroll-view class="sheet-list" scroll-y>
          <view
            v-for="(c, i) in courts"
            :key="c.id"
            class="sheet-item"
            :class="{ active: form.location === c.name }"
            @click="pickCourt(i)"
          >
            <text class="sheet-item-name">{{ c.name }}</text>
            <text v-if="form.location === c.name" class="sheet-check">✓</text>
          </view>
          <view
            class="sheet-item sheet-item-other"
            :class="{ active: form.location && !courts.some(c => c.name === form.location) }"
            @click="pickCourt(courts.length)"
          >
            <text class="sheet-item-name">其他…</text>
            <text class="sheet-item-sub">手动输入场地名称</text>
          </view>
        </scroll-view>
        <view class="sheet-cancel" @click="closeCourtSheet">取消</view>
      </view>
    </view>

    <!-- "其他"场地输入弹框 -->
    <view v-if="showOtherModal" class="other-mask" @click="cancelCustomLocation">
      <view class="other-modal" @click.stop>
        <view class="other-title">自定义场地</view>
        <input class="other-input" v-model="customLocation" placeholder="例如：XX羽毛球馆" maxlength="64" focus />
        <view class="other-actions">
          <button class="other-btn cancel" type="button" @click="cancelCustomLocation">取消</button>
          <button class="other-btn confirm" type="button" @click="confirmCustomLocation">确定</button>
        </view>
      </view>
    </view>
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
.modes {
  display: flex;
  gap: 10px;
}
.mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 12px;
  border: 1px solid #e3e8e6;
  border-radius: 12px;
  background: #ffffff;
}
.mode.active {
  border-color: #14665b;
  background: #e0f1ec;
}
.mode-hv {
  opacity: 0.82;
}
.mode-name {
  font-size: 14px;
  font-weight: 700;
  color: #1a2e2a;
}
.mode-desc {
  font-size: 11px;
  color: #5a726d;
  line-height: 1.4;
}
.hint {
  margin-top: 8px;
  font-size: 11px;
  color: #5a726d;
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
.optional {
  font-weight: 400;
  color: #8ba8a3;
  font-size: 12px;
}
.cover-picker {
  position: relative;
  width: 100%;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  border: 1.5px dashed #b8cfc9;
  background: #f1f5f3;
}
.cover-preview {
  width: 100%;
  height: 100%;
  display: block;
}
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #5a726d;
}
.cover-plus {
  font-size: 28px;
  line-height: 1;
  color: #8ba8a3;
}
.cover-hint {
  font-size: 12px;
}
.cover-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 16px;
  line-height: 20px;
  text-align: center;
}
.picker-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: 1px solid #e3e8e6;
  border-radius: 8px;
  background: #ffffff;
}
.picker-selected { font-size: 14px; color: #1a2e2a; }
.picker-placeholder { font-size: 14px; color: #8ba8a3; }
.picker-arrow { font-size: 12px; color: #5a726d; }

/* 底部弹层 */
.sheet-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  z-index: 999;
  display: flex; align-items: flex-end;
}
.sheet-drawer {
  width: 100%;
  background: #fff;
  border-radius: 20rpx 20rpx 0 0;
  padding: 20rpx 32rpx 40rpx;
  max-height: 70vh;
  display: flex; flex-direction: column;
  animation: sheetUp .25s ease-out;
}
@keyframes sheetUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.sheet-handle {
  width: 72rpx; height: 8rpx; background: #e0e8e5;
  border-radius: 4rpx; margin: 0 auto 20rpx;
}
.sheet-title {
  font-size: 30rpx; font-weight: 700; color: #1a2e2a;
  text-align: center; padding: 8rpx 0 20rpx;
  border-bottom: 1rpx solid #eef3f1;
}
.sheet-list { flex: 1; padding: 8rpx 0; }
.sheet-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 26rpx 16rpx;
  border-bottom: 1rpx solid #f3f6f5;
  transition: background .15s;
}
.sheet-item:active { background: #f1f7f5; }
.sheet-item-name { font-size: 28rpx; color: #1a2e2a; }
.sheet-item.active .sheet-item-name { color: #2d7a66; font-weight: 700; }
.sheet-check { color: #2d7a66; font-size: 30rpx; font-weight: 700; }
.sheet-item-other { flex-direction: column; align-items: flex-start; gap: 4rpx; }
.sheet-item-other .sheet-item-name { color: #5a726d; }
.sheet-item-sub { font-size: 22rpx; color: #9db5b0; }
.sheet-cancel {
  text-align: center; padding: 24rpx 0; margin-top: 16rpx;
  font-size: 28rpx; color: #5a726d;
  background: #f4f7f6; border-radius: 12rpx;
}
.sheet-cancel:active { background: #e6ecea; }

/* "其他"弹框 */
.other-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.other-modal {
  width: 80%; max-width: 320px; background: #fff; border-radius: 12px; padding: 20px;
}
.other-title { font-size: 15px; font-weight: 700; color: #1a2e2a; margin-bottom: 14px; }
.other-input {
  width: 100%; padding: 10px 12px; border: 1px solid #e3e8e6; border-radius: 8px;
  font-size: 14px; box-sizing: border-box;
}
.other-actions {
  display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end;
}
.other-btn {
  border: none; border-radius: 8px; padding: 7px 18px; font-size: 13px; font-weight: 600;
}
.other-btn.cancel { background: #f0efea; color: #5a726d; }
.other-btn.confirm { background: #14665b; color: #fff; }
</style>
