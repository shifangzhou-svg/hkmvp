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
    
    // 添加用户数据
    console.log('添加用户数据...');
    const users = [
      { phone: '13800138001', nickname: '张三' },
      { phone: '13800138002', nickname: '李四' },
      { phone: '13800138003', nickname: '王五' }
    ];
    
    for (const user of users) {
      try {
        await connection.execute(
          'INSERT INTO users (phone, nickname) VALUES (?, ?)',
          [user.phone, user.nickname]
        );
      } catch (err) {
        console.log(`用户 ${user.phone} 已存在，跳过`);
      }
    }
    console.log('用户数据添加成功');
    
    // 添加司机数据
    console.log('添加司机数据...');
    const drivers = [
      { phone: '13900139001', name: '司机A', license_plate: '粤A12345', status: 'online' },
      { phone: '13900139002', name: '司机B', license_plate: '粤A67890', status: 'online' },
      { phone: '13900139003', name: '司机C', license_plate: '粤A24680', status: 'online' },
      { phone: '13900139004', name: '司机D', license_plate: '粤A13579', status: 'offline' }
    ];
    
    for (const driver of drivers) {
      try {
        await connection.execute(
          'INSERT INTO drivers (phone, name, license_plate, status) VALUES (?, ?, ?, ?)',
          [driver.phone, driver.name, driver.license_plate, driver.status]
        );
      } catch (err) {
        console.log(`司机 ${driver.phone} 已存在，跳过`);
      }
    }
    console.log('司机数据添加成功');
    
    // 添加司机位置数据
    console.log('添加司机位置数据...');
    const driverLocations = [
      { driver_id: 1, lat: 23.129111, lng: 113.264385 }, // 广州塔附近
      { driver_id: 2, lat: 23.135372, lng: 113.261694 }, // 珠江新城附近
      { driver_id: 3, lat: 23.120576, lng: 113.258543 }  // 中山大学附近
    ];
    
    for (const location of driverLocations) {
      try {
        await connection.execute(
          'INSERT INTO driver_locations (driver_id, lat, lng) VALUES (?, ?, ?)',
          [location.driver_id, location.lat, location.lng]
        );
      } catch (err) {
        // 更新现有位置
        await connection.execute(
          'UPDATE driver_locations SET lat = ?, lng = ? WHERE driver_id = ?',
          [location.lat, location.lng, location.driver_id]
        );
        console.log(`司机 ${location.driver_id} 位置已更新`);
      }
    }
    console.log('司机位置数据添加成功');
    
    // 添加订单数据
    console.log('添加订单数据...');
    const orders = [
      {
        user_id: 1,
        start_location: '广州塔',
        start_lat: 23.129111,
        start_lng: 113.264385,
        end_location: '广州南站',
        end_lat: 23.106239,
        end_lng: 113.328935,
        status: 'pending',
        reservation_time: new Date(),
        car_type: '经济',
        estimated_price: 50.00
      },
      {
        user_id: 2,
        start_location: '珠江新城',
        start_lat: 23.135372,
        start_lng: 113.261694,
        end_location: '白云机场',
        end_lat: 23.395942,
        end_lng: 113.298671,
        status: 'pending',
        reservation_time: new Date(),
        car_type: '舒适',
        estimated_price: 120.00
      },
      {
        user_id: 3,
        start_location: '中山大学',
        start_lat: 23.120576,
        start_lng: 113.258543,
        end_location: '天河城',
        end_lat: 23.120074,
        end_lng: 113.326466,
        status: 'accepted',
        driver_id: 1,
        reservation_time: new Date(),
        car_type: '经济',
        estimated_price: 30.00
      }
    ];
    
    for (const order of orders) {
      await connection.execute(
        'INSERT INTO orders (user_id, driver_id, start_location, start_lat, start_lng, end_location, end_lat, end_lng, status, reservation_time, car_type, estimated_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [order.user_id, order.driver_id || null, order.start_location, order.start_lat, order.start_lng, order.end_location, order.end_lat, order.end_lng, order.status, order.reservation_time, order.car_type, order.estimated_price]
      );
    }
    console.log('订单数据添加成功');
    
    console.log('所有测试数据添加成功');
    
    connection.end();
  } catch (error) {
    console.error('添加测试数据失败:', error);
  }
}

seedData();