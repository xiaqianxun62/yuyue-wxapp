import { request } from './request'

/**
 * 轮排试算：传入球员名单、场地数、轮数，返回逐轮对阵与统计（不落库）
 * @param {{ players: Array, courts: number, rounds: number, format: number, balanceStrength?: boolean }} payload
 */
export function planRotation(payload) {
  return request('/rotation/plan', { method: 'POST', body: payload })
}

/**
 * 按真实球局的报名名单轮排
 * @param {number} gameId
 * @param {{ courts: number, rounds: number, format: number, balanceStrength?: boolean }} payload
 */
export function planRotationForGame(gameId, payload) {
  return request(`/rotation/game/${gameId}`, { method: 'POST', body: payload })
}
