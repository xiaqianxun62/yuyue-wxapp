import { request } from './request'

/**
 * 认证 API
 *   GET  /verification/random      抽一道启用中的题（只返回 id + question）
 *   POST /verification/submit     提交答案比对，correct=true 即通过
 *
 * 管理员问题库 CRUD 在 PC 官网后台（#/questions），小程序不做。
 */

/** 随机抽一道启用的认证题 */
export function fetchRandomQuestion() {
  return request('/verification/random', { method: 'GET' })
}

/** 提交答案 */
export function submitAnswer(questionId, answer) {
  return request('/verification/submit', {
    method: 'POST',
    body: { questionId, answer },
  })
}
