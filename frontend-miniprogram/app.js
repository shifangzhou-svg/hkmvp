// 确保 App 函数存在
if (typeof App !== 'undefined') {
  App({
    onLaunch() {
      // 初始化应用
      console.log('应用启动');
    },
    globalData: {
      userInfo: null,
      // 高德地图API配置
      amap: {
        key: '945354d18d7a81fed75ecf12258fabbe'
      }
    }
  });
}
