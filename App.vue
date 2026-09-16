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
/* #endif */
</style>
