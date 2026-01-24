/**
 * 学校档案管理路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// 获取所有学校
router.get('/', async (req: Request, res: Response) => {
  try {
    const schools = await query(`
      SELECT id, code, name, name_zh, focus_areas, interview_style, notes, created_at, updated_at
      FROM school_profiles
      ORDER BY name
    `);

    // 解析 JSON 字段
    const formattedSchools = schools.map((school: any) => ({
      ...school,
      focus_areas: typeof school.focus_areas === 'string' 
        ? JSON.parse(school.focus_areas) 
        : school.focus_areas,
    }));

    res.json({
      success: true,
      data: formattedSchools,
      total: formattedSchools.length,
    });
  } catch (error) {
    throw new AppError('获取学校列表失败', 500);
  }
});

// 根据代码获取学校
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const school = await queryOne(`
      SELECT id, code, name, name_zh, focus_areas, interview_style, notes, created_at, updated_at
      FROM school_profiles
      WHERE code = ?
    `, [code]);

    if (!school) {
      throw new AppError('学校不存在', 404);
    }

    // 解析 JSON 字段
    const formattedSchool = {
      ...school,
      focus_areas: typeof school.focus_areas === 'string' 
        ? JSON.parse(school.focus_areas) 
        : school.focus_areas,
    };

    res.json({
      success: true,
      data: formattedSchool,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('获取学校信息失败', 500);
  }
});

// 创建学校
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, name_zh, focus_areas, interview_style, notes } = req.body;

    // 验证必填字段
    if (!code || !name || !name_zh || !focus_areas || !interview_style) {
      throw new AppError('缺少必填字段', 400);
    }

    // 检查代码是否已存在
    const existing = await queryOne('SELECT id FROM school_profiles WHERE code = ?', [code]);
    if (existing) {
      throw new AppError('学校代码已存在', 409);
    }

    // 插入新学校
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
    throw new AppError('创建学校失败', 500);
  }
});

// 更新学校
router.put('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { name, name_zh, focus_areas, interview_style, notes } = req.body;

    // 检查学校是否存在
    const existing = await queryOne('SELECT id FROM school_profiles WHERE code = ?', [code]);
    if (!existing) {
      throw new AppError('学校不存在', 404);
    }

    // 更新学校
    const affectedRows = await execute(`
      UPDATE school_profiles
      SET name = ?, name_zh = ?, focus_areas = ?, interview_style = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE code = ?
    `, [name, name_zh, JSON.stringify(focus_areas), interview_style, notes, code]);

    if (affectedRows === 0) {
      throw new AppError('更新学校失败', 500);
    }

    res.json({
      success: true,
      message: '学校信息已更新',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('更新学校失败', 500);
  }
});

// 删除学校
router.delete('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // 检查学校是否存在
    const existing = await queryOne('SELECT id FROM school_profiles WHERE code = ?', [code]);
    if (!existing) {
      throw new AppError('学校不存在', 404);
    }

    // 删除学校
    const affectedRows = await execute('DELETE FROM school_profiles WHERE code = ?', [code]);

    if (affectedRows === 0) {
      throw new AppError('删除学校失败', 500);
    }

    res.json({
      success: true,
      message: '学校已删除',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('删除学校失败', 500);
  }
});

export default router;
