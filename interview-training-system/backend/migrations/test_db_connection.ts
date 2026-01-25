/**
 * 測試數據庫連接
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'interview_training',
    socketPath: undefined, // 强制使用 TCP 连接
  };

  console.log('🔌 測試數據庫連接...');
  console.log('配置:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    password: config.password ? '***' : '(未設置)',
  });

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ 連接成功！');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 查詢測試成功:', rows);
    
    await connection.end();
    console.log('✅ 連接已關閉');
  } catch (error: any) {
    console.error('❌ 連接失敗:');
    console.error('   錯誤:', error.message);
    console.error('   代碼:', error.code);
    console.error('   詳細:', error);
    process.exit(1);
  }
}

testConnection();
