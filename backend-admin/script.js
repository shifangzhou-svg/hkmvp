// 全局变量
let map;
let markers = {};

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
  
  // 初始化加载司机数据
  loadDrivers();
  
  // 每5秒更新一次司机位置
  setInterval(loadDrivers, 5000);
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
    
    // 更新地图上的司机位置
    updateDriverMarkers(drivers);
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
      </div>
      <span class="status ${driver.status}">${getStatusText(driver.status)}</span>
    `;
    driverList.appendChild(li);
  });
}

// 更新地图上的司机标记
function updateDriverMarkers(drivers) {
  drivers.forEach(driver => {
    const position = [driver.lng, driver.lat];
    
    if (markers[driver.id]) {
      // 更新现有标记位置
      markers[driver.id].setPosition(position);
    } else {
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

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    online: '在线',
    offline: '离线',
    busy: '忙碌'
  };
  return statusMap[status] || status;
}

// 获取标记图标
function getMarkerIcon(status) {
  // 根据状态返回不同的图标
  // 这里使用高德地图默认图标，实际项目中可以使用自定义图标
  return 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png';
}

// 页面加载完成后初始化地图
window.onload = initMap;
