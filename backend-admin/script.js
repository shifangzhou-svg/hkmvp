// 全局变量
let map;
let markers = {};

// 页面加载完成后初始化
window.onload = function() {
  // 初始化默认标签页
  showTab('map-tab');
  // 初始化地图
  initMap();
  // 加载订单数据
  loadOrders();
  // 加载司机数据
  loadDrivers();
  // 每5秒更新一次司机位置
  setInterval(loadDrivers, 5000);
};

// 切换标签页
function showTab(tabId) {
  // 隐藏所有标签页
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(tab => {
    tab.classList.remove('active');
  });
  
  // 移除所有导航按钮的激活状态
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 显示选中的标签页
  document.getElementById(tabId).classList.add('active');
  
  // 激活对应的导航按钮
  event.target.classList.add('active');
  
  // 如果切换到地图标签页，确保地图已初始化
  if (tabId === 'map-tab' && !map) {
    initMap();
  }
}

// 初始化地图
function initMap() {
  // 创建地图实例
  map = new AMap.Map('map', {
    center: [113.27, 23.13], // 广州坐标
    zoom: 13,
    zooms: [3, 18]
  });
  
  // 添加控件
  map.addControl(new AMap.Scale());
  map.addControl(new AMap.ToolBar());
  map.addControl(new AMap.MapType());
  
  // 加载司机数据
  loadDrivers();
}

// 加载司机数据
async function loadDrivers() {
  try {
    // 调用后端API获取司机数据
    const response = await fetch('http://localhost:3000/api/drivers');
    if (!response.ok) {
      throw new Error('API请求失败');
    }
    const drivers = await response.json();
    
    // 更新司机列表
    updateDriverList(drivers);
    
    // 如果地图已初始化，更新地图上的司机位置
    if (map) {
      updateDriverMarkers(drivers);
    }
  } catch (error) {
    console.error('加载司机数据失败:', error);
  }
}

// 更新司机列表
function updateDriverList(drivers) {
  const driverList = document.getElementById('driver-list');
  driverList.innerHTML = '';
  
  drivers.forEach(driver => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${driver.name}</strong> - ${driver.license_plate}
        <br>
        <small>状态: ${getStatusText(driver.status)}</small>
        ${driver.lat && driver.lng ? `<br><small>位置: ${driver.lat.toFixed(4)}, ${driver.lng.toFixed(4)}</small>` : ''}
      </div>
      <div>
        <button class="btn-primary" onclick="editDriver(${driver.id})">编辑</button>
        <button class="btn-secondary" onclick="deleteDriver(${driver.id})">删除</button>
      </div>
    `;
    driverList.appendChild(li);
  });
}

// 更新地图上的司机标记
function updateDriverMarkers(drivers) {
  // 清除所有标记
  for (let id in markers) {
    markers[id].setMap(null);
  }
  markers = {};
  
  drivers.forEach(driver => {
    if (driver.lat && driver.lng) {
      const position = [driver.lng, driver.lat];
      
      // 创建新标记
      const marker = new AMap.Marker({
        position: position,
        title: `${driver.name} - ${driver.license_plate}`,
        icon: new AMap.Icon({
          size: new AMap.Size(32, 32),
          image: getMarkerIcon(driver.status)
        })
      });
      marker.setMap(map);
      markers[driver.id] = marker;
    }
  });
}

// 加载订单数据
async function loadOrders() {
  try {
    // 获取选中的状态筛选
    const status = document.getElementById('order-status').value;
    const url = status ? `http://localhost:3000/api/orders?status=${status}` : 'http://localhost:3000/api/orders';
    
    // 调用后端API获取订单数据
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('API请求失败');
    }
    const orders = await response.json();
    
    // 更新订单列表
    updateOrderList(orders);
  } catch (error) {
    console.error('加载订单数据失败:', error);
  }
}

// 更新订单列表
function updateOrderList(orders) {
  const orderList = document.getElementById('order-list');
  orderList.innerHTML = '';
  
  if (orders.length === 0) {
    orderList.innerHTML = '<p>暂无订单</p>';
    return;
  }
  
  orders.forEach(order => {
    const orderItem = document.createElement('div');
    orderItem.className = 'order-item';
    orderItem.innerHTML = `
      <div class="order-header">
        <span class="order-id">订单号: ${order.id}</span>
        <span class="order-status ${order.status}">${getOrderStatusText(order.status)}</span>
      </div>
      <div class="order-info">
        <div class="order-location">
          <strong>起点:</strong> ${order.start_location}
        </div>
        <div class="order-location">
          <strong>终点:</strong> ${order.end_location}
        </div>
        ${order.car_type ? `<div class="order-location"><strong>车型:</strong> ${order.car_type}</div>` : ''}
        ${order.estimated_price ? `<div class="order-location"><strong>预估价格:</strong> ¥${order.estimated_price}</div>` : ''}
        ${order.reservation_time ? `<div class="order-time"><strong>预约时间:</strong> ${formatDateTime(order.reservation_time)}</div>` : ''}
        <div class="order-time">
          <strong>创建时间:</strong> ${formatDateTime(order.created_at)}
        </div>
      </div>
      <div class="order-actions">
        ${order.status === 'pending' ? `<button class="btn-primary" onclick="acceptOrder(${order.id})">接单</button>` : ''}
        ${order.status === 'accepted' ? `<button class="btn-primary" onclick="completeOrder(${order.id})">完成</button>` : ''}
        <button class="btn-secondary" onclick="cancelOrder(${order.id})">取消</button>
        <button class="btn-secondary" onclick="viewOrder(${order.id})">查看详情</button>
      </div>
    `;
    orderList.appendChild(orderItem);
  });
}

// 刷新订单
function refreshOrders() {
  loadOrders();
}

// 接单
function acceptOrder(orderId) {
  // 这里可以实现接单逻辑
  alert(`接单成功: ${orderId}`);
  loadOrders();
}

// 完成订单
function completeOrder(orderId) {
  // 这里可以实现完成订单逻辑
  alert(`订单完成: ${orderId}`);
  loadOrders();
}

// 取消订单
function cancelOrder(orderId) {
  // 这里可以实现取消订单逻辑
  alert(`订单取消: ${orderId}`);
  loadOrders();
}

// 查看订单详情
function viewOrder(orderId) {
  // 这里可以实现查看订单详情逻辑
  alert(`查看订单详情: ${orderId}`);
}

// 编辑司机
function editDriver(driverId) {
  // 这里可以实现编辑司机逻辑
  alert(`编辑司机: ${driverId}`);
}

// 删除司机
function deleteDriver(driverId) {
  // 这里可以实现删除司机逻辑
  if (confirm(`确定要删除司机 ${driverId} 吗？`)) {
    alert(`司机已删除: ${driverId}`);
    loadDrivers();
  }
}

// 获取司机状态文本
function getStatusText(status) {
  const statusMap = {
    online: '在线',
    offline: '离线',
    busy: '忙碌'
  };
  return statusMap[status] || status;
}

// 获取订单状态文本
function getOrderStatusText(status) {
  const statusMap = {
    pending: '待接单',
    accepted: '已接单',
    completed: '已完成',
    cancelled: '已取消'
  };
  return statusMap[status] || status;
}

// 获取标记图标
function getMarkerIcon(status) {
  // 根据状态返回不同的图标
  // 这里使用高德地图默认图标，实际项目中可以使用自定义图标
  return 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png';
}

// 格式化日期时间
function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
