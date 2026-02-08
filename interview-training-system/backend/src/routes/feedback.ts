/**
 * 反饋路由
 */
import { Router, Request, Response, NextFunction } from 'express';
import { query, queryOne, insert, execute, queryWithPagination } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateFeedback, generateSessionSummary } from '../ai/feedbackGenerator.js';

const router = Router();

// 為單個問答生成反饋
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { session_id, record_id, question_text, answer_text, category, target_school } = req.body;

    // 調試日志：檢查接收到的參數
    console.log(`📥 接收反饋生成請求:`, {
      session_id,
      record_id,
      has_question_text: !!question_text,
      has_answer_text: !!answer_text,
      category,
      question_text_preview: question_text ? question_text.substring(0, 50) + '...' : 'null',
      answer_text_preview: answer_text ? answer_text.substring(0, 50) + '...' : 'null',
    });

    // 驗證必填字段（檢查是否存在且非空字符串）
    if (!question_text || (typeof question_text === 'string' && !question_text.trim())) {
      return next(new AppError(400, '缺少必填字段：question_text'));
    }
    
    if (!answer_text || (typeof answer_text === 'string' && !answer_text.trim())) {
      return next(new AppError(400, '缺少必填字段：answer_text'));
    }
    
    if (!category || (typeof category === 'string' && !category.trim())) {
      return next(new AppError(400, '缺少必填字段：category'));
    }

    // 統一類別名稱：將 logical-thinking 轉換為 logic-thinking（兼容舊數據）
    if (category === 'logical-thinking') {
      category = 'logic-thinking';
    }

    // 獲取參考答案（如果有 question_id）
    let reference_answer: string | undefined;
    if (req.body.question_id) {
      const question = await queryOne(
        'SELECT reference_answer FROM questions WHERE id = ?',
        [req.body.question_id]
      );
      reference_answer = question?.reference_answer;
    }

    console.log(`🤖 生成反饋: 會話=${session_id}, 記錄=${record_id}`);

    // 調用 AI 生成反饋
    const feedback = await generateFeedback({
      session_id,
      question_text,
      answer_text,
      category,
      target_school,
      reference_answer,
    });

    // 如果提供了 record_id，更新問答記錄
    if (record_id) {
      // 確保 record_id 是數字類型
      const recordIdNum = typeof record_id === 'string' ? parseInt(record_id, 10) : record_id;
      if (!isNaN(recordIdNum)) {
        const feedbackJson = JSON.stringify(feedback);
        await execute(
          'UPDATE qa_records SET ai_feedback = ? WHERE id = ?',
          [feedbackJson, recordIdNum]
        );
        console.log(`✅ 反饋已保存到記錄 ${recordIdNum}`);
        
        // 驗證保存是否成功
        const verifyRecord = await queryOne(
          'SELECT id, ai_feedback FROM qa_records WHERE id = ?',
          [recordIdNum]
        );
        if (verifyRecord && verifyRecord.ai_feedback) {
          console.log(`✅ 驗證成功: 記錄 ${recordIdNum} 的反饋已保存`);
        } else {
          console.warn(`⚠️ 驗證失敗: 記錄 ${recordIdNum} 的反饋可能未正確保存`);
        }
      } else {
        console.warn(`⚠️ 無效的 record_id: ${record_id}`);
      }
    } else {
      console.warn(`⚠️ 未提供 record_id，反饋不會保存到數據庫`);
    }

    res.json({
      success: true,
      message: '反饋生成成功',
      data: feedback,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('生成反饋失敗:', error);
    return next(new AppError(500, '生成反饋失敗'));
  }
});

// 為會話生成總結
router.post('/session-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return next(new AppError(400, '缺少必填字段：session_id'));
    }

    // 檢查會話是否存在
    const session = await queryOne('SELECT id, category FROM sessions WHERE id = ?', [session_id]);
    if (!session) {
      throw new AppError(404, '會話不存在');
    }

    console.log(`🤖 生成會話總結: 會話ID=${session_id}`);

    // 生成總結
    const summary = await generateSessionSummary(session_id);

    // 保存總結到數據庫
    const existingSummary = await queryOne(
      'SELECT id FROM session_summaries WHERE session_id = ?',
      [session_id]
    );

    if (existingSummary) {
      // 更新現有總結
      await execute(
        `UPDATE session_summaries
         SET total_questions = ?, total_duration = ?, average_score = ?,
             strengths = ?, weaknesses = ?, suggestions = ?
         WHERE session_id = ?`,
        [
          summary.total_questions,
          0, // total_duration 暫時設為 0
          summary.average_score,
          JSON.stringify(summary.strengths || []),
          JSON.stringify(summary.weaknesses || []),
          summary.suggestions,
          session_id,
        ]
      );
    } else {
      // 插入新總結
      await insert(
        `INSERT INTO session_summaries 
         (session_id, total_questions, total_duration, average_score, strengths, weaknesses, suggestions)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session_id,
          summary.total_questions,
          0, // total_duration 暫時設為 0
          summary.average_score,
          JSON.stringify(summary.strengths || []),
          JSON.stringify(summary.weaknesses || []),
          summary.suggestions,
        ]
      );
    }

    console.log(`✅ 會話總結已保存`);

    res.json({
      success: true,
      message: '會話總結生成成功',
      data: summary,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('生成會話總結失敗:', error);
    return next(new AppError(500, '生成會話總結失敗'));
  }
});

// 獲取會話總結
router.get('/session/:sessionId/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const summary = await queryOne(
      `SELECT id, session_id, total_questions, total_duration, average_score,
              strengths, weaknesses, suggestions, created_at
       FROM session_summaries WHERE session_id = ?`,
      [sessionId]
    );

    if (!summary) {
      return next(new AppError(404, '會話總結不存在'));
    }

    // 解析 JSON 字段（添加錯誤處理）
    let strengths = [];
    let weaknesses = [];
    try {
      strengths = summary.strengths
        ? (typeof summary.strengths === 'string' ? JSON.parse(summary.strengths) : summary.strengths)
        : [];
    } catch (error) {
      console.warn(`解析總結 ${summary.id} 的 strengths 失敗:`, error);
      strengths = [];
    }
    try {
      weaknesses = summary.weaknesses
        ? (typeof summary.weaknesses === 'string' ? JSON.parse(summary.weaknesses) : summary.weaknesses)
        : [];
    } catch (error) {
      console.warn(`解析總結 ${summary.id} 的 weaknesses 失敗:`, error);
      weaknesses = [];
    }

    const formattedSummary = { ...summary, strengths, weaknesses };

    res.json({
      success: true,
      data: formattedSummary,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('獲取會話總結失敗:', error);
    return next(new AppError(500, '獲取會話總結失敗'));
  }
});

// 獲取歷史反饋列表
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
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

    // 解析 JSON 字段（添加錯誤處理）
    const formattedSummaries = summaries.map((summary: any) => {
      let strengths = [];
      let weaknesses = [];
      try {
        strengths = summary.strengths
          ? (typeof summary.strengths === 'string' ? JSON.parse(summary.strengths) : summary.strengths)
          : [];
      } catch (error) {
        console.warn(`解析總結 ${summary.id} 的 strengths 失敗:`, error);
        strengths = [];
      }
      try {
        weaknesses = summary.weaknesses
          ? (typeof summary.weaknesses === 'string' ? JSON.parse(summary.weaknesses) : summary.weaknesses)
          : [];
      } catch (error) {
        console.warn(`解析總結 ${summary.id} 的 weaknesses 失敗:`, error);
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
    console.error('獲取歷史反饋失敗:', error);
    return next(new AppError(500, '獲取歷史反饋失敗'));
  }
});

// 删除单个反馈
router.delete('/record/:recordId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recordId } = req.params;

    // 檢查記錄是否存在
    const record = await queryOne('SELECT id, ai_feedback FROM qa_records WHERE id = ?', [recordId]);
    if (!record) {
      return next(new AppError(404, '問答記錄不存在'));
    }

    if (!record.ai_feedback) {
      return next(new AppError(400, '該記錄沒有反饋'));
    }

    // 清除反饋（設置為 NULL）
    await execute('UPDATE qa_records SET ai_feedback = NULL WHERE id = ?', [recordId]);

    console.log(`🗑️  反饋已刪除: 記錄ID=${recordId}`);

    res.json({
      success: true,
      message: '反饋已刪除',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('刪除反饋失敗:', error);
    return next(new AppError(500, '刪除反饋失敗'));
  }
});

// 批量删除會話的所有反馈
router.delete('/session/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    // 檢查會話是否存在
    const session = await queryOne('SELECT id FROM sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return next(new AppError(404, '會話不存在'));
    }

    // 清除該會話所有問答記錄的反饋
    const affectedRows = await execute(
      'UPDATE qa_records SET ai_feedback = NULL WHERE session_id = ?',
      [sessionId]
    );

    console.log(`🗑️  批量刪除反饋: 會話ID=${sessionId}, 影響記錄數=${affectedRows}`);

    res.json({
      success: true,
      message: `已刪除 ${affectedRows} 條反饋`,
      data: {
        deleted_count: affectedRows,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error('批量删除反馈失敗:', error);
    return next(new AppError(500, '批量删除反馈失敗'));
  }
});

function getCategoryName(category: string): string {
  const map: Record<string, string> = {
    'english-oral': '英文口語',
    'chinese-oral': '中文表達',
    'chinese-expression': '中文表達', // 兼容舊數據
    'logic-thinking': '邏輯思維',
    'logical-thinking': '邏輯思維', // 兼容舊數據
    'current-affairs': '時事常識',
    'science-knowledge': '科學常識',
    'personal-growth': '個人成長',
    'group-discussion': '小組討論',
  };
  return map[category] || category;
}

export default router;
