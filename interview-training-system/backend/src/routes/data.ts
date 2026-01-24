/**
 * 数据管理路由 - 种子数据导入
 */
import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * 导入学校种子数据
 * POST /api/data/seed-schools
 */
router.post('/seed-schools', async (req: Request, res: Response) => {
  try {
    console.log('🌱 手动导入学校种子数据...');
    const { seedSchoolProfiles } = await import('../db/seeds/schools.js');
    await seedSchoolProfiles();
    
    res.json({
      success: true,
      message: '学校种子数据导入成功',
    });
  } catch (error) {
    console.error('导入学校种子数据失败:', error);
    throw new AppError(500, '导入学校种子数据失败');
  }
});

/**
 * 导入题库种子数据
 * POST /api/data/seed-questions
 */
router.post('/seed-questions', async (req: Request, res: Response) => {
  try {
    console.log('🌱 手动导入题库种子数据...');
    const { seedQuestions } = await import('../db/seeds/questions.js');
    await seedQuestions();
    
    res.json({
      success: true,
      message: '题库种子数据导入成功',
    });
  } catch (error) {
    console.error('导入题库种子数据失败:', error);
    throw new AppError(500, '导入题库种子数据失败');
  }
});

/**
 * 导入所有种子数据
 * POST /api/data/seed-all
 */
router.post('/seed-all', async (req: Request, res: Response) => {
  try {
    console.log('🌱 手动导入所有种子数据...');
    
    const { seedSchoolProfiles } = await import('../db/seeds/schools.js');
    await seedSchoolProfiles();
    
    const { seedQuestions } = await import('../db/seeds/questions.js');
    await seedQuestions();
    
    res.json({
      success: true,
      message: '所有种子数据导入成功',
    });
  } catch (error) {
    console.error('导入种子数据失败:', error);
    throw new AppError(500, '导入种子数据失败');
  }
});

/**
 * 获取数据库统计信息
 * GET /api/data/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { query } = await import('../db/index.js');
    
    const [schools] = await query<{ count: number }>('SELECT COUNT(*) as count FROM school_profiles');
    const [questions] = await query<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const [plans] = await query<{ count: number }>('SELECT COUNT(*) as count FROM training_plans');
    const [sessions] = await query<{ count: number }>('SELECT COUNT(*) as count FROM sessions');
    
    // 按来源统计题目
    const questionsBySource = await query<{ source: string; count: number }>(
      'SELECT source, COUNT(*) as count FROM questions GROUP BY source'
    );
    
    // 按来源统计学校（如果有 source 字段）
    const schoolsBySource = await query<{ count: number }>(
      "SELECT COUNT(*) as count FROM school_profiles WHERE notes LIKE '%种子%' OR code IN ('SPCC', 'QC', 'LSC', 'DBS', 'DGS')"
    );
    
    res.json({
      success: true,
      data: {
        schools: schools?.count || 0,
        questions: questions?.count || 0,
        plans: plans?.count || 0,
        sessions: sessions?.count || 0,
        questionsBySource,
        seedSchools: schoolsBySource[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    throw new AppError(500, '获取统计信息失败');
  }
});

export default router;
