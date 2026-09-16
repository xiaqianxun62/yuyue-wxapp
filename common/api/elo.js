import { request } from './request'

/**
 * ELO 试算：复用后端真实编排引擎与 ELO 计算器，不落库
 * @param {{ maleCount:number, femaleCount:number, ratings:number[], gamesPlayed:number, schemeId?:number, roundRobin?:boolean, winners?:number[] }} payload
 */
export function simulateElo(payload) {
  return request('/elo/simulate', { method: 'POST', body: payload })
}
