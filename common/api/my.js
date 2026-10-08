import { request } from './request'

/** 当前用户所有 match 明细：队友、对手、比分、胜负 */
export function listMyMatches() {
  return request('/me/matches')
}

/** 当前用户 ELO 积分变动流水 */
export function listMyRatingHistory() {
  return request('/me/rating-history')
}
