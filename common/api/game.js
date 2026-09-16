import { request } from './request'

/**
 * 球局状态：0 报名中 1 已编排 2 已结束（见后端 Constants）
 */
export const GAME_STATUS = {
  0: { text: '报名中', type: 'primary' },
  1: { text: '已编排', type: 'warning' },
  2: { text: '已结束', type: 'default' },
}

/**
 * 对阵形式：1 单打 2 男双 3 女双 4 混双 5 随机双打（见后端 Constants）
 */
export const MATCH_FORMAT = {
  1: '单打',
  2: '男双',
  3: '女双',
  4: '混双',
  5: '随机双打',
}

/**
 * 编排方案：与后端 ArrangeEngine 方案编号一致
 */
export const ARRANGE_SCHEMES = [
  { id: 0, name: '自动', desc: '按报名性别构成自动选择' },
  { id: 1, name: '全单打', desc: '按积分强 vs 弱，单打对决' },
  { id: 2, name: '全混双', desc: '一男一女组队，积分蛇形配对' },
  { id: 3, name: '全男双', desc: '男生蛇形组队两两对阵' },
  { id: 4, name: '全女双', desc: '女生蛇形组队两两对阵' },
  { id: 5, name: '混搭·混双优先', desc: '混双为主，男多时含男双局' },
  { id: 6, name: '混搭·同性别优先', desc: '男双 + 女双，男女互不混合' },
  { id: 7, name: '混双·纯随机', desc: '随机男女组队、随机对阵' },
  { id: 8, name: '全随机', desc: '不分性别随机组队对阵' },
]

export function listGames() {
  return request('/games')
}

export function getGame(id) {
  return request(`/games/${id}`)
}

/** 匿名报名：写入报名并投递 Kafka，由 clawbot 同步微信群接龙 */
export function registerGame(id) {
  return request(`/games/${id}/register`, { method: 'POST' })
}

/**
 * 自动编排
 * @param {number} id 球局 id
 * @param {{ schemeId?: number, roundRobin?: boolean }} [options] schemeId 传 0 或不传 = 自动选择方案
 */
export function arrangeGame(id, options) {
  const body = {}
  if (options && options.schemeId) body.schemeId = options.schemeId
  if (options && options.roundRobin) body.roundRobin = true
  return request(`/games/${id}/arrange`, { method: 'POST', body })
}

/**
 * @param {{ title: string, location?: string, playDate: string, startTime: string, endTime?: string, maxPlayers?: number }} payload
 */
export function createGame(payload) {
  return request('/games', { method: 'POST', body: payload })
}
