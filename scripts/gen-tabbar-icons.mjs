/**
 * 生成小程序底部 tabBar 图标（81×81 RGBA PNG）。
 *
 * 为什么自己画：原生 tabBar 只认 iconPath / selectedIconPath 两张图片，
 * 不能写样式，所以图标得是现成的 png；这里用 SDF（有向距离场）+ 3×3 超采样
 * 直接画标准形状，纯 Node 内置模块（zlib）编码 PNG，不依赖任何第三方库。
 *
 * 用法：node scripts/gen-tabbar-icons.mjs
 * 输出：static/tabbar/*.png，同时在控制台打印 ASCII 预览（改形状后用来肉眼校对）
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZE = 81
const SS = 3 // 每边超采样数，抗锯齿

/* ---------------- 调色（与原型一致） ---------------- */
const DIM = [124, 131, 125] // #7C837D 未选中
const WORLD = [15, 59, 46] // #0F3B2E 选中
const KEY = [240, 138, 34] // #F08A22 琥珀（发布按钮底色）

/* ---------------- SDF 图元 ---------------- */
const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r

const rbox = (x0, y0, x1, y1, r) => (x, y) => {
  const dx = Math.max(x0 + r - x, 0, x - (x1 - r))
  const dy = Math.max(y0 + r - y, 0, y - (y1 - r))
  return Math.hypot(dx, dy) - r
}

const seg = (ax, ay, bx, by, r) => (x, y) => {
  const vx = bx - ax
  const vy = by - ay
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)))
  return Math.hypot(x - (ax + t * vx), y - (ay + t * vy)) - r
}

/** 凸多边形：外法线由「边中点相对质心的方向」确定，点顺序任意 */
const poly = (pts) => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  const edges = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length]
    const mx = (p[0] + q[0]) / 2
    const my = (p[1] + q[1]) / 2
    let nx = q[1] - p[1]
    let ny = -(q[0] - p[0])
    const len = Math.hypot(nx, ny) || 1
    nx /= len
    ny /= len
    if (nx * (mx - cx) + ny * (my - cy) < 0) {
      nx = -nx
      ny = -ny
    }
    return { x: p[0], y: p[1], nx, ny }
  })
  return (x, y) => Math.max(...edges.map((e) => (x - e.x) * e.nx + (y - e.y) * e.ny))
}

const union = (...fs) => (x, y) => Math.min(...fs.map((f) => f(x, y)))
const inter = (...fs) => (x, y) => Math.max(...fs.map((f) => f(x, y)))
/** 从 a 里挖掉 b */
const sub = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y))

/* ---------------- 图标定义 ---------------- */

/** 羽毛球：裙 + 两条羽缝 + 柄 + 球头 */
function shuttle(color) {
  const skirt = poly([
    [20, 12],
    [60, 12],
    [51, 47],
    [29, 47],
  ])
  const seams = union(seg(32.5, 14, 31, 45, 1.9), seg(48.5, 14, 50, 45, 1.9))
  return [
    { sdf: sub(skirt, seams), color },
    { sdf: seg(40, 46, 40, 53, 3.6), color },
    { sdf: circle(40, 59, 8.8), color },
  ]
}

/** 奖杯：杯沿 + 挖空的杯身（V 形杯口）+ 柄 + 底座 */
function trophy(color) {
  const body = poly([
    [20, 17],
    [61, 17],
    [52, 52],
    [29, 52],
  ])
  const inner = poly([
    [25, 12],
    [56, 12],
    [49, 46],
    [32, 46],
  ])
  return [
    { sdf: rbox(16, 12, 65, 18, 3), color },
    { sdf: sub(body, inner), color },
    { sdf: seg(40.5, 50, 40.5, 60, 3), color },
    { sdf: rbox(28, 60, 53, 67, 3), color },
  ]
}

/** 人像：头 + 肩（实心半圆） */
function user(color) {
  return [
    { sdf: circle(40.5, 26, 11), color },
    { sdf: inter(circle(40.5, 68, 26), rbox(-99, -99, 99, 68, 0)), color },
  ]
}

/** 发布：琥珀实心圆 + 墨绿加号 */
function plus() {
  return [
    { sdf: circle(40.5, 40.5, 33), color: KEY },
    {
      sdf: union(rbox(23.5, 36.5, 57.5, 44.5, 4), rbox(36.5, 23.5, 44.5, 57.5, 4)),
      color: WORLD,
    },
  ]
}

/* ---------------- 渲染 ---------------- */
function render(shapes) {
  const out = Buffer.alloc(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let px = [0, 0, 0, 0]
      for (const s of shapes) {
        let hit = 0
        for (let sy = 0; sy < SS; sy += 1) {
          for (let sx = 0; sx < SS; sx += 1) {
            if (s.sdf(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS) <= 0) hit += 1
          }
        }
        if (!hit) continue
        const sa = hit / (SS * SS)
        const src = [...s.color, sa * 255]
        const da = px[3] / 255
        const oa = sa + da * (1 - sa)
        const mix = (i) => (src[i] * sa + px[i] * da * (1 - sa)) / oa
        px = [mix(0), mix(1), mix(2), oa * 255]
      }
      const i = (y * SIZE + x) * 4
      out[i] = Math.round(px[0])
      out[i + 1] = Math.round(px[1])
      out[i + 2] = Math.round(px[2])
      out[i + 3] = Math.round(px[3])
    }
  }
  return out
}

/* ---------------- PNG 编码 ---------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (SIZE * 4 + 1)] = 0
    rgba.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------- ASCII 预览（# 墨绿 / o 琥珀 / + 灰，便于校对形状） ---------------- */
function preview(rgba) {
  const step = 3
  const lines = []
  for (let y = 0; y < SIZE; y += step) {
    let row = ''
    for (let x = 0; x < SIZE; x += step) {
      const i = (y * SIZE + x) * 4
      const [r, g, b, a] = [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]]
      if (a < 40) row += ' '
      else if (r > 200 && g > 100 && b < 120) row += 'o'
      else if (r < 80) row += '#'
      else row += '+'
    }
    lines.push(row)
  }
  return lines.join('\n')
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'static/tabbar')
mkdirSync(outDir, { recursive: true })

const files = [
  ['home.png', shuttle(DIM)],
  ['home-on.png', shuttle(WORLD)],
  ['rank.png', trophy(DIM)],
  ['rank-on.png', trophy(WORLD)],
  ['mine.png', user(DIM)],
  ['mine-on.png', user(WORLD)],
  ['plus.png', plus()],
  ['plus-on.png', plus()],
]

for (const [name, shapes] of files) {
  const rgba = render(shapes)
  writeFileSync(resolve(outDir, name), encodePng(rgba))
  console.log(`--- ${name} ---`)
  console.log(preview(rgba))
}
