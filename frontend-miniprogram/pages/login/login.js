// 确保 Page 函数存在
if (typeof Page !== 'undefined') {
  const config = require('../../config.js');
  
  Page({
    data: {
      phone: '',
      code: '',
      countdown: 0,
      timer: null
    },

    // 输入手机号
    inputPhone(e) {
      this.setData({
        phone: e.detail.value
      });
    },

    // 输入验证码
    inputCode(e) {
      this.setData({
        code: e.detail.value
      });
    },

    // 开始倒计时
    startCountdown() {
      let countdown = 60;
      this.setData({ countdown: countdown });
      
      const timer = setInterval(() => {
        countdown--;
        this.setData({ countdown: countdown });
        
        if (countdown <= 0) {
          clearInterval(timer);
          this.setData({ timer: null });
        }
      }, 1000);
      
      this.setData({ timer: timer });
    },

    // 获取验证码
    getCode() {
      const { phone, countdown } = this.data;
      if (!phone || phone.length !== 11) {
        wx.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        });
        return;
      }

      if (countdown > 0) {
        return;
      }

      // 调用后端API发送验证码
      wx.request({
        url: `${config.baseUrl}/api/send-code`,
        method: 'POST',
        data: { phone: phone },
        success: (res) => {
          if (res.data.success) {
            wx.showToast({
              title: '验证码已发送',
              icon: 'success'
            });
            // 开始倒计时
            this.startCountdown();
          } else {
            wx.showToast({
              title: res.data.error || '发送失败',
              icon: 'none'
            });
          }
        },
        fail: (error) => {
          console.error('发送验证码失败:', error);
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        }
      });
    },

    // 登录
    login() {
      const { phone, code } = this.data;
      if (!phone || phone.length !== 11) {
        wx.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        });
        return;
      }

      if (!code) {
        wx.showToast({
          title: '请输入验证码',
          icon: 'none'
        });
        return;
      }

      // 显示加载中
      wx.showLoading({
        title: '登录中...',
      });

      // 调用后端API登录
      wx.request({
        url: `${config.baseUrl}/api/login`,
        method: 'POST',
        data: { phone: phone, code: code },
        success: (res) => {
          wx.hideLoading();
          if (res.data.success) {
            // 存储token和用户信息
            wx.setStorageSync('token', res.data.token);
            wx.setStorageSync('userInfo', {
              phone: phone,
              userId: res.data.userId,
              nickname: '用户' + phone.slice(-4)
            });

            wx.showToast({
              title: '登录成功',
              icon: 'success'
            });

            // 跳转到叫车页面
            wx.switchTab({
              url: '/pages/call-taxi/call-taxi'
            });
          } else {
            wx.showToast({
              title: res.data.error || '登录失败',
              icon: 'none'
            });
          }
        },
        fail: (error) => {
          wx.hideLoading();
          console.error('登录失败:', error);
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        }
      });
    },

    // 页面卸载时清除定时器
    onUnload() {
      if (this.data.timer) {
        clearInterval(this.data.timer);
      }
    }
  });
}
