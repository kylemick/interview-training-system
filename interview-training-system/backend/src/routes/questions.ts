/**
 * 题库管理路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// 七大专项类别定义
export const CATEGORIES = [
  'english-oral',      // 英文口语
  'chinese-oral',      // 中文表达
  'logic-thinking',    // 逻辑思维
  'current-affairs',   // 时事常识
  'science-knowledge', // 科学常识
  'personal-growth',   // 个人成长
  'group-discussion',  // 小组讨论
] as const;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

// 获取所有题目（支持筛选）
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, school_code, source, limit = '50', offset = '0' } = req.query;

    // 构建查询条件
    const conditions: string[] = [];
    const params: any[] = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (difficulty) {
      conditions.push('difficulty = ?');
      params.push(difficulty);
    }

    if (school_code) {
      conditions.push('school_code = ?');
      params.push(school_code);
    }

    if (source) {
      conditions.push('source = ?');
      params.push(source);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countResult = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM questions ${whereClause}`,
      params
    );
    const total = countResult?.total || 0;

    // 获取题目列表
    console.log('查询参数:', { whereClause, params, limit, offset });
    const questions = await query(
      `SELECT id, category, question_text, difficulty, reference_answer, tags, school_code, source, created_at, updated_at
       FROM questions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit as string), parseInt(offset as string)]
    );

    // 解析 JSON 字段
    const formattedQuestions = questions.map((q: any) => ({
      ...q,
      tags: q.tags ? (typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags) : [],
    }));

    res.json({
      success: true,
      data: formattedQuestions,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('获取题目列表失败:', error);
    throw new AppError(500, '获取题目列表失败');
  }
});

// 根据 ID 获取题目
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const question = await queryOne(
      `SELECT id, category, question_text, difficulty, reference_answer, tags, school_code, source, created_at, updated_at
       FROM questions WHERE id = ?`,
      [id]
    );

    if (!question) {
      throw new AppError(404, '题目不存在');
    }

    // 解析 JSON 字段
    const formattedQuestion = {
      ...question,
      tags: question.tags ? (typeof question.tags === 'string' ? JSON.parse(question.tags) : question.tags) : [],
    };

    res.json({
      success: true,
      data: formattedQuestion,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('获取题目详情失败:', error);
    throw new AppError(500, '获取题目详情失败');
  }
});

// 创建题目
router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, question_text, difficulty, reference_answer, tags, school_code, source = 'manual' } = req.body;

    // 验证必填字段
    if (!category || !question_text || !difficulty) {
      throw new AppError(400, '缺少必填字段：category, question_text, difficulty');
    }

    // 验证类别
    if (!CATEGORIES.includes(category)) {
      throw new AppError(400, `无效的类别，必须是: ${CATEGORIES.join(', ')}`);
    }

    // 验证难度
    if (!DIFFICULTIES.includes(difficulty)) {
      throw new AppError(400, `无效的难度，必须是: ${DIFFICULTIES.join(', ')}`);
    }

    // 插入题目
    const questionId = await insert(
      `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category, question_text, difficulty, reference_answer || null, JSON.stringify(tags || []), school_code || null, source]
    );

    res.status(201).json({
      success: true,
      message: '题目创建成功',
      data: {
        id: questionId,
        category,
        question_text,
        difficulty,
        reference_answer,
        tags: tags || [],
        school_code,
        source,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('创建题目失败:', error);
    throw new AppError(500, '创建题目失败');
  }
});

// 更新题目
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, question_text, difficulty, reference_answer, tags, school_code } = req.body;

    // 检查题目是否存在
    const existing = await queryOne('SELECT id FROM questions WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError(404, '题目不存在');
    }

    // 验证类别
    if (category && !CATEGORIES.includes(category)) {
      throw new AppError(400, `无效的类别，必须是: ${CATEGORIES.join(', ')}`);
    }

    // 验证难度
    if (difficulty && !DIFFICULTIES.includes(difficulty)) {
      throw new AppError(400, `无效的难度，必须是: ${DIFFICULTIES.join(', ')}`);
    }

    // 更新题目
    const affectedRows = await execute(
      `UPDATE questions
       SET category = ?, question_text = ?, difficulty = ?, reference_answer = ?, tags = ?, school_code = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        category,
        question_text,
        difficulty,
        reference_answer || null,
        JSON.stringify(tags || []),
        school_code || null,
        id,
      ]
    );

    if (affectedRows === 0) {
      throw new AppError(500, '更新题目失败');
    }

    res.json({
      success: true,
      message: '题目已更新',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('更新题目失败:', error);
    throw new AppError(500, '更新题目失败');
  }
});

// 删除题目
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查题目是否存在
    const existing = await queryOne('SELECT id FROM questions WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError(404, '题目不存在');
    }

    // 删除题目
    const affectedRows = await execute('DELETE FROM questions WHERE id = ?', [id]);

    if (affectedRows === 0) {
      throw new AppError(500, '删除题目失败');
    }

    res.json({
      success: true,
      message: '题目已删除',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('删除题目失败:', error);
    throw new AppError(500, '删除题目失败');
  }
});

// 获取题库统计
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    // 按类别统计
    const categoryStats = await query(`
      SELECT category, COUNT(*) as count
      FROM questions
      GROUP BY category
    `);

    // 按难度统计
    const difficultyStats = await query(`
      SELECT difficulty, COUNT(*) as count
      FROM questions
      GROUP BY difficulty
    `);

    // 按来源统计
    const sourceStats = await query(`
      SELECT source, COUNT(*) as count
      FROM questions
      GROUP BY source
    `);

    // 总数
    const totalResult = await queryOne<{ total: number }>('SELECT COUNT(*) as total FROM questions');
    const total = totalResult?.total || 0;

    res.json({
      success: true,
      data: {
        total,
        by_category: categoryStats,
        by_difficulty: difficultyStats,
        by_source: sourceStats,
      },
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    throw new AppError(500, '获取统计信息失败');
  }
});

export default router;
