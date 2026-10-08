<script>
import { useAuth } from '@/common/store/auth'

export default {
  onLaunch: function () {
    // 启动时用本地 token 换一次用户信息，避免每次进页面都闪未登录态
    const { restore } = useAuth()
    restore()
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
}
</script>

<style lang="scss">
/* 每个页面公共 css */
@import '@/uni_modules/uni-scss/index.scss';

/* #ifndef APP-NVUE */
@import '@/static/customicons.css';

/* 全局主题变量：与官网 yuyue-vue 保持一致 */
page {
  --primary: #14665b;
  --accent: #e5c84b;
  --bg: #faf7f0;
  --text: #1a2e2a;
  --text-muted: #5a726d;
  --border-light: #e3e8e6;
  background-color: #faf7f0;
  color: #1a2e2a;
  font-size: 14px;
}

/* #ifdef H5 */
/*
 * H5 手机网页在 PC 宽屏下的「手机外壳」：
 * rpx 基准由 pages.json 的 rpxCalcMaxDeviceWidth/BaseDeviceWidth 固定（宽屏按 430 算），
 * 这里再把根节点收成 430px 居中列 + 阴影，保证桌面浏览器访问 /m/ 时视觉与手机一致。
 * 窄屏（真实手机）媒体查询不命中，整页铺满。
 */
@media screen and (min-width: 768px) {
  body {
    background-color: #e6ebe7;
  }
  uni-app {
    width: 430px;
    max-width: 100%;
    margin: 0 auto;
    min-height: 100vh;
    background-color: #faf7f0;
    box-shadow: 0 0 28px rgba(20, 60, 50, 0.18);
  }
  /* 底部 tabBar 是 fixed 定位，需在宽屏下跟随 430px 列居中 */
  uni-tabbar {
    left: 0;
    right: 0;
    width: 430px;
    margin: 0 auto;
  }
}
/* #endif */
/* #endif */
</style>
