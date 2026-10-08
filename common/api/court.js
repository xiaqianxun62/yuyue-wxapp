import { request } from './request'

/** 列出启用的球场场地字典（公开接口，供发布球局下拉框使用） */
export function listCourts() {
  return request('/courts')
}
