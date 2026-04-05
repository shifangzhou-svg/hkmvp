const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function initDatabase() {
  try {
    // 先连接到MySQL服务器
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    // 创建数据库（如果不存在）
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`数据库 ${process.env.DB_NAME} 创建成功`);

    // 切换到创建的数据库
    await connection.query(`USE ${process.env.DB_NAME}`);

    // 删除现有表（如果存在）
    await connection.execute('DROP TABLE IF EXISTS driver_locations');
    await connection.execute('DROP TABLE IF EXISTS orders');
    await connection.execute('DROP TABLE IF EXISTS drivers');
    await connection.execute('DROP TABLE IF EXISTS users');
    console.log('现有表删除成功');

    // 创建用户表
    await connection.execute(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) NOT NULL UNIQUE,
        nickname VARCHAR(50),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('用户表创建成功');

    // 创建司机表
    await connection.execute(`
      CREATE TABLE drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        license_plate VARCHAR(20) NOT NULL,
        status ENUM('online', 'offline', 'busy') DEFAULT 'offline',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('司机表创建成功');

    // 创建订单表
    await connection.execute(`
      CREATE TABLE orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        driver_id INT,
        start_location VARCHAR(255) NOT NULL,
        start_lat DOUBLE NOT NULL,
        start_lng DOUBLE NOT NULL,
        end_location VARCHAR(255) NOT NULL,
        end_lat DOUBLE NOT NULL,
        end_lng DOUBLE NOT NULL,
        status ENUM('pending', 'accepted', 'completed', 'cancelled') DEFAULT 'pending',
        reservation_time DATETIME,
        car_type ENUM('经济', '舒适', '豪华') DEFAULT '经济',
        estimated_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )
    `);
    console.log('订单表创建成功');

    // 创建司机位置表
    await connection.execute(`
      CREATE TABLE driver_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT NOT NULL,
        lat DOUBLE NOT NULL,
        lng DOUBLE NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )
    `);
    console.log('司机位置表创建成功');

    // 添加测试数据
    console.log('添加测试数据...');
    
    // 添加用户数据
    await connection.execute(
      'INSERT INTO users (phone, nickname) VALUES (?, ?), (?, ?), (?, ?)',
      ['13800138001', '张三', '13800138002', '李四', '13800138003', '王五']
    );
    console.log('用户测试数据添加成功');
    
    // 添加司机数据
    await connection.execute(
      'INSERT INTO drivers (phone, name, license_plate, status) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)',
      ['13900139001', '司机A', '粤A12345', 'online', '13900139002', '司机B', '粤A67890', 'online', '13900139003', '司机C', '粤A24680', 'online', '13900139004', '司机D', '粤A13579', 'offline']
    );
    console.log('司机测试数据添加成功');
    
    // 添加司机位置数据
    await connection.execute(
      'INSERT INTO driver_locations (driver_id, lat, lng) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
      [1, 23.129111, 113.264385, 2, 23.135372, 113.261694, 3, 23.120576, 113.258543]
    );
    console.log('司机位置测试数据添加成功');
    
    // 添加订单数据
    await connection.execute(
      'INSERT INTO orders (user_id, driver_id, start_location, start_lat, start_lng, end_location, end_lat, end_lng, status, reservation_time, car_type, estimated_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [1, null, '广州塔', 23.129111, 113.264385, '广州南站', 23.106239, 113.328935, 'pending', new Date(), '经济', 50.00, 2, null, '珠江新城', 23.135372, 113.261694, '白云机场', 23.395942, 113.298671, 'pending', new Date(), '舒适', 120.00, 3, 1, '中山大学', 23.120576, 113.258543, '天河城', 23.120074, 113.326466, 'accepted', new Date(), '经济', 30.00]
    );
    console.log('订单测试数据添加成功');

    connection.end();
    console.log('数据库初始化完成，测试数据添加成功');

  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

initDatabase();
