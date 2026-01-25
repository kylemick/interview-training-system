/**
 * 练习会话路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute, queryWithPagination } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// 创建练习会话
router.post('/', async (req: Request, res: Response) => {
  try {
    const { task_id, category, mode = 'text_qa', question_count = 10 } = req.body;

    if (!category) {
      throw new AppError(400, '缺少必填字段：category');
    }

    // 选择题目（注意：LIMIT不能使用参数绑定，需要直接拼接）
    const questions = await query(
      `SELECT id FROM questions
       WHERE category = ?
       ORDER BY RAND()
       LIMIT ${parseInt(question_count as string)}`,
      [category]
    );

    const questionIds = questions.map((q: any) => q.id);

    // 创建会话，保存题目ID列表
    const sessionId = await insert(
      `INSERT INTO sessions (task_id, category, mode, status, question_ids)
       VALUES (?, ?, ?, ?, ?)`,
      [task_id || null, category, mode, 'in_progress', JSON.stringify(questionIds)]
    );

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
      `SELECT s.id, s.task_id, s.category, s.mode, s.start_time, s.end_time, s.status, s.question_ids,
              dt.duration, dt.task_date,
              tp.id as plan_id, tp.student_name, tp.target_school
       FROM sessions s
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       LEFT JOIN training_plans tp ON dt.plan_id = tp.id
       WHERE s.id = ?`,
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

    // 解析 JSON 字段（添加错误处理）
    const formattedRecords = qaRecords.map((record: any) => {
      let ai_feedback = null;
      try {
        ai_feedback = record.ai_feedback
          ? (typeof record.ai_feedback === 'string' ? JSON.parse(record.ai_feedback) : record.ai_feedback)
          : null;
      } catch (error) {
        console.warn(`解析记录 ${record.id} 的 ai_feedback 失败:`, error);
        ai_feedback = null;
      }
      return { ...record, ai_feedback };
    });

    // 组织任务信息
    const taskInfo = session.task_id ? {
      task_id: session.task_id,
      duration: session.duration,
      task_date: session.task_date,
      plan_id: session.plan_id,
      student_name: session.student_name,
      target_school: session.target_school,
    } : null;

    // 解析 question_ids JSON 字段
    let questionIds: number[] = [];
    if (session.question_ids) {
      try {
        questionIds = typeof session.question_ids === 'string'
          ? JSON.parse(session.question_ids)
          : session.question_ids;
      } catch (e) {
        console.warn(`解析会话 ${session.id} 的 question_ids 失败:`, e);
      }
    }

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          task_id: session.task_id,
          category: session.category,
          mode: session.mode,
          start_time: session.start_time,
          end_time: session.end_time,
          status: session.status,
        },
        task_info: taskInfo,
        qa_records: formattedRecords,
        total_answered: formattedRecords.length,
        question_ids: questionIds, // 返回题目ID列表
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

    // 验证会话存在并获取关联的任务ID
    const session = await queryOne(
      'SELECT id, status, task_id, category FROM sessions WHERE id = ?', 
      [id]
    );
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

    // 如果会话关联了任务,自动标记任务完成
    let taskCompleted = false;
    if (session.task_id) {
      const affectedRows = await execute(
        'UPDATE daily_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', session.task_id]
      );
      taskCompleted = affectedRows > 0;
      
      if (taskCompleted) {
        console.log(`✅ 任务自动完成: 任务ID=${session.task_id}`);
      }
    }

    console.log(`✅ 会话完成: ID=${id}, 类别=${session.category}, 关联任务=${session.task_id || '无'}`);

    res.json({
      success: true,
      message: taskCompleted ? '会话已完成,任务已标记为完成' : '会话已完成',
      data: {
        session_id: id,
        task_id: session.task_id,
        task_completed: taskCompleted,
      },
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
    const limitNum = Math.min(parseInt(limit as string) || 10, 100);

    const sessions = await queryWithPagination(
      `SELECT id, category, mode, start_time, end_time, status,
              (SELECT COUNT(*) FROM qa_records WHERE session_id = sessions.id) as question_count
       FROM sessions
       ORDER BY start_time DESC`,
      [],
      limitNum,
      0
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

// 删除会话
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查会话是否存在
    const session = await queryOne('SELECT id, category FROM sessions WHERE id = ?', [id]);
    if (!session) {
      throw new AppError(404, '会话不存在');
    }

    // 先删除问答记录（外键约束）
    await execute('DELETE FROM qa_records WHERE session_id = ?', [id]);
    
    // 删除会话总结（如果有）
    await execute('DELETE FROM session_summaries WHERE session_id = ?', [id]);

    // 删除会话
    await execute('DELETE FROM sessions WHERE id = ?', [id]);

    console.log(`🗑️  练习记录已删除: 会话ID=${id}, 类别=${session.category}`);

    res.json({
      success: true,
      message: '练习记录已删除',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('删除练习记录失败:', error);
    throw new AppError(500, '删除练习记录失败');
  }
});

export default router;
