import { ref } from 'vue'

/**
 * 轮排页临时状态（参考 auth.js 的模块级 ref 单例模式，项目未使用 pinia）。
 *
 * switchTab 不能带参数，详情页 → 轮排页的 gameId 传不过去，
 * 所以这里用模块级 ref 暂存"上次详情页的 gameId"。rotation onShow 时读它进入 game 模式。
 */
const lastGameId = ref(null)

export function setRotationGameId(id) {
  lastGameId.value = id ? Number(id) : null
}
export function getRotationGameId() {
  return lastGameId.value
}
export function clearRotationGameId() {
  lastGameId.value = null
}
