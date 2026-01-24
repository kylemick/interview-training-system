/**
 * 反馈路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute, queryWithPagination } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateFeedback, generateSessionSummary } from '../ai/feedbackGenerator.js';

const router = Router();

// 为单个问答生成反馈
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { session_id, record_id, question_text, answer_text, category, target_school } = req.body;

    if (!question_text || !answer_text || !category) {
      throw new AppError(400, '缺少必填字段：question_text, answer_text, category');
    }

    // 获取参考答案（如果有 question_id）
    let reference_answer: string | undefined;
    if (req.body.question_id) {
      const question = await queryOne(
        'SELECT reference_answer FROM questions WHERE id = ?',
        [req.body.question_id]
      );
      reference_answer = question?.reference_answer;
    }

    console.log(`🤖 生成反馈: 会话=${session_id}, 记录=${record_id}`);

    // 调用 AI 生成反馈
    const feedback = await generateFeedback({
      session_id,
      question_text,
      answer_text,
      category,
      target_school,
      reference_answer,
    });

    // 如果提供了 record_id，更新问答记录
    if (record_id) {
      await execute(
        'UPDATE qa_records SET ai_feedback = ? WHERE id = ?',
        [JSON.stringify(feedback), record_id]
      );
      console.log(`✅ 反馈已保存到记录 ${record_id}`);
    }

    res.json({
      success: true,
      message: '反馈生成成功',
      data: feedback,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('生成反馈失败:', error);
    throw new AppError(500, '生成反馈失败');
  }
});

// 为会话生成总结
router.post('/session-summary', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      throw new AppError(400, '缺少必填字段：session_id');
    }

    // 检查会话是否存在
    const session = await queryOne('SELECT id, category FROM sessions WHERE id = ?', [session_id]);
    if (!session) {
      throw new AppError(404, '会话不存在');
    }

    console.log(`🤖 生成会话总结: 会话ID=${session_id}`);

    // 生成总结
    const summary = await generateSessionSummary(session_id);

    // 保存总结到数据库
    const existingSummary = await queryOne(
      'SELECT id FROM session_summaries WHERE session_id = ?',
      [session_id]
    );

    if (existingSummary) {
      // 更新现有总结
      await execute(
        `UPDATE session_summaries
         SET total_questions = ?, total_duration = ?, average_score = ?,
             strengths = ?, weaknesses = ?, suggestions = ?
         WHERE session_id = ?`,
        [
          summary.total_questions,
          0, // total_duration 暂时设为 0
          summary.average_score,
          JSON.stringify(summary.strengths || []),
          JSON.stringify(summary.weaknesses || []),
          summary.suggestions,
          session_id,
        ]
      );
    } else {
      // 插入新总结
      await insert(
        `INSERT INTO session_summaries 
         (session_id, total_questions, total_duration, average_score, strengths, weaknesses, suggestions)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session_id,
          summary.total_questions,
          0, // total_duration 暂时设为 0
          summary.average_score,
          JSON.stringify(summary.strengths || []),
          JSON.stringify(summary.weaknesses || []),
          summary.suggestions,
        ]
      );
    }

    console.log(`✅ 会话总结已保存`);

    res.json({
      success: true,
      message: '会话总结生成成功',
      data: summary,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('生成会话总结失败:', error);
    throw new AppError(500, '生成会话总结失败');
  }
});

// 获取会话总结
router.get('/session/:sessionId/summary', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const summary = await queryOne(
      `SELECT id, session_id, total_questions, total_duration, average_score,
              strengths, weaknesses, suggestions, created_at
       FROM session_summaries WHERE session_id = ?`,
      [sessionId]
    );

    if (!summary) {
      throw new AppError(404, '会话总结不存在');
    }

    // 解析 JSON 字段（添加错误处理）
    let strengths = [];
    let weaknesses = [];
    try {
      strengths = summary.strengths
        ? (typeof summary.strengths === 'string' ? JSON.parse(summary.strengths) : summary.strengths)
        : [];
    } catch (error) {
      console.warn(`解析总结 ${summary.id} 的 strengths 失败:`, error);
      strengths = [];
    }
    try {
      weaknesses = summary.weaknesses
        ? (typeof summary.weaknesses === 'string' ? JSON.parse(summary.weaknesses) : summary.weaknesses)
        : [];
    } catch (error) {
      console.warn(`解析总结 ${summary.id} 的 weaknesses 失败:`, error);
      weaknesses = [];
    }

    const formattedSummary = { ...summary, strengths, weaknesses };

    res.json({
      success: true,
      data: formattedSummary,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('获取会话总结失败:', error);
    throw new AppError(500, '获取会话总结失败');
  }
});

// 获取历史反馈列表
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { category, limit = '20' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);

    const conditions: string[] = [];
    const params: any[] = [];

    if (category) {
      conditions.push('s.category = ?');
      params.push(category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const summaries = await queryWithPagination(
      `SELECT ss.*, s.category, s.start_time, s.end_time
       FROM session_summaries ss
       INNER JOIN sessions s ON ss.session_id = s.id
       ${whereClause}
       ORDER BY ss.created_at DESC`,
      params,
      limitNum,
      0
    );

    // 解析 JSON 字段（添加错误处理）
    const formattedSummaries = summaries.map((summary: any) => {
      let strengths = [];
      let weaknesses = [];
      try {
        strengths = summary.strengths
          ? (typeof summary.strengths === 'string' ? JSON.parse(summary.strengths) : summary.strengths)
          : [];
      } catch (error) {
        console.warn(`解析总结 ${summary.id} 的 strengths 失败:`, error);
        strengths = [];
      }
      try {
        weaknesses = summary.weaknesses
          ? (typeof summary.weaknesses === 'string' ? JSON.parse(summary.weaknesses) : summary.weaknesses)
          : [];
      } catch (error) {
        console.warn(`解析总结 ${summary.id} 的 weaknesses 失败:`, error);
        weaknesses = [];
      }
      return { ...summary, strengths, weaknesses };
    });

    res.json({
      success: true,
      data: formattedSummaries,
      total: formattedSummaries.length,
    });
  } catch (error) {
    console.error('获取历史反馈失败:', error);
    throw new AppError(500, '获取历史反馈失败');
  }
});

function getCategoryName(category: string): string {
  const map: Record<string, string> = {
    'english-oral': '英文口语',
    'chinese-oral': '中文表达',
    'logic-thinking': '逻辑思维',
    'current-affairs': '时事常识',
    'science-knowledge': '科学常识',
    'personal-growth': '个人成长',
    'group-discussion': '小组讨论',
  };
  return map[category] || category;
}

export default router;
