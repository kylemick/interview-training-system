/**
 * 练习会话路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// 创建练习会话
router.post('/', async (req: Request, res: Response) => {
  try {
    const { task_id, category, mode = 'text_qa', question_count = 10 } = req.body;

    if (!category) {
      throw new AppError(400, '缺少必填字段：category');
    }

    // 创建会话
    const sessionId = await insert(
      `INSERT INTO sessions (task_id, category, mode, status)
       VALUES (?, ?, ?, ?)`,
      [task_id || null, category, mode, 'in_progress']
    );

    // 选择题目
    const questions = await query(
      `SELECT id FROM questions
       WHERE category = ?
       ORDER BY RAND()
       LIMIT ?`,
      [category, question_count]
    );

    const questionIds = questions.map((q: any) => q.id);

    console.log(`✅ 创建练习会话: ID=${sessionId}, 类别=${category}, 题目数=${questionIds.length}`);

    res.status(201).json({
      success: true,
      message: '会话创建成功',
      data: {
        session_id: sessionId,
        category,
        mode,
        question_ids: questionIds,
        total_questions: questionIds.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('创建练习会话失败:', error);
    throw new AppError(500, '创建练习会话失败');
  }
});

// 获取会话详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await queryOne(
      `SELECT id, task_id, category, mode, start_time, end_time, status
       FROM sessions WHERE id = ?`,
      [id]
    );

    if (!session) {
      throw new AppError(404, '会话不存在');
    }

    // 获取问答记录
    const qaRecords = await query(
      `SELECT id, question_id, question_text, answer_text, response_time, ai_feedback, created_at
       FROM qa_records WHERE session_id = ?
       ORDER BY created_at ASC`,
      [id]
    );

    // 解析 JSON 字段
    const formattedRecords = qaRecords.map((record: any) => ({
      ...record,
      ai_feedback: record.ai_feedback
        ? (typeof record.ai_feedback === 'string' ? JSON.parse(record.ai_feedback) : record.ai_feedback)
        : null,
    }));

    res.json({
      success: true,
      data: {
        session,
        qa_records: formattedRecords,
        total_answered: formattedRecords.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('获取会话详情失败:', error);
    throw new AppError(500, '获取会话详情失败');
  }
});

// 提交答案
router.post('/:id/answer', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { question_id, question_text, answer_text, response_time } = req.body;

    if (!question_text || !answer_text) {
      throw new AppError(400, '缺少必填字段：question_text, answer_text');
    }

    // 验证会话存在且未完成
    const session = await queryOne('SELECT id, status FROM sessions WHERE id = ?', [id]);
    if (!session) {
      throw new AppError(404, '会话不存在');
    }

    if (session.status === 'completed') {
      throw new AppError(400, '会话已完成，无法继续提交答案');
    }

    // 保存问答记录
    const recordId = await insert(
      `INSERT INTO qa_records (session_id, question_id, question_text, answer_text, response_time)
       VALUES (?, ?, ?, ?, ?)`,
      [id, question_id || null, question_text, answer_text, response_time || null]
    );

    console.log(`✅ 保存答案: 会话=${id}, 记录=${recordId}`);

    res.status(201).json({
      success: true,
      message: '答案已保存',
      data: {
        record_id: recordId,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('提交答案失败:', error);
    throw new AppError(500, '提交答案失败');
  }
});

// 完成会话
router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证会话存在
    const session = await queryOne('SELECT id, status FROM sessions WHERE id = ?', [id]);
    if (!session) {
      throw new AppError(404, '会话不存在');
    }

    if (session.status === 'completed') {
      throw new AppError(400, '会话已完成');
    }

    // 更新会话状态
    await execute(
      'UPDATE sessions SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', id]
    );

    console.log(`✅ 会话完成: ID=${id}`);

    res.json({
      success: true,
      message: '会话已完成',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('完成会话失败:', error);
    throw new AppError(500, '完成会话失败');
  }
});

// 获取最近会话列表
router.get('/recent/list', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;

    const sessions = await query(
      `SELECT id, category, mode, start_time, end_time, status,
              (SELECT COUNT(*) FROM qa_records WHERE session_id = sessions.id) as question_count
       FROM sessions
       ORDER BY start_time DESC
       LIMIT ?`,
      [parseInt(limit as string)]
    );

    res.json({
      success: true,
      data: sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error('获取最近会话失败:', error);
    throw new AppError(500, '获取最近会话失败');
  }
});

export default router;
