import { request } from './request'

/**
 * 积分榜 Top N：官网与小程序同源，读 Redis ZSet
 * @param {number} n
 */
export function fetchRanking(n = 20) {
  return request(`/ranking?n=${n}`)
}
