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

// 静态文件服务
app.use('/backend-admin', express.static('../backend-admin'));
app.use('/frontend-miniprogram', express.static('../frontend-miniprogram'));

// 测试路由
app.get('/', (req, res) => {
  res.json({ message: 'API服务运行正常' });
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

// 创建订单
app.post('/api/orders', async (req, res) => {
  const { user_id, start_location, start_lat, start_lng, end_location, end_lat, end_lng } = req.body;
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO orders (user_id, start_location, start_lat, start_lng, end_location, end_lat, end_lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, start_location, start_lat, start_lng, end_location, end_lat, end_lng]
    );
    
    res.json({ success: true, order_id: result.insertId });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// 获取订单列表
app.get('/api/orders', async (req, res) => {
  const { user_id } = req.query;
  
  try {
    let query = 'SELECT * FROM orders';
    let params = [];
    
    if (user_id) {
      query += ' WHERE user_id = ?';
      params.push(user_id);
    }
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ error: '获取订单列表失败' });
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
app.get('/api/geocode', async (req, res) => {
  const { address } = req.query;
  
  if (!address) {
    return res.status(400).json({ error: '请输入地址' });
  }
  
  try {
    const amapKey = process.env.AMAP_KEY;
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${amapKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
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
      res.status(404).json({ error: '无法找到该地址的坐标' });
    }
  } catch (error) {
    console.error('地理编码失败:', error);
    res.status(500).json({ error: '地理编码失败' });
  }
});

// 启动服务器 - 监听所有网络接口，支持外部访问
app.listen(port, '0.0.0.0', async () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`外网访问地址: http://221.217.55.195:${port}`);
  // 测试数据库连接
  await testConnection();
});
