/**
 * 題庫管理路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute, queryWithPagination, parseJsonField } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// 七大專項類別定義
export const CATEGORIES = [
  'english-oral',      // 英文口語
  'chinese-oral',      // 中文表達
  'logic-thinking',    // 邏輯思維
  'current-affairs',   // 時事常識
  'science-knowledge', // 科學常識
  'personal-growth',   // 個人成長
  'group-discussion',  // 小組討論
] as const;

// 四個學科能力類別定義
export const SUBJECT_CATEGORIES = [
  'chinese-reading',   // 中文閱讀理解
  'english-reading',   // 英文閱讀理解
  'mathematics',       // 數學基礎
  'science-practice', // 科學實踐
] as const;

// 所有類別（七大專項 + 四个學科能力）
export const ALL_CATEGORIES = [...CATEGORIES, ...SUBJECT_CATEGORIES] as const;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

// 獲取所有題目（支持篩選）
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, school_code, source, limit = '50', offset = '0', ids } = req.query;

    // 如果提供了 ids 參數，按指定 ID 列表返回（保持順序）
    if (ids) {
      const idList = (ids as string).split(',').map(id => {
        const numId = parseInt(id.trim(), 10);
        if (isNaN(numId) || numId <= 0) {
          throw new AppError(400, `無效的題目ID: ${id}`);
        }
        return numId;
      });

      if (idList.length === 0) {
        return res.json({
          success: true,
          data: [],
          total: 0,
        });
      }

      // 使用 FIELD() 函數保持指定 ID 的順序
      const placeholders = idList.map(() => '?').join(',');
      const fieldOrder = idList.map((_, index) => `FIELD(id, ${placeholders})`).join(', ');
      
      const questions = await query(
        `SELECT id, category, question_text, difficulty, reference_answer, tags, school_code, source, created_at, updated_at
         FROM questions
         WHERE id IN (${placeholders})
         ORDER BY FIELD(id, ${placeholders})`,
        [...idList, ...idList] // 第一个用于 WHERE，第二个用于 ORDER BY
      );

      // 統一解析 JSON 字段
      const formattedQuestions = questions.map((q: any) => ({
        ...q,
        tags: parseJsonField(q.tags, 'tags'),
      }));

      return res.json({
        success: true,
        data: formattedQuestions,
        total: formattedQuestions.length,
      });
    }

    // 驗證和規範化分頁參數
    const limitNum = Math.min(parseInt(limit as string) || 50, 100); // 最大 100
    const offsetNum = Math.max(parseInt(offset as string) || 0, 0);   // 最小 0

    // 構建查詢條件
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

    // 獲取總數
    const countResult = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM questions ${whereClause}`,
      params
    );
    const total = countResult?.total || 0;

    // 獲取題目列表（使用專門的分頁查詢函數）
    const questions = await queryWithPagination(
      `SELECT id, category, question_text, difficulty, reference_answer, tags, school_code, source, created_at, updated_at
       FROM questions
       ${whereClause}
       ORDER BY created_at DESC`,
      params,
      limitNum,
      offsetNum
    );

    // 統一解析 JSON 字段
    const formattedQuestions = questions.map((q: any) => ({
      ...q,
      tags: parseJsonField(q.tags, 'tags'),
    }));

    res.json({
      success: true,
      data: formattedQuestions,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('獲取題目列表失敗:', error);
    throw new AppError(500, '獲取題目列表失敗');
  }
});

// 根據 ID 獲取題目
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const question = await queryOne(
      `SELECT id, category, question_text, difficulty, reference_answer, tags, school_code, source, created_at, updated_at
       FROM questions WHERE id = ?`,
      [id]
    );

    if (!question) {
      throw new AppError(404, '題目不存在');
    }

    // 統一解析 JSON 字段
    const formattedQuestion = {
      ...question,
      tags: parseJsonField(question.tags, 'tags'),
    };

    res.json({
      success: true,
      data: formattedQuestion,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('獲取題目詳情失敗:', error);
    throw new AppError(500, '獲取題目詳情失敗');
  }
});

// 創建題目
router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, question_text, difficulty, reference_answer, tags, school_code, source = 'manual' } = req.body;

    // 驗證必填字段
    if (!category || !question_text || !difficulty) {
      throw new AppError(400, '缺少必填字段：category, question_text, difficulty');
    }

    // 驗證類別（支持所有類別）
    if (!ALL_CATEGORIES.includes(category)) {
      throw new AppError(400, `無效的類別，必須是: ${ALL_CATEGORIES.join(', ')}`);
    }

    // 驗證難度
    if (!DIFFICULTIES.includes(difficulty)) {
      throw new AppError(400, `無效的難度，必須是: ${DIFFICULTIES.join(', ')}`);
    }

    // 插入題目
    const questionId = await insert(
      `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category, question_text, difficulty, reference_answer || null, JSON.stringify(tags || []), school_code || null, source]
    );

    res.status(201).json({
      success: true,
      message: '題目創建成功',
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
    console.error('創建題目失敗:', error);
    throw new AppError(500, '創建題目失敗');
  }
});

// 更新題目
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, question_text, difficulty, reference_answer, tags, school_code } = req.body;

    // 檢查題目是否存在
    const existing = await queryOne('SELECT id FROM questions WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError(404, '題目不存在');
    }

    // 驗證類別（支持所有類別）
    if (category && !ALL_CATEGORIES.includes(category)) {
      throw new AppError(400, `無效的類別，必須是: ${ALL_CATEGORIES.join(', ')}`);
    }

    // 驗證難度
    if (difficulty && !DIFFICULTIES.includes(difficulty)) {
      throw new AppError(400, `無效的難度，必須是: ${DIFFICULTIES.join(', ')}`);
    }

    // 更新題目
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
      throw new AppError(500, '更新題目失敗');
    }

    res.json({
      success: true,
      message: '題目已更新',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('更新題目失敗:', error);
    throw new AppError(500, '更新題目失敗');
  }
});

// 刪除題目
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 檢查題目是否存在
    const existing = await queryOne('SELECT id FROM questions WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError(404, '題目不存在');
    }

    // 刪除題目
    const affectedRows = await execute('DELETE FROM questions WHERE id = ?', [id]);

    if (affectedRows === 0) {
      throw new AppError(500, '刪除題目失敗');
    }

    res.json({
      success: true,
      message: '題目已刪除',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('刪除題目失敗:', error);
    throw new AppError(500, '刪除題目失敗');
  }
});

// 獲取題庫統計
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    // 使用缓存（統計信息变化不频繁）
    // 按類別統計
    const categoryStats = await query(`
      SELECT category, COUNT(*) as count
      FROM questions
      GROUP BY category
    `, [], true); // 启用缓存

    // 按難度統計
    const difficultyStats = await query(`
      SELECT difficulty, COUNT(*) as count
      FROM questions
      GROUP BY difficulty
    `, [], true); // 启用缓存

    // 按來源統計
    const sourceStats = await query(`
      SELECT source, COUNT(*) as count
      FROM questions
      GROUP BY source
    `, [], true); // 启用缓存

    // 總數
    const totalResult = await queryOne<{ total: number }>('SELECT COUNT(*) as total FROM questions', [], true);
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
    console.error('获取統計信息失敗:', error);
    throw new AppError(500, '获取統計信息失敗');
  }
});

export default router;
