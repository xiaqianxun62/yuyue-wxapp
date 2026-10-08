import { getBaseUrl } from './config'

/** 后端相对路径补全为完整 URL（小程序端补全为 http://IP/api/uploads/xxx；H5 下由 devServer 代理，保持 /uploads/xxx） */
export function resolveUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  const base = getBaseUrl()
  if (url.startsWith('/')) return base + url
  return base + '/' + url
}

/** 常用地点：与官网保持一致 */
export const LOCATIONS = [
  '体育馆羽毛球场',
  '综合训练馆 3 号场',
  '南区球馆',
  '北区羽毛球馆',
]

/** 常用时段 */
export const TIME_SLOTS = [
  { start: '19:00:00', end: '21:00:00' },
  { start: '19:30:00', end: '21:30:00' },
  { start: '20:00:00', end: '22:00:00' },
  { start: '14:00:00', end: '16:00:00' },
  { start: '09:00:00', end: '11:00:00' },
]

/** 性别：1男 2女 0未知 */
export function genderText(gender) {
  if (gender === 1) return '男'
  if (gender === 2) return '女'
  return '未知'
}

/** 2026-09-20 -> 09/20 */
export function shortDate(playDate) {
  if (!playDate) return '--'
  const parts = String(playDate).split('-')
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : String(playDate)
}

/** 19:00:00 -> 19:00 */
export function shortTime(time) {
  if (!time) return ''
  const parts = String(time).split(':')
  return `${parts[0]}:${parts[1]}`
}

/** 生成匿名昵称：球友#xxxx */
export function randomUid(n = 4) {
  let out = ''
  for (let i = 0; i < n; i += 1) {
    out += Math.floor(Math.random() * 10)
  }
  return out
}

/** 头像底色池 */
export const AVATAR_COLORS = [
  '#14665B',
  '#2E8B57',
  '#5A726D',
  '#8B7355',
  '#A0522D',
  '#6B8E23',
  '#4682B4',
  '#8B4513',
]

/** 统一的错误提示 */
export function toastError(err, fallback = '操作失败') {
  uni.showToast({ title: err && err.message ? err.message : fallback, icon: 'none' })
}
