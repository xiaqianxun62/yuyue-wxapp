import { request } from './request'

/**
 * @typedef {Object} AuthResult
 * @property {string|null} token 仅注册、登录时返回；/auth/me 返回 null
 * @property {number} userId
 * @property {string} name
 * @property {number} gender 1男 2女 0未知
 * @property {string|null} college
 * @property {number} rating
 * @property {number} gamesPlayed
 */

/** @param {{ studentNo: string, password: string }} payload */
export function login(payload) {
  return request('/auth/login', { method: 'POST', body: payload })
}

/** @param {{ studentNo: string, name: string, gender: number, college?: string, password: string }} payload */
export function register(payload) {
  return request('/auth/register', { method: 'POST', body: payload })
}

/**
 * 微信小程序登录：code → openid → JWT
 * @param {{ code: string, nickName?: string, avatarUrl?: string }} payload
 */
export function wxLogin(payload) {
  return request('/auth/wxlogin', { method: 'POST', body: payload })
}

/**
 * 完善资料：微信用户补充姓名 / 性别 / 学院 / 学号
 * @param {{ name?: string, gender?: number, college?: string, studentNo?: string }} payload
 */
export function updateProfile(payload) {
  return request('/auth/profile', { method: 'POST', body: payload })
}

export function fetchMe() {
  return request('/auth/me')
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}
