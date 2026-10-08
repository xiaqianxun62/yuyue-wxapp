import { request, uploadFile } from './request'
import { toastError } from '../../common/util'

/**
 * 球局状态：0 报名中 1 已编排 2 已结束（见后端 Constants）
 */
export const GAME_STATUS = {
  0: { text: '报名中', type: 'primary' },
  1: { text: '已编排', type: 'warning' },
  2: { text: '已结束', type: 'default' },
}

/**
 * 球局发布模式：0 预报名（定时间地点）1 现场报名（只约人数与场地）
 */
export const GAME_MODE = {
  0: { text: '预报名', desc: '定好时间地点，提前约人' },
  1: { text: '现场报名', desc: '只约人数与场地，人齐后现场编排' },
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

/**
 * 取消报名：删除报名记录并刷新报名计数（仅报名中的球局可取消）
 * @param {number} id 球局 id
 */
export function cancelRegisterGame(id) {
  return request(`/games/${id}/register`, { method: 'DELETE' })
}

/**
 * 报名：写入报名记录并刷新报名计数（统一实名报名）
 * @param {number} id 球局 id
 */
export function registerGame(id) {
  return request(`/games/${id}/register`, {
    method: 'POST',
  })
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
 * 球局对阵（编排结果 + 现场比分）：公开接口，未登录也能看
 * @param {number} id 球局 id
 */
export function getGameMatches(id) {
  return request(`/games/${id}/matches`)
}

/**
 * 现场计分：给编排好的一场对阵录比分，胜方由比分自动判定
 * @param {number} matchId 对阵 id
 * @param {number} scoreA A 队得分
 * @param {number} scoreB B 队得分
 */
export function scoreMatch(matchId, scoreA, scoreB) {
  return request(`/matches/${matchId}/score`, {
    method: 'PUT',
    body: { scoreA: Number(scoreA), scoreB: Number(scoreB) },
  })
}

/**
 * 发布球局
 * @param {{ title: string, mode?: number, location?: string, playDate?: string, startTime?: string,
 *           endTime?: string, maxPlayers?: number, courtCount?: number }} payload
 *   mode = 0 预报名（playDate / startTime 必填）；mode = 1 现场报名（只要 title / maxPlayers / courtCount）
 */
export function createGame(payload) {
  return request('/games', { method: 'POST', body: payload })
}

/**
 * 上传球局封面图（multipart/form-data，文件字段名 file），返回 /uploads/xxx URL
 * @param {string} filePath 本地临时文件路径
 */
export function uploadCover(filePath) {
  return uploadFile('/games/upload-cover', filePath, 'file')
}

/**
 * 编辑球局。仅发起人可调用、仅限报名中（status=0）状态。
 * @param {number} id 球局 id
 * @param {object} payload 同 createGame 的 payload（title / mode / location / playDate / startTime / endTime / maxPlayers / courtCount / cover）
 */
export function updateGame(id, payload) {
  return request(`/games/${id}`, { method: 'PUT', body: payload })
}

/**
 * 删除球局。仅发起人可调用、仅限报名中（status=0）状态。级联软删报名记录。
 * @param {number} id 球局 id
 */
export function deleteGame(id) {
  return request(`/games/${id}`, { method: 'DELETE' })
}

/** 发起人/管理员：隐藏球局（不再首页显示） */
export function hideGame(id) {
  return request(`/games/${id}/hide`, { method: 'PUT' })
}

/** 发起人/管理员：恢复球局显示 */
export function unhideGame(id) {
  return request(`/games/${id}/unhide`, { method: 'PUT' })
}

/** 标题查重：公开接口。edit 时传 excludeId 排除自己 */
export function checkTitleAvailable(title, excludeId = null) {
  const params = new URLSearchParams({ title })
  if (excludeId != null) params.append('excludeId', excludeId)
  return request(`/games/title-check?${params.toString()}`)
}

/** 当前用户参与过的所有球局（按 playDate 倒序） */
export function listMyGames() {
  return request('/games/my')
}
