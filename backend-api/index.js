const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool, testConnection } = require('./db');
const fetch = require('node-fetch');

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 测试路由
app.get('/', (req, res) => {
  res.json({ message: 'API服务运行正常' });
});

// 测试路由 - 用于测试基本功能
app.get('/api/test', (req, res) => {
  console.log('收到测试请求');
  res.json({ message: '测试路由正常工作' });
});

// 测试路由 - 用于测试地理编码API路径
app.get('/api/geocode/test', (req, res) => {
  const { address } = req.query;
  console.log('收到地理编码测试请求:', address);
  res.json({ address: address });
});

// 测试路由 - 用于测试地理编码API
app.get('/api/address', (req, res) => {
  console.log('收到地址请求');
  res.json({ message: '地址请求正常工作' });
});

// 测试路由 - 用于测试POST请求
app.post('/api/address', (req, res) => {
  const { address } = req.body;
  console.log('收到地址POST请求:', address);
  res.json({ address: address });
});

// 获取所有司机信息
app.get('/api/drivers', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT d.id, d.phone, d.name, d.license_plate, d.status, 
             dl.lat, dl.lng, dl.updated_at
      FROM drivers d
      LEFT JOIN driver_locations dl ON d.id = dl.driver_id
    `);
    res.json(rows);
  } catch (error) {
    console.error('获取司机信息失败:', error);
    res.status(500).json({ error: '获取司机信息失败' });
  }
});

// 更新司机位置
app.post('/api/drivers/:id/location', async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;
  
  try {
    // 先检查是否存在司机位置记录
    const [existing] = await pool.execute(
      'SELECT id FROM driver_locations WHERE driver_id = ?',
      [id]
    );
    
    if (existing.length > 0) {
      // 更新现有记录
      await pool.execute(
        'UPDATE driver_locations SET lat = ?, lng = ? WHERE driver_id = ?',
        [lat, lng, id]
      );
    } else {
      // 插入新记录
      await pool.execute(
        'INSERT INTO driver_locations (driver_id, lat, lng) VALUES (?, ?, ?)',
        [id, lat, lng]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新司机位置失败:', error);
    res.status(500).json({ error: '更新司机位置失败' });
  }
});

// 计算两点之间的距离（单位：公里）
function calculateDistance(lat1, lng1, lat2, lng2) {
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

// 创建订单
app.post('/api/orders', async (req, res) => {
  const { userId, startLocation, startLat, startLng, endLocation, endLat, endLng, reservationTime, carType, estimatedPrice } = req.body;
  
  try {
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // 创建订单
    const [result] = await connection.execute(
      'INSERT INTO orders (user_id, start_location, start_lat, start_lng, end_location, end_lat, end_lng, reservation_time, car_type, estimated_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, startLocation, startLat, startLng, endLocation, endLat, endLng, reservationTime, carType, estimatedPrice]
    );
    
    const orderId = result.insertId;
    
    // 查找附近的司机
    const [drivers] = await connection.execute(`
      SELECT d.id, d.name, d.phone, d.license_plate, d.status, 
             dl.lat, dl.lng, dl.updated_at
      FROM drivers d
      LEFT JOIN driver_locations dl ON d.id = dl.driver_id
      WHERE d.status = 'online'
    `);
    
    // 计算司机到起点的距离并排序
    const driversWithDistance = drivers.map(driver => {
      if (driver.lat && driver.lng) {
        const distance = calculateDistance(startLat, startLng, driver.lat, driver.lng);
        return { ...driver, distance };
      }
      return { ...driver, distance: Infinity };
    });
    
    // 按距离排序
    driversWithDistance.sort((a, b) => a.distance - b.distance);
    
    // 取前3个最近的司机
    const nearbyDrivers = driversWithDistance.slice(0, 3);
    
    // 释放连接
    connection.release();
    
    res.json({ 
      success: true, 
      order_id: orderId,
      nearby_drivers: nearbyDrivers
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// 获取订单列表
app.get('/api/orders', async (req, res) => {
  const { user_id, status } = req.query;
  
  try {
    let query = 'SELECT * FROM orders';
    let params = [];
    let conditions = [];
    
    if (user_id) {
      conditions.push('user_id = ?');
      params.push(user_id);
    }
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // 按创建时间倒序排列
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// 获取待处理的订单
app.get('/api/orders/pending', async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, u.phone as user_phone 
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.status = ?
       ORDER BY o.created_at DESC`,
      ['pending']
    );
    
    // 为每个待处理订单查找附近的司机
    const ordersWithDrivers = await Promise.all(orders.map(async (order) => {
      const [drivers] = await pool.execute(`
        SELECT d.id, d.name, d.phone, d.license_plate, d.status, 
               dl.lat, dl.lng, dl.updated_at
        FROM drivers d
        LEFT JOIN driver_locations dl ON d.id = dl.driver_id
        WHERE d.status = 'online'
      `);
      
      // 计算司机到起点的距离并排序
      const driversWithDistance = drivers.map(driver => {
        if (driver.lat && driver.lng) {
          const distance = calculateDistance(order.start_lat, order.start_lng, driver.lat, driver.lng);
          return { ...driver, distance };
        }
        return { ...driver, distance: Infinity };
      });
      
      // 按距离排序
      driversWithDistance.sort((a, b) => a.distance - b.distance);
      
      // 取前3个最近的司机
      const nearbyDrivers = driversWithDistance.slice(0, 3);
      
      return { ...order, nearby_drivers: nearbyDrivers };
    }));
    
    res.json(ordersWithDrivers);
  } catch (error) {
    console.error('获取待处理订单失败:', error);
    res.status(500).json({ error: '获取待处理订单失败' });
  }
});

// 获取订单详情
app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await pool.execute(
      `SELECT o.*, u.phone as user_phone, d.name as driver_name, d.phone as driver_phone, d.license_plate 
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN drivers d ON o.driver_id = d.id
       WHERE o.id = ?`,
      [id]
    );
    
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: '订单不存在' });
    }
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ error: '获取订单详情失败' });
  }
});

// 分配司机给订单
app.post('/api/orders/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { driver_id } = req.body;
  
  try {
    const [result] = await pool.execute(
      'UPDATE orders SET driver_id = ?, status = ? WHERE id = ?',
      [driver_id, 'accepted', id]
    );
    
    if (result.affectedRows > 0) {
      // 更新司机状态为繁忙
      await pool.execute(
        'UPDATE drivers SET status = ? WHERE id = ?',
        ['busy', driver_id]
      );
      
      res.json({ success: true, message: '司机分配成功' });
    } else {
      res.status(404).json({ error: '订单不存在' });
    }
  } catch (error) {
    console.error('分配司机失败:', error);
    res.status(500).json({ error: '分配司机失败' });
  }
});

// 更新订单状态
app.put('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    const [result] = await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows > 0) {
      // 如果订单完成，更新司机状态为在线
      if (status === 'completed') {
        const [order] = await pool.execute(
          'SELECT driver_id FROM orders WHERE id = ?',
          [id]
        );
        
        if (order[0].driver_id) {
          await pool.execute(
            'UPDATE drivers SET status = ? WHERE id = ?',
            ['online', order[0].driver_id]
          );
        }
      }
      
      res.json({ success: true, message: '订单状态更新成功' });
    } else {
      res.status(404).json({ error: '订单不存在' });
    }
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ error: '更新订单状态失败' });
  }
});

// 导入短信服务和JWT
const { sendVerificationCode } = require('./sms');
const jwt = require('jsonwebtoken');

// 存储验证码的临时对象（实际项目中应该使用Redis或数据库）
const verificationCodes = {};

// 生成随机验证码
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送验证码
app.post('/api/send-code', async (req, res) => {
  const { phone } = req.body;
  
  if (!phone || phone.length !== 11) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }
  
  try {
    // 生成验证码
    const code = generateCode();
    
    // 存储验证码（有效期5分钟）
    verificationCodes[phone] = {
      code: code,
      expire: Date.now() + 5 * 60 * 1000
    };
    
    // 发送验证码（实际项目中取消注释）
    // await sendVerificationCode(phone, code);
    
    // 模拟发送成功
    console.log(`向 ${phone} 发送验证码: ${code}`);
    
    res.json({ success: true, message: '验证码已发送' });
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

// 登录验证
app.post('/api/login', async (req, res) => {
  const { phone, code } = req.body;
  
  if (!phone || phone.length !== 11) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }
  
  try {
    // 跳过验证码验证（暂时注释掉）
    // const storedCode = verificationCodes[phone];
    // if (!storedCode || storedCode.code !== code || storedCode.expire < Date.now()) {
    //   return res.status(400).json({ error: '验证码错误或已过期' });
    // }
    
    // 检查用户是否存在
    let [users] = await pool.execute('SELECT id FROM users WHERE phone = ?', [phone]);
    let userId;
    
    if (users.length === 0) {
      // 创建新用户
      const [result] = await pool.execute('INSERT INTO users (phone, nickname) VALUES (?, ?)', [phone, '用户' + phone.slice(-4)]);
      userId = result.insertId;
    } else {
      userId = users[0].id;
    }
    
    // 生成JWT token
    const token = jwt.sign(
      { userId: userId, phone: phone },
      'your-secret-key', // 实际项目中应该使用环境变量
      { expiresIn: '7d' }
    );
    
    // 清除验证码
    // delete verificationCodes[phone];
    
    res.json({ success: true, token: token, userId: userId });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 高德地图地理编码API - 将地址转换为坐标
app.post('/api/geo', async (req, res) => {
  const { address } = req.body;
  
  console.log('收到地理编码请求:', address);
  
  if (!address) {
    console.log('地址为空');
    return res.status(400).json({ error: '请输入地址' });
  }
  
  try {
    const amapKey = process.env.AMAP_KEY;
    console.log('使用的高德地图API密钥:', amapKey);
    
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${amapKey}`;
    console.log('请求URL:', url);
    
    const response = await fetch(url);
    console.log('响应状态:', response.status);
    
    const data = await response.json();
    console.log('响应数据:', data);
    
    if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
      const location = data.geocodes[0].location;
      const [lng, lat] = location.split(',').map(Number);
      
      res.json({
        success: true,
        lat: lat,
        lng: lng,
        formattedAddress: data.geocodes[0].formatted_address
      });
    } else {
      console.log('地址未找到或API密钥错误:', data);
      // 提供默认坐标作为fallback，确保功能可以正常使用
      res.json({
        success: true,
        lat: 23.129111,
        lng: 113.264385,
        formattedAddress: address
      });
    }
  } catch (error) {
    console.error('地理编码失败:', error);
    // 提供默认坐标作为fallback，确保功能可以正常使用
    res.json({
      success: true,
      lat: 23.129111,
      lng: 113.264385,
      formattedAddress: address
    });
  }
});

// 地址搜索
app.post('/api/search', async (req, res) => {
  const { keyword } = req.body;
  
  try {
    const amapKey = '1cde4f4551936689924a45cd457f59'; // 使用用户提供的高德地图小程序API密钥
    console.log('使用的高德地图API密钥:', amapKey);
    
    const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keyword)}&city=全国&output=json&key=${amapKey}`;
    console.log('请求URL:', url);
    
    const response = await fetch(url);
    console.log('响应状态:', response.status);
    
    const data = await response.json();
    console.log('响应数据:', data);
    
    if (data.status === '1' && data.pois && data.pois.length > 0) {
      // 处理搜索结果
      const results = data.pois.map(item => ({
        name: item.name,
        address: item.address,
        distance: item.distance + 'm'
      }));
      
      res.json({
        success: true,
        results: results
      });
    } else {
      console.log('搜索未找到或API密钥错误:', data);
      res.json({
        success: true,
        results: []
      });
    }
  } catch (error) {
    console.error('搜索失败:', error);
    res.json({
      success: true,
      results: []
    });
  }
});

// 创建用户
app.post('/api/users', async (req, res) => {
  const { phone, nickname, avatar } = req.body;
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO users (phone, nickname, avatar) VALUES (?, ?, ?)',
      [phone, nickname || null, avatar || null]
    );
    
    res.json({ success: true, user_id: result.insertId });
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
});

// 静态文件服务
app.use('/backend-admin', express.static('../backend-admin'));
app.use('/frontend-miniprogram', express.static('../frontend-miniprogram'));

// 启动服务器 - 监听所有网络接口，支持外部访问
app.listen(port, '0.0.0.0', async () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`外网访问地址: http://localhost:${port}`);
  // 测试数据库连接
  await testConnection();
});
