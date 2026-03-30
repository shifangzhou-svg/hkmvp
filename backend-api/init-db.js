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

    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
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
      CREATE TABLE IF NOT EXISTS drivers (
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
      CREATE TABLE IF NOT EXISTS orders (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )
    `);
    console.log('订单表创建成功');

    // 创建司机位置表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS driver_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT NOT NULL,
        lat DOUBLE NOT NULL,
        lng DOUBLE NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
      )
    `);
    console.log('司机位置表创建成功');

    connection.end();
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

initDatabase();
