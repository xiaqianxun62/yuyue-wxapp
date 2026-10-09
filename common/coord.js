// WGS84 -> GCJ-02 火星坐标转换（ES5 兼容，无外部依赖）
// 用于把后端 court 表中存储的 WGS84 经纬度转换为腾讯地图 / 微信小程序原生 map 所需的 GCJ-02 坐标

var PI = Math.PI
var A = 6378245.0 // 长半轴
var EE = 0.00669342162296594323 // 偏心率平方

function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x, y) {
  var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(x, y) {
  var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/**
 * WGS84 转 GCJ-02（火星坐标系）
 * @param {number} lng WGS84 经度
 * @param {number} lat WGS84 纬度
 * @returns {[number, number]} [经度, 纬度]（GCJ-02）
 */
function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat]
  var dLat = transformLat(lng - 105.0, lat - 35.0)
  var dLng = transformLng(lng - 105.0, lat - 35.0)
  var radLat = (lat / 180.0) * PI
  var magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  var sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI)
  var mgLat = lat + dLat
  var mgLng = lng + dLng
  return [mgLng, mgLat]
}

export { wgs84ToGcj02 }
