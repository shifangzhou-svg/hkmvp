const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function addMoreTestData() {
  try {
    // 连接到数据库
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('数据库连接成功');
    
    // 添加更多待处理订单
    console.log('添加更多待处理订单...');
    await connection.execute(
      `INSERT INTO orders (user_id, driver_id, start_location, start_lat, start_lng, end_location, end_lat, end_lng, status, reservation_time, car_type, estimated_price) VALUES 
      (1, NULL, '天河体育中心', 23.129111, 113.326466, '广州东站', 23.155372, 113.338694, 'pending', NOW(), '经济', 25.00),
      (2, NULL, '白云山', 23.155372, 113.218694, '陈家祠', 23.120576, 113.258543, 'pending', NOW(), '舒适', 45.00),
      (3, NULL, '广州大学城', 23.045372, 113.361694, '广州塔', 23.129111, 113.264385, 'pending', NOW(), '豪华', 60.00)`
    );
    console.log('待处理订单添加成功');
    
    // 添加已完成订单
    console.log('添加已完成订单...');
    // 计算2小时前的时间
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    await connection.execute(
      `INSERT INTO orders (user_id, driver_id, start_location, start_lat, start_lng, end_location, end_lat, end_lng, status, reservation_time, car_type, estimated_price) VALUES 
      (1, 2, '广州南站', 23.106239, 113.328935, '天河城', 23.120074, 113.326466, 'completed', ?, '经济', 40.00),
      (2, 3, '白云机场', 23.395942, 113.298671, '珠江新城', 23.135372, 113.261694, 'completed', ?, '舒适', 100.00),
      (3, 1, '中山大学', 23.120576, 113.258543, '广州塔', 23.129111, 113.264385, 'completed', ?, '经济', 15.00)`,
      [twoHoursAgo, twoHoursAgo, twoHoursAgo]
    );
    console.log('已完成订单添加成功');
    
    console.log('更多测试数据添加完成');
    
    connection.end();
  } catch (error) {
    console.error('添加测试数据失败:', error);
  }
}

addMoreTestData();