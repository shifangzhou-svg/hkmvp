// 确保 Page 函数存在
if (typeof Page !== 'undefined') {
  const config = require('../../config.js');
  
  Page({
    data: {
      startLocation: '',
      endLocation: '',
      latitude: 23.13,
      longitude: 113.27
    },

    onLoad() {
      // 初始化高德地图
      this.initMap();
    },

    // 初始化高德地图
    initMap() {
      // 注意：在小程序中使用高德地图需要引入高德地图小程序SDK
      // 这里只是示例，实际使用时需要按照高德地图小程序SDK的文档进行集成
      console.log('初始化高德地图');
      
      // 获取用户当前位置
      this.getUserLocation();
    },

    // 获取用户当前位置
    getUserLocation() {
      // 先检查用户是否授权位置权限
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.userLocation']) {
            // 已经授权，直接获取位置
            this.getLocation();
          } else {
            // 未授权，请求授权
            wx.authorize({
              scope: 'scope.userLocation',
              success: () => {
                // 授权成功，获取位置
                this.getLocation();
              },
              fail: (error) => {
                console.error('授权失败:', error);
                wx.showToast({
                  title: '需要位置权限才能叫车',
                  icon: 'none'
                });
              }
            });
          }
        }
      });
    },

    // 实际获取位置的方法
    getLocation() {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          console.log('获取位置成功:', res);
          // 更新位置数据
          this.setData({
            latitude: res.latitude,
            longitude: res.longitude
          });
          // 这里可以使用高德地图API进行地图初始化和定位
        },
        fail: (error) => {
          console.error('获取位置失败:', error);
          wx.showToast({
            title: '获取位置失败',
            icon: 'none'
          });
        }
      });
    },

    // 输入起点
    inputStartLocation(e) {
      this.setData({
        startLocation: e.detail.value
      });
    },

    // 输入终点
    inputEndLocation(e) {
      this.setData({
        endLocation: e.detail.value
      });
    },

    // 地理编码 - 将地址转换为坐标
    geocodeAddress(address) {
      return new Promise((resolve, reject) => {
        wx.request({
          url: `${config.baseUrl}/api/geocode?address=${encodeURIComponent(address)}`,
          method: 'GET',
          success: (res) => {
            if (res.data.success) {
              resolve({
                lat: res.data.lat,
                lng: res.data.lng
              });
            } else {
              reject(new Error(res.data.error || '地理编码失败'));
            }
          },
          fail: (error) => {
            reject(error);
          }
        });
      });
    },

    // 查看路线规划
    async viewRoute() {
      const { startLocation, endLocation } = this.data;
      
      if (!startLocation) {
        wx.showToast({
          title: '请输入起点',
          icon: 'none'
        });
        return;
      }

      if (!endLocation) {
        wx.showToast({
          title: '请输入终点',
          icon: 'none'
        });
        return;
      }

      // 获取token
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');
      
      if (!token || !userInfo.userId) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        wx.switchTab({
          url: '/pages/login/login'
        });
        return;
      }

      // 显示加载中
      wx.showLoading({
        title: '正在规划路线...',
      });

      try {
        // 获取起点和终点的真实坐标
        const startCoords = await this.geocodeAddress(startLocation);
        const endCoords = await this.geocodeAddress(endLocation);

        wx.hideLoading();

        // 跳转到路线规划页面
        wx.navigateTo({
          url: `/pages/route-plan/route-plan?startLocation=${encodeURIComponent(startLocation)}&endLocation=${encodeURIComponent(endLocation)}&startLat=${startCoords.lat}&startLng=${startCoords.lng}&endLat=${endCoords.lat}&endLng=${endCoords.lng}`
        });
      } catch (error) {
        wx.hideLoading();
        console.error('地理编码失败:', error);
        wx.showToast({
          title: '地址解析失败，请检查地址',
          icon: 'none'
        });
      }
    }
  });
}
