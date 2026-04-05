// 确保 Page 函数存在
if (typeof Page !== 'undefined') {
  const config = require('../../config.js');
  
  Page({
    data: {
      keyword: '',
      searchType: '', // 'start' 或 'end'，标识是搜索上车地址还是目的地
      recentLocations: [], // 最近使用的地址
      cityGroups: {}, // 按城市分组的地址
      searchResults: [] // 搜索结果
    },

    onLoad(options) {
      // 获取传递的参数，确定是搜索上车地址还是目的地
      this.setData({
        searchType: options.type || 'start'
      });
      
      // 初始化数据
      this.initData();
    },

    // 初始化数据
    initData() {
      // 初始化空数据
      this.setData({
        recentLocations: [],
        cityGroups: {}
      });
    },

    // 输入关键词
    inputKeyword(e) {
      const keyword = e.detail.value;
      this.setData({ keyword });
      
      // 实时搜索地址
      if (keyword.length > 0) {
        this.searchAddress(keyword);
      } else {
        this.setData({ searchResults: [] });
      }
    },

    // 清除关键词
    clearKeyword() {
      this.setData({ 
        keyword: '',
        searchResults: [] 
      });
    },

    // 搜索地址
    searchAddress(keyword) {
      // 直接调用高德地图POI搜索API
      console.log('搜索地址:', keyword);
      
      const amapKey = '1cde4f4551936689924a45cd457f59'; // 使用用户提供的高德地图小程序API密钥
      const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keyword)}&city=全国&output=json&key=${amapKey}`;
      
      console.log('API请求URL:', url);
      
      wx.request({
        url: url,
        method: 'GET',
        success: (res) => {
          console.log('API响应:', res);
          
          if (res.data.status === '1' && res.data.pois && res.data.pois.length > 0) {
            // 处理搜索结果
            const searchResults = res.data.pois.map(item => ({
              name: item.name,
              address: item.address,
              distance: item.distance + 'm'
            }));
            this.setData({ searchResults });
            console.log('搜索结果:', searchResults);
          } else {
            // 无结果
            this.setData({ searchResults: [] });
            console.log('无搜索结果');
          }
        },
        fail: (error) => {
          console.error('搜索失败:', error);
          // 无结果
          this.setData({ searchResults: [] });
        }
      });
    },

    // 使用我的位置
    useMyLocation() {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          // 将选择的地址返回给上一个页面
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          
          if (this.data.searchType === 'start') {
            prevPage.setData({
              startLocation: '我的位置',
              latitude: res.latitude,
              longitude: res.longitude
            });
          } else {
            prevPage.setData({
              endLocation: '我的位置'
            });
          }
          
          // 返回上一个页面
          wx.navigateBack();
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

    // 选择地址
    selectAddress(e) {
      const index = e.currentTarget.dataset.index;
      const type = e.currentTarget.dataset.type;
      const city = e.currentTarget.dataset.city;
      let selectedAddress;
      
      // 根据类型获取选中的地址
      if (type === 'recent') {
        selectedAddress = this.data.recentLocations[index];
      } else if (type === 'city') {
        selectedAddress = this.data.cityGroups[city][index];
      } else if (type === 'search') {
        selectedAddress = this.data.searchResults[index];
      }
      
      // 调用地理编码API获取坐标
      wx.request({
        url: `${config.baseUrl}/api/geo`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          address: selectedAddress.name
        },
        success: (res) => {
          if (res.data.success) {
            // 将选择的地址和坐标返回给上一个页面
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            
            if (this.data.searchType === 'start') {
              prevPage.setData({
                startLocation: selectedAddress.name,
                startLat: res.data.lat,
                startLng: res.data.lng,
                latitude: res.data.lat,
                longitude: res.data.lng
              });
            } else {
              prevPage.setData({
                endLocation: selectedAddress.name,
                endLat: res.data.lat,
                endLng: res.data.lng
              });
            }
          }
          
          // 返回上一个页面
          wx.navigateBack();
        },
        fail: (error) => {
          console.error('地理编码失败:', error);
          
          // 即使地理编码失败，也返回上一个页面
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          
          if (this.data.searchType === 'start') {
            prevPage.setData({
              startLocation: selectedAddress.name,
              startLat: 23.129111,
              startLng: 113.264385,
              latitude: 23.129111,
              longitude: 113.264385
            });
          } else {
            prevPage.setData({
              endLocation: selectedAddress.name,
              endLat: 23.129111,
              endLng: 113.264385
            });
          }
          
          // 返回上一个页面
          wx.navigateBack();
        }
      });
    },

    // 地图选点
    mapSelect() {
      // 这里可以跳转到地图选点页面，现在先显示一个提示
      wx.showToast({
        title: '地图选点功能正在开发中',
        icon: 'none'
      });
    },

    // 取消搜索
    cancelSearch() {
      wx.navigateBack();
    }
  });
}