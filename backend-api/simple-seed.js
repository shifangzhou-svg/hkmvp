const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function seedData() {
  try {
    // 连接到数据库
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('数据库连接成功');
    
    // 清除现有数据
    console.log('清除现有数据...');
    await connection.execute('DELETE FROM orders');
    await connection.execute('DELETE FROM driver_locations');
    await connection.execute('DELETE FROM drivers');
    await connection.execute('DELETE FROM users');
    console.log('现有数据清除成功');
    
    // 添加用户数据
    console.log('添加用户数据...');
    await connection.execute(
      'INSERT INTO users (phone, nickname) VALUES (?, ?), (?, ?), (?, ?)',
      ['13800138001', '张三', '13800138002', '李四', '13800138003', '王五']
    );
    console.log('用户数据添加成功');
    
    // 添加司机数据
    console.log('添加司机数据...');
    await connection.execute(
      'INSERT INTO drivers (phone, name, license_plate, status) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)',
      ['13900139001', '司机A', '粤A12345', 'online', '13900139002', '司机B', '粤A67890', 'online', '13900139003', '司机C', '粤A24680', 'online', '13900139004', '司机D', '粤A13579', 'offline']
    );
    console.log('司机数据添加成功');
    
    // 添加司机位置数据
    console.log('添加司机位置数据...');
    await connection.execute(
      'INSERT INTO driver_locations (driver_id, lat, lng) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
      [1, 23.129111, 113.264385, 2, 23.135372, 113.261694, 3, 23.120576, 113.258543]
    );
    console.log('司机位置数据添加成功');
    
    // 添加订单数据
    console.log('添加订单数据...');
    const now = new Date();
    await connection.execute(
      'INSERT INTO orders (user_id, driver_id, start_location, start_lat, start_lng, end_location, end_lat, end_lng, status, reservation_time, car_type, estimated_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [1, null, '广州塔', 23.129111, 113.264385, '广州南站', 23.106239, 113.328935, 'pending', now, '经济', 50.00, 2, null, '珠江新城', 23.135372, 113.261694, '白云机场', 23.395942, 113.298671, 'pending', now, '舒适', 120.00, 3, 1, '中山大学', 23.120576, 113.258543, '天河城', 23.120074, 113.326466, 'accepted', now, '经济', 30.00]
    );
    console.log('订单数据添加成功');
    
    console.log('所有测试数据添加成功');
    
    connection.end();
  } catch (error) {
    console.error('添加测试数据失败:', error);
  }
}

seedData();