// 确保 Page 函数存在
if (typeof Page !== 'undefined') {
  const config = require('../../config.js');
  
  Page({
    data: {
      startLocation: '',
      endLocation: '',
      latitude: 23.13,
      longitude: 113.27,
      startLat: null,
      startLng: null,
      endLat: null,
      endLng: null,
      reservationTime: '',
      startTime: '',
      endTime: '',
      carTypes: ['经济', '舒适', '豪华'],
      carTypeIndex: 0,
      markers: [],
      polyline: []
    },

    onLoad() {
      // 初始化日期选择器
      this.initDatePicker();
      // 初始化高德地图
      this.initMap();
      
      // 设置预设测试数据
      this.setData({
        startLocation: '广州站',
        startLat: 23.14048,
        startLng: 113.25789,
        endLocation: '深圳机场',
        endLat: 22.63918,
        endLng: 113.80915
      });
    },

    onShow() {
      // 页面显示时更新地图标记
      this.updateMapMarkers();
    },

    // 初始化日期选择器
    initDatePicker() {
      const now = new Date();
      const start = now;
      const end = new Date(now);
      end.setDate(now.getDate() + 7); // 最多可预约7天
      
      // 格式化日期为YYYY-MM-DD HH:MM:SS格式
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };
      
      this.setData({
        startTime: formatDate(start),
        endTime: formatDate(end),
        reservationTime: formatDate(start)
      });
    },

    // 处理时间选择
    bindTimeChange(e) {
      // 时间选择器返回的格式是YYYY-MM-DD HH:MM:SS
      this.setData({
        reservationTime: e.detail.value
      });
    },

    // 处理车型选择
    bindCarTypeChange(e) {
      this.setData({
        carTypeIndex: e.detail.value
      });
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
      const startLocation = e.detail.value;
      this.setData({
        startLocation: startLocation
      });
      
      // 调用地理编码API获取坐标
      if (startLocation) {
        this.geocodeAddress(startLocation).then(coords => {
          this.setData({
            startLat: coords.lat,
            startLng: coords.lng
          });
          // 更新地图标记和路径
          this.updateMapMarkers();
        }).catch(error => {
          console.error('地理编码失败:', error);
        });
      }
    },

    // 输入终点
    inputEndLocation(e) {
      const endLocation = e.detail.value;
      this.setData({
        endLocation: endLocation
      });
      
      // 调用地理编码API获取坐标
      if (endLocation) {
        this.geocodeAddress(endLocation).then(coords => {
          this.setData({
            endLat: coords.lat,
            endLng: coords.lng
          });
          // 更新地图标记和路径
          this.updateMapMarkers();
        }).catch(error => {
          console.error('地理编码失败:', error);
        });
      }
    },

    // 搜索上车地址
    searchStartLocation() {
      wx.navigateTo({
        url: '/pages/search/search?type=start',
        success: (res) => {
          // 监听返回事件，更新地图标记
          wx.event.on('updateMapMarkers', this.updateMapMarkers, this);
        },
        complete: () => {
          // 页面返回后更新地图标记和路径
          setTimeout(() => {
            this.updateMapMarkers();
          }, 500);
        }
      });
    },

    // 搜索目的地
    searchEndLocation() {
      wx.navigateTo({
        url: '/pages/search/search?type=end',
        success: (res) => {
          // 监听返回事件，更新地图标记
          wx.event.on('updateMapMarkers', this.updateMapMarkers, this);
        },
        complete: () => {
          // 页面返回后更新地图标记和路径
          setTimeout(() => {
            this.updateMapMarkers();
          }, 500);
        }
      });
    },

    // 更新地图标记
    updateMapMarkers() {
      const { startLat, startLng, endLat, endLng, startLocation, endLocation } = this.data;
      const markers = [];
      
      // 添加起点标记
      if (startLat && startLng) {
        markers.push({
          id: 1,
          latitude: startLat,
          longitude: startLng,
          title: startLocation,
          iconPath: '/pages/images/call-taxi.png',
          width: 30,
          height: 30
        });
      }
      
      // 添加终点标记
      if (endLat && endLng) {
        markers.push({
          id: 2,
          latitude: endLat,
          longitude: endLng,
          title: endLocation,
          iconPath: '/pages/images/profile.png',
          width: 30,
          height: 30
        });
      }
      
      // 更新标记
      this.setData({ markers });
      
      // 如果有起点和终点，更新路径规划
      if (startLat && startLng && endLat && endLng) {
        this.updateRoute();
      } else {
        this.setData({ polyline: [] });
      }
    },

    // 更新路径规划
    updateRoute() {
      const { startLat, startLng, endLat, endLng } = this.data;
      
      // 调用高德地图路径规划API
      const amapKey = '945354d18d7a81fed75ecf12258fabbe'; // 使用用户提供的高德地图Web端API密钥
      const url = `https://restapi.amap.com/v3/direction/driving?origin=${startLng},${startLat}&destination=${endLng},${endLat}&key=${amapKey}`;
      
      console.log('路径规划API请求:', url);
      
      wx.request({
        url: url,
        method: 'GET',
        success: (res) => {
          console.log('路径规划API响应:', res);
          
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
            const polyline = [{
              points: points,
              color: '#ff6700',
              width: 4,
              dottedLine: false
            }];
            
            // 更新路径
            this.setData({ polyline });
            
            // 调整地图中心点和缩放级别，使起点和终点都在视野内
            const centerLat = (startLat + endLat) / 2;
            const centerLng = (startLng + endLng) / 2;
            this.setData({ latitude: centerLat, longitude: centerLng });
          } else {
            // 如果API调用失败，使用简单的直线连接
            console.log('路径规划API调用失败，使用简单直线连接');
            const polyline = [{
              points: [
                { latitude: startLat, longitude: startLng },
                { latitude: endLat, longitude: endLng }
              ],
              color: '#ff6700',
              width: 4,
              dottedLine: false
            }];
            
            // 更新路径
            this.setData({ polyline });
            
            // 调整地图中心点和缩放级别，使起点和终点都在视野内
            const centerLat = (startLat + endLat) / 2;
            const centerLng = (startLng + endLng) / 2;
            this.setData({ latitude: centerLat, longitude: centerLng });
          }
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
          
          // 更新路径
          this.setData({ polyline });
          
          // 调整地图中心点和缩放级别，使起点和终点都在视野内
          const centerLat = (startLat + endLat) / 2;
          const centerLng = (startLng + endLng) / 2;
          this.setData({ latitude: centerLat, longitude: centerLng });
        }
      });
    },

    // 地理编码 - 将地址转换为坐标
    geocodeAddress(address) {
      return new Promise((resolve, reject) => {
        wx.request({
          url: `${config.baseUrl}/api/geo`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            address: address
          },
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
      const { startLocation, endLocation, startLat, startLng, endLat, endLng } = this.data;
      
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

      // 直接使用预设的坐标，不再调用地理编码API
      const validStartLat = startLat || 23.14048;
      const validStartLng = startLng || 113.25789;
      const validEndLat = endLat || 22.63918;
      const validEndLng = endLng || 113.80915;

      // 跳转到路线规划页面
      wx.navigateTo({
        url: `/pages/route-plan/route-plan?startLocation=${encodeURIComponent(startLocation)}&endLocation=${encodeURIComponent(endLocation)}&startLat=${validStartLat}&startLng=${validStartLng}&endLat=${validEndLat}&endLng=${validEndLng}`
      });
    },

    // 立即叫车
    async callTaxi() {
      const { startLocation, endLocation, reservationTime, carTypes, carTypeIndex, startLat, startLng, endLat, endLng } = this.data;
      
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
        title: '正在创建订单...',
      });

      try {
        // 直接使用预设的坐标，不再调用地理编码API
        const validStartLat = startLat || 23.14048;
        const validStartLng = startLng || 113.25789;
        const validEndLat = endLat || 22.63918;
        const validEndLng = endLng || 113.80915;

        // 计算预估价格（简单示例）
        const distance = this.calculateDistance(validStartLat, validStartLng, validEndLat, validEndLng);
        const basePrice = 10;
        const pricePerKm = carTypeIndex == 0 ? 2.5 : carTypeIndex == 1 ? 3.5 : 5;
        const estimatedPrice = basePrice + distance * pricePerKm;

        // 创建订单
        const response = await new Promise((resolve, reject) => {
          wx.request({
            url: `${config.baseUrl}/api/orders`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            timeout: 10000, // 10秒超时
            data: {
              userId: userInfo.userId,
              startLocation: startLocation,
              startLat: validStartLat,
              startLng: validStartLng,
              endLocation: endLocation,
              endLat: validEndLat,
              endLng: validEndLng,
              reservationTime: reservationTime,
              carType: carTypes[carTypeIndex],
              estimatedPrice: estimatedPrice.toFixed(2)
            },
            success: (res) => {
              if (res.data.success) {
                resolve(res.data);
              } else {
                reject(new Error(res.data.error || '创建订单失败'));
              }
            },
            fail: (error) => {
              reject(error);
            }
          });
        });

        wx.hideLoading();

        wx.showToast({
          title: '叫车成功！',
          icon: 'success'
        });

        // 跳转到订单列表页面（如果有的话）
        // wx.navigateTo({
        //   url: '/pages/orders/orders'
        // });

      } catch (error) {
        wx.hideLoading();
        console.error('叫车失败:', error);
        wx.showToast({
          title: '叫车失败，请重试',
          icon: 'none'
        });
      }
    },

    // 计算两点之间的距离（简单示例）
    calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371; // 地球半径
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      return distance;
    }
  });
}
