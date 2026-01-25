/**
 * 数据迁移脚本：将历史数据中的学生信息统一更新为设置中的值
 * 
 * 使用方法：
 * node migrations/update_student_name_from_settings.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

async function updateStudentNameFromSettings() {
  let connection;
  
  try {
    // 1. 读取设置文件
    console.log('📖 读取设置文件...');
    const settingsData = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(settingsData);
    const studentName = settings.student_name;
    
    if (!studentName) {
      console.error('❌ 设置文件中没有配置学生姓名，请先在设置页面配置');
      process.exit(1);
    }
    
    console.log(`✅ 从设置读取到学生姓名: ${studentName}`);
    
    // 2. 连接数据库
    console.log('🔌 连接数据库...');
    connection = await createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'interview_training',
    });
    
    // 3. 更新弱点表中的学生姓名
    console.log('🔄 更新弱点表中的学生姓名...');
    const [weaknessResult] = await connection.execute(
      `UPDATE student_weaknesses 
       SET student_name = ? 
       WHERE student_name IS NULL OR student_name != ?`,
      [studentName, studentName]
    );
    console.log(`✅ 更新了 ${weaknessResult.affectedRows} 条弱点记录`);
    
    // 4. 更新训练计划表中的学生姓名
    console.log('🔄 更新训练计划表中的学生姓名...');
    const [planResult] = await connection.execute(
      `UPDATE training_plans 
       SET student_name = ? 
       WHERE student_name IS NULL OR student_name != ?`,
      [studentName, studentName]
    );
    console.log(`✅ 更新了 ${planResult.affectedRows} 条训练计划记录`);
    
    console.log('✅ 数据迁移完成！');
    
  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行迁移
updateStudentNameFromSettings();
