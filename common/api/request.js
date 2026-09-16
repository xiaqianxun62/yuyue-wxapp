/**
 * 统一请求层：把后端 ApiResponse{code,message,data} 解包成业务数据。
 * 约定：HTTP 状态码始终是 200，code === 0 才算成功（见后端 GlobalExceptionHandler）。
 */

/**
 * 后端地址。
 * 真机/体验版请改成 https 域名；开发者工具里勾选「不校验合法域名」才能访问 http。
 */
export const BASE_URL = 'http://localhost:8080'

const TOKEN_KEY = 'shuyu_token'

export function getToken() {
  try {
    return uni.getStorageSync(TOKEN_KEY) || null
  } catch (e) {
    return null
  }
}

export function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function clearToken() {
  uni.removeStorageSync(TOKEN_KEY)
}

/** 业务异常：带后端错误码，便于上层区分「学号已注册」「密码错误」等场景 */
export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/**
 * @param {string} path 以 / 开头的接口路径
 * @param {{ method?: string, body?: object }} options
 * @returns {Promise<any>}
 */
export function request(path, options = {}) {
  const token = getToken()
  const header = {}
  if (token) {
    header.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + path,
      method: options.method || 'GET',
      data: options.body,
      header,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new ApiError(res.statusCode, `请求失败（HTTP ${res.statusCode}）`))
          return
        }
        const payload = res.data || {}
        if (payload.code !== 0) {
          // token 失效：清掉本地凭证，避免后续请求继续 401
          if (payload.code === 401) {
            clearToken()
          }
          reject(new ApiError(payload.code, payload.message || '请求失败'))
          return
        }
        resolve(payload.data)
      },
      fail: () => {
        reject(new ApiError(-1, `无法连接服务器，请确认后端已启动（${BASE_URL}）`))
      },
    })
  })
}
