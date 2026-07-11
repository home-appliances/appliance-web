export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/list/list',
    'pages/detail/detail'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '',
    navigationBarTextStyle: 'black'
  },
  // 全局网络超时配置
  networkTimeout: {
    request: 30000,
    connectSocket: 30000,
    uploadFile: 30000,
    downloadFile: 30000
  },
  // 启用组件按需注入，加速启动
  lazyCodeLoading: 'requiredComponents'
})
