import { request } from './request'

/**
 * 站点文案配置（前端可配置展示字段）。
 * 后端 Redis 存，零数据库依赖；GET 公开，PUT 需登录。
 */

/** 首页诗句签名（未设置时后端返回默认值） */
export function getHomePoem() {
  return request('/settings/home-poem')
}
