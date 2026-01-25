/**
 * 學校檔案管理路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute, parseJsonField } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// 獲取所有學校
router.get('/', async (req: Request, res: Response) => {
  try {
    // 使用缓存（學校列表变化不频繁）
    const schools = await query(`
      SELECT id, code, name, name_zh, focus_areas, interview_style, notes, created_at, updated_at
      FROM school_profiles
      ORDER BY name
    `, [], true); // 启用缓存

    // 統一解析 JSON 字段
    const formattedSchools = schools.map((school: any) => ({
      ...school,
      focus_areas: parseJsonField(school.focus_areas, 'focus_areas'),
    }));

    res.json({
      success: true,
      data: formattedSchools,
      total: formattedSchools.length,
    });
  } catch (error) {
    console.error('獲取學校列表失敗:', error);
    throw new AppError(500, '獲取學校列表失敗');
  }
});

// 根據代碼获取學校
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const school = await queryOne(`
      SELECT id, code, name, name_zh, focus_areas, interview_style, notes, created_at, updated_at
      FROM school_profiles
      WHERE code = ?
    `, [code], true); // 启用缓存

    if (!school) {
      throw new AppError(404, '學校不存在');
    }

    // 統一解析 JSON 字段
    const formattedSchool = {
      ...school,
      focus_areas: parseJsonField(school.focus_areas, 'focus_areas'),
    };

    res.json({
      success: true,
      data: formattedSchool,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('獲取學校信息失敗:', error);
    throw new AppError(500, '獲取學校信息失敗');
  }
});

// 創建學校
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, name_zh, focus_areas, interview_style, notes } = req.body;

    // 驗證必填字段
    if (!code || !name || !name_zh || !focus_areas || !interview_style) {
      throw new AppError(400, '缺少必填字段');
    }

    // 檢查代碼是否已存在
    const existing = await queryOne('SELECT id FROM school_profiles WHERE code = ?', [code]);
    if (existing) {
      throw new AppError(409, '學校代碼已存在');
    }

    // 插入新學校
    const id = await insert(`
      INSERT INTO school_profiles (code, name, name_zh, focus_areas, interview_style, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [code, name, name_zh, JSON.stringify(focus_areas), interview_style, notes || null]);

    res.status(201).json({
      success: true,
      data: { id, code, name, name_zh, focus_areas, interview_style, notes },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, '創建學校失敗');
  }
});

// 更新學校
router.put('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { name, name_zh, focus_areas, interview_style, notes } = req.body;

    // 檢查學校是否存在
    const existing = await queryOne('SELECT id FROM school_profiles WHERE code = ?', [code]);
    if (!existing) {
      throw new AppError(404, '學校不存在');
    }

    // 更新學校
    const affectedRows = await execute(`
      UPDATE school_profiles
      SET name = ?, name_zh = ?, focus_areas = ?, interview_style = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE code = ?
    `, [name, name_zh, JSON.stringify(focus_areas), interview_style, notes, code]);

    if (affectedRows === 0) {
      throw new AppError(500, '更新學校失敗');
    }

    res.json({
      success: true,
      message: '學校信息已更新',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, '更新學校失敗');
  }
});

// 删除學校
router.delete('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // 检查學校是否存在
    const existing = await queryOne('SELECT id FROM school_profiles WHERE code = ?', [code]);
    if (!existing) {
      throw new AppError(404, '學校不存在');
    }

    // 删除學校
    const affectedRows = await execute('DELETE FROM school_profiles WHERE code = ?', [code]);

    if (affectedRows === 0) {
      throw new AppError(500, '删除學校失敗');
    }

    res.json({
      success: true,
      message: '學校已删除',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, '删除學校失敗');
  }
});

export default router;
