/**
 * 页面跳转统一封装。
 *
 * 背景：H5 端 uni.navigateTo 内部走 getApp().$router.push()，
 * 开发环境下热更新（HMR）重建 App 实例后 $router 可能没挂上，会直接抛
 * "Cannot read properties of undefined (reading 'push')"；
 * 这个异常发生在 uni 内部的 Promise executor 里，不会进 fail 回调，
 * 所以只能在调用前探测 $router，缺失就降级成直接改 hash（H5 默认 hash 路由）。
 *
 * 小程序 / App 端条件编译后只剩原生 uni.navigateTo / uni.switchTab。
 */

export function navigateTo(url) {
  // #ifdef H5
  const app = typeof getApp === 'function' ? getApp() : null
  if (!app || !app.$router) {
    window.location.hash = '#' + url
    return
  }
  // #endif
  uni.navigateTo({ url })
}

export function switchTab(url) {
  // #ifdef H5
  const app = typeof getApp === 'function' ? getApp() : null
  if (!app || !app.$router) {
    window.location.hash = '#' + url
    return
  }
  // #endif
  uni.switchTab({ url })
}

export function navigateBack(delta = 1) {
  // #ifdef H5
  const app = typeof getApp === 'function' ? getApp() : null
  if (!app || !app.$router) {
    window.history.go(-delta)
    return
  }
  // #endif
  uni.navigateBack({ delta })
}
