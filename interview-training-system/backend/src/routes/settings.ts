/**
 * 係統設置路由
 */
import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// 设置文件路径
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

interface Settings {
  student_name?: string;
  target_school?: string;
  deepseek_api_key?: string;
  daily_duration?: number;
  notification_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * 確保數據目錄存在
 */
async function ensureDataDir() {
  const dataDir = path.dirname(SETTINGS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * 讀取設置
 */
async function readSettings(): Promise<Settings> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // 文件不存在，返回默認設置
      return {
        daily_duration: 30,
        notification_enabled: true,
      };
    }
    throw error;
  }
}

/**
 * 寫入設置
 */
async function writeSettings(settings: Settings): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * 獲取係統設置
 * GET /api/settings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await readSettings();
    
    // 不返回完整的 API Key，只返回前缀
    const safeSettings = {
      ...settings,
      deepseek_api_key: settings.deepseek_api_key 
        ? settings.deepseek_api_key.substring(0, 10) + '...' 
        : undefined,
    };
    
    res.json({
      success: true,
      data: safeSettings,
    });
  } catch (error) {
    console.error('读取设置失敗:', error);
    throw new AppError(500, '读取设置失敗');
  }
});

/**
 * 保存係統設置
 * POST /api/settings
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      student_name,
      target_school,
      deepseek_api_key,
      daily_duration,
      notification_enabled,
    } = req.body;
    
    // 讀取現有設置
    const existingSettings = await readSettings();
    
    // 合併設置
    const newSettings: Settings = {
      ...existingSettings,
      ...(student_name !== undefined && { student_name }),
      ...(target_school !== undefined && { target_school }),
      ...(deepseek_api_key !== undefined && { deepseek_api_key }),
      ...(daily_duration !== undefined && { daily_duration }),
      ...(notification_enabled !== undefined && { notification_enabled }),
      updated_at: new Date().toISOString(),
    };
    
    if (!existingSettings.created_at) {
      newSettings.created_at = new Date().toISOString();
    }
    
    // 寫入設置
    await writeSettings(newSettings);
    
    // 如果提供了新的 API Key，更新環境變量
    if (deepseek_api_key) {
      process.env.DEEPSEEK_API_KEY = deepseek_api_key;
    }
    
    res.json({
      success: true,
      message: '設置已保存',
      data: {
        ...newSettings,
        deepseek_api_key: newSettings.deepseek_api_key 
          ? newSettings.deepseek_api_key.substring(0, 10) + '...' 
          : undefined,
      },
    });
  } catch (error) {
    console.error('保存設置失敗:', error);
    throw new AppError(500, '保存設置失敗');
  }
});

/**
 * 重置設置為默認值
 * DELETE /api/settings
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const defaultSettings: Settings = {
      daily_duration: 30,
      notification_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await writeSettings(defaultSettings);
    
    res.json({
      success: true,
      message: '設置已重置為默認值',
      data: defaultSettings,
    });
  } catch (error) {
    console.error('重置設置失敗:', error);
    throw new AppError(500, '重置設置失敗');
  }
});

export default router;
