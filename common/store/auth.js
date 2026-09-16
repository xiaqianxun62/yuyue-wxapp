import { computed, ref } from 'vue'
import * as authApi from '../api/auth'
import { clearToken, getToken, setToken } from '../api/request'
import { randomUid } from '../util'

/**
 * 全局登录状态。
 * 模块级 ref 单例：任何页面调用 useAuth() 拿到的都是同一份状态。
 */

const USER_KEY = 'shuyu_user'

function readCachedUser() {
  try {
    const raw = uni.getStorageSync(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

const user = ref(readCachedUser())
const submitting = ref(false)
/** 首次 token 校验是否完成（避免启动闪一下未登录态） */
const restored = ref(false)

/** 落盘时只存用户资料，token 由 request 层单独管理 */
function persist(next) {
  user.value = next
  if (next) {
    uni.setStorageSync(
      USER_KEY,
      JSON.stringify({
        token: null,
        userId: next.userId,
        name: next.name,
        gender: next.gender,
        college: next.college,
        rating: next.rating,
        gamesPlayed: next.gamesPlayed,
      }),
    )
  } else {
    uni.removeStorageSync(USER_KEY)
  }
}

function accept(result) {
  if (result.token) {
    setToken(result.token)
  }
  persist(result)
  return result
}

async function login(payload) {
  submitting.value = true
  try {
    return accept(await authApi.login(payload))
  } finally {
    submitting.value = false
  }
}

async function register(payload) {
  submitting.value = true
  try {
    return accept(await authApi.register(payload))
  } finally {
    submitting.value = false
  }
}

/**
 * 取微信登录 code。
 * 没有 appid / 开发者工具不支持时降级成 mock code（后端 WX_MOCK_ENABLED=true 时可用），
 * 保证没有小程序账号也能联调。
 */
function getWxCode() {
  return new Promise((resolve) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res && res.code) {
          resolve(res.code)
        } else {
          resolve(mockCode())
        }
      },
      fail: () => resolve(mockCode()),
    })
  })
}

function mockCode() {
  let id = ''
  try {
    id = uni.getStorageSync('shuyu_devid') || ''
  } catch (e) {
    id = ''
  }
  if (!id) {
    id = 'mock_' + randomUid(8)
    uni.setStorageSync('shuyu_devid', id)
  }
  return id
}

/** 微信一键登录 */
async function loginWithWechat(nickName) {
  submitting.value = true
  try {
    const code = await getWxCode()
    return accept(await authApi.wxLogin({ code, nickName }))
  } finally {
    submitting.value = false
  }
}

/** 完善资料后同步本地缓存 */
function applyProfile(profile) {
  if (user.value) {
    persist({ ...user.value, ...profile })
  }
}

async function logout() {
  try {
    // 让后端把 token 拉黑；即便失败也必须清本地，不能把用户卡在登录态
    if (getToken()) {
      await authApi.logout()
    }
  } catch (e) {
    /* 忽略：本地登出一定要成功 */
  } finally {
    clearToken()
    persist(null)
  }
}

/** 应用启动时用本地 token 换一次用户信息；token 失效则静默登出 */
async function restore() {
  if (restored.value) {
    return
  }
  restored.value = true
  if (!getToken()) {
    persist(null)
    return
  }
  try {
    const me = await authApi.fetchMe()
    persist({ ...me, token: null })
  } catch (e) {
    clearToken()
    persist(null)
  }
}

export function useAuth() {
  return {
    user,
    isLoggedIn: computed(() => user.value !== null),
    submitting,
    restored,
    login,
    register,
    loginWithWechat,
    applyProfile,
    logout,
    restore,
  }
}
