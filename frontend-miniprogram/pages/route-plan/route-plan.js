// 确保 Page 函数存在
if (typeof Page !== 'undefined') {
  const config = require('../../config.js');
  
  Page({
    data: {
      startLocation: '',
      endLocation: '',
      latitude: 23.13,
      longitude: 113.27,
      distance: 0,
      duration: 0,
      price: 0,
      polyline: [],
      markers: []
    },

    onLoad(options) {
      // 获取传入的参数并进行解码
      const { startLocation, endLocation, startLat, startLng, endLat, endLng } = options;
      
      // 使用 decodeURIComponent 解码 URL 编码的中文
      const decodedStartLocation = startLocation ? decodeURIComponent(startLocation) : '';
      const decodedEndLocation = endLocation ? decodeURIComponent(endLocation) : '';
      
      this.setData({
        startLocation: decodedStartLocation,
        endLocation: decodedEndLocation,
        startLat: parseFloat(startLat) || 23.13,
        startLng: parseFloat(startLng) || 113.27,
        endLat: parseFloat(endLat) || 23.14,
        endLng: parseFloat(endLng) || 113.28
      });

      // 计算路线信息
      this.calculateRoute();
    },

    // 计算路线
    calculateRoute() {
      const { startLat, startLng, endLat, endLng } = this.data;
      
      // 计算距离（使用简单的直线距离公式，实际应该使用高德地图API）
      const distance = this.calculateDistance(startLat, startLng, endLat, endLng);
      
      // 估算时间（假设平均速度30km/h）
      const duration = Math.ceil(distance / 30 * 60);
      
      // 计算价格（起步价10元，每公里2元）
      const price = Math.ceil(10 + distance * 2);

      // 设置地图中心点
      const centerLat = (startLat + endLat) / 2;
      const centerLng = (startLng + endLng) / 2;

      // 创建标记点
      const markers = [
        {
          id: 1,
          latitude: startLat,
          longitude: startLng,
          title: '起点',
          iconPath: '/pages/images/call-taxi.png',
          width: 30,
          height: 30
        },
        {
          id: 2,
          latitude: endLat,
          longitude: endLng,
          title: '终点',
          iconPath: '/pages/images/profile.png',
          width: 30,
          height: 30
        }
      ];

      // 调用高德地图路径规划API
      const amapKey = '945354d18d7a81fed75ecf12258fabbe'; // 使用用户提供的高德地图Web端API密钥
      const url = `https://restapi.amap.com/v3/direction/driving?origin=${startLng},${startLat}&destination=${endLng},${endLat}&key=${amapKey}`;
      
      console.log('路径规划API请求:', url);
      
      wx.request({
        url: url,
        method: 'GET',
        success: (res) => {
          console.log('路径规划API响应:', res);
          
          let polyline = [];
          
          if (res.data.status === '1' && res.data.route && res.data.route.paths && res.data.route.paths.length > 0) {
            // 处理路径数据
            const path = res.data.route.paths[0];
            const steps = path.steps;
            
            // 构建路径点
            let points = [];
            
            // 解析每一步的polyline
            steps.forEach(step => {
              if (step.polyline) {
                const polylinePoints = step.polyline.split(';');
                polylinePoints.forEach(pointStr => {
                  const [lng, lat] = pointStr.split(',').map(Number);
                  points.push({ latitude: lat, longitude: lng });
                });
              }
            });
            
            // 创建路径
            polyline = [{
              points: points,
              color: '#ff6700',
              width: 4,
              dottedLine: false
            }];
          } else {
            // 如果API调用失败，使用简单的直线连接
            console.log('路径规划API调用失败，使用简单直线连接');
            polyline = [{
              points: [
                { latitude: startLat, longitude: startLng },
                { latitude: endLat, longitude: endLng }
              ],
              color: '#ff6700',
              width: 4,
              dottedLine: false
            }];
          }
          
          this.setData({
            latitude: centerLat,
            longitude: centerLng,
            distance: distance.toFixed(1),
            duration: duration,
            price: price,
            markers: markers,
            polyline: polyline
          });
        },
        fail: (error) => {
          console.error('路径规划失败:', error);
          // 如果API调用失败，使用简单的直线连接
          const polyline = [{
            points: [
              { latitude: startLat, longitude: startLng },
              { latitude: endLat, longitude: endLng }
            ],
            color: '#ff6700',
            width: 4,
            dottedLine: false
          }];
          
          this.setData({
            latitude: centerLat,
            longitude: centerLng,
            distance: distance.toFixed(1),
            duration: duration,
            price: price,
            markers: markers,
            polyline: polyline
          });
        }
      });
    },

    // 计算两点之间的距离（单位：公里）
    calculateDistance(lat1, lng1, lat2, lng2) {
      const radLat1 = lat1 * Math.PI / 180.0;
      const radLat2 = lat2 * Math.PI / 180.0;
      const a = radLat1 - radLat2;
      const b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
      let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
      s = s * 6378.137; // 地球半径
      return s;
    },

    // 返回修改
    goBack() {
      wx.navigateBack({
        delta: 1
      });
    },

    // 确认叫车
    confirmOrder() {
      const { startLocation, endLocation, startLat, startLng, endLat, endLng, price } = this.data;
      
      // 显示加载中
      wx.showLoading({
        title: '正在下单...',
      });

      // 获取token
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');
      
      if (!token || !userInfo.userId) {
        wx.hideLoading();
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      // 调用后端API创建订单
      wx.request({
        url: `${config.baseUrl}/api/orders`,
        method: 'POST',
        header: {
          'Authorization': 'Bearer ' + token
        },
        data: {
          userId: userInfo.userId,
          startLocation: startLocation,
          startLat: startLat,
          startLng: startLng,
          endLocation: endLocation,
          endLat: endLat,
          endLng: endLng,
          estimatedPrice: price
        },
        success: (res) => {
          wx.hideLoading();
          if (res.data.success) {
            wx.showToast({
              title: '下单成功',
              icon: 'success'
            });
            // 跳转到订单页面或首页
            wx.switchTab({
              url: '/pages/call-taxi/call-taxi'
            });
          } else {
            wx.showToast({
              title: '下单失败',
              icon: 'none'
            });
          }
        },
        fail: (error) => {
          wx.hideLoading();
          console.error('下单失败:', error);
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        }
      });
    }
  });
}
