/**
 * 練習會話路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute, queryWithPagination } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { ensureQuestionsAvailable, generateSchoolRoundQuestions } from '../utils/questionHelper.js';

const router = Router();

// 創建練習會話
router.post('/', async (req: Request, res: Response) => {
  try {
    const { task_id, category, mode = 'text_qa', question_count = 10 } = req.body;

    if (!category) {
      throw new AppError(400, '缺少必填字段：category');
    }

    // 如果有關聯任務，檢查是否已有進行中的會話（防止重複創建）
    if (task_id) {
      const existingSession = await queryOne(
        `SELECT id FROM sessions WHERE task_id = ? AND status = 'in_progress'`,
        [task_id]
      );
      
      if (existingSession) {
        throw new AppError(409, '該任務已有進行中的會話，請繼續現有會話');
      }
    }

    // 使用自動生成函數確保有可用題目
    const questionCount = parseInt(question_count as string) || 10;
    const questions = await ensureQuestionsAvailable(
      category,
      questionCount,
      undefined, // 自由模式不指定學校
      'medium'
    );

    if (questions.length === 0) {
      // 如果自動生成也失敗，返回友好錯誤但不導致服務崩潰
      console.error(`❌ 無法為類別 ${category} 獲取或生成題目`);
      throw new AppError(500, `無法為類別(${category})生成題目，請稍後重試或手動添加題目`);
    }

    const questionIds = questions.map((q: any) => q.id);

    // 創建會話，保存題目ID列表
    const sessionId = await insert(
      `INSERT INTO sessions (task_id, category, mode, status, question_ids)
       VALUES (?, ?, ?, ?, ?)`,
      [task_id || null, category, mode, 'in_progress', JSON.stringify(questionIds)]
    );

    console.log(`✅ 創建練習會話: ID=${sessionId}, 類別=${category}, 題目數=${questionIds.length}, 任務ID=${task_id || '無'}`);

    res.status(201).json({
      success: true,
      message: '會話創建成功',
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
    console.error('創建練習會話失敗:', error);
    throw new AppError(500, '創建練習會話失敗');
  }
});

// 創建學校-輪次模擬面試會話
router.post('/school-round-mock', async (req: Request, res: Response) => {
  try {
    const { school_code, interview_round, question_count = 10 } = req.body;

    if (!school_code) {
      throw new AppError(400, '缺少必填字段：school_code');
    }

    const questionCount = parseInt(question_count as string) || 10;
    const safeCount = Math.max(1, Math.min(questionCount, 50)); // 限制在1-50之間

    console.log(`🎯 創建學校-輪次模擬面試會話: 學校=${school_code}, 輪次=${interview_round || '未指定'}, 題目數=${safeCount}`);

    // 使用基於輪次的題目生成函數
    const questions = await generateSchoolRoundQuestions(
      school_code,
      interview_round,
      safeCount
    );

    if (questions.length === 0) {
      throw new AppError(500, `無法為學校(${school_code})${interview_round ? `輪次(${interview_round})` : ''}生成題目，請稍後重試`);
    }

    const questionIds = questions.map((q: any) => q.id);

    // 創建會話，使用特殊的mode標識這是學校-輪次模擬面試
    // category設置為mixed，因為可能包含多個類別
    const sessionId = await insert(
      `INSERT INTO sessions (task_id, category, mode, status, question_ids)
       VALUES (?, ?, ?, ?, ?)`,
      [null, 'mixed', 'school_round_mock', 'in_progress', JSON.stringify(questionIds)]
    );

    // 在question_ids的JSON中存儲額外的元數據（通過擴展字段或註釋）
    // 這裡我們通過返回數據傳遞元數據
    console.log(`✅ 創建學校-輪次模擬面試會話: ID=${sessionId}, 題目數=${questionIds.length}`);

    res.status(201).json({
      success: true,
      message: '學校-輪次模擬面試會話創建成功',
      data: {
        session_id: sessionId,
        school_code,
        interview_round: interview_round || null,
        mode: 'school_round_mock',
        question_ids: questionIds,
        total_questions: questionIds.length,
        questions: questions.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          category: q.category,
          difficulty: q.difficulty,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('創建學校-輪次模擬面試會話失敗:', error);
    throw new AppError(500, '創建學校-輪次模擬面試會話失敗');
  }
});

// 獲取會話詳情
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
      throw new AppError(404, '會話不存在');
    }

    // 統一類別名稱：將 logical-thinking 轉換為 logic-thinking（兼容舊數據）
    if (session.category === 'logical-thinking') {
      session.category = 'logic-thinking';
    }

    // 獲取問答記錄
    // 確保 id 是數字類型（MySQL 需要數字類型匹配）
    const sessionIdNum = parseInt(id, 10)
    if (isNaN(sessionIdNum)) {
      console.error(`❌ 無效的會話ID: ${id}`)
      throw new AppError(400, '無效的會話ID')
    }
    
    console.log(`🔍 查詢問答記錄: session_id = ${sessionIdNum} (原始: ${id})`)
    console.log(`📋 會話信息: id=${session.id}, question_ids=${JSON.stringify(session.question_ids)}`)
    
    // 先檢查 question_ids 是否存在
    let questionIds: number[] = [];
    if (session.question_ids) {
      try {
        questionIds = typeof session.question_ids === 'string'
          ? JSON.parse(session.question_ids)
          : session.question_ids;
        console.log(`📋 解析後的 question_ids:`, questionIds)
      } catch (e) {
        console.warn(`解析會話 ${session.id} 的 question_ids 失敗:`, e);
      }
    }
    
    // 查詢問答記錄
    const qaRecords = await query(
      `SELECT id, question_id, question_text, answer_text, response_time, ai_feedback, created_at
       FROM qa_records WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionIdNum]
    );
    
    console.log(`📊 查詢結果: 找到 ${qaRecords.length} 條問答記錄`)
    
    // 如果 question_ids 有數據但 qa_records 為空，可能是數據不一致
    if (questionIds.length > 0 && qaRecords.length === 0) {
      console.warn(`⚠️  警告: 會話 ${sessionIdNum} 有 ${questionIds.length} 個 question_ids，但沒有對應的 qa_records`)
      console.warn(`    question_ids:`, questionIds)
      
      // 檢查這些 question_id 是否在其他 session_id 中
      if (questionIds.length > 0) {
        const placeholders = questionIds.map(() => '?').join(',')
        const checkOtherSessions = await query(
          `SELECT session_id, question_id, COUNT(*) as count 
           FROM qa_records 
           WHERE question_id IN (${placeholders})
           GROUP BY session_id, question_id
           LIMIT 20`,
          questionIds
        )
        console.log(`🔍 這些 question_id 在其他會話中的記錄:`, checkOtherSessions)
      }
    }
    
    if (qaRecords.length === 0) {
      // 檢查數據庫中是否真的沒有記錄（使用字符串和數字兩種方式）
      const checkQueryNum = await query(
        `SELECT COUNT(*) as count FROM qa_records WHERE session_id = ?`,
        [sessionIdNum]
      )
      const checkQueryStr = await query(
        `SELECT COUNT(*) as count FROM qa_records WHERE session_id = ?`,
        [String(sessionIdNum)]
      )
      console.log(`🔍 數據庫檢查 (數字): session_id=${sessionIdNum} 的記錄數 = ${checkQueryNum[0]?.count || 0}`)
      console.log(`🔍 數據庫檢查 (字符串): session_id="${String(sessionIdNum)}" 的記錄數 = ${checkQueryStr[0]?.count || 0}`)
      
      // 檢查所有 qa_records 的 session_id 類型和值
      const allSessionIds = await query(
        `SELECT DISTINCT session_id, COUNT(*) as count 
         FROM qa_records 
         GROUP BY session_id 
         ORDER BY session_id 
         LIMIT 20`
      )
      console.log(`📋 數據庫中所有會話的問答記錄統計:`, allSessionIds)
      
      // 檢查是否有接近的 session_id（可能是數據錯誤）
      const nearbySessions = await query(
        `SELECT session_id, COUNT(*) as count 
         FROM qa_records 
         WHERE session_id BETWEEN ? AND ?
         GROUP BY session_id`,
        [sessionIdNum - 2, sessionIdNum + 2]
      )
      console.log(`🔍 附近的 session_id (${sessionIdNum - 2} 到 ${sessionIdNum + 2}):`, nearbySessions)
    }

    // 解析 JSON 字段（添加錯誤處理）
    const formattedRecords = qaRecords.map((record: any) => {
      let ai_feedback = null;
      try {
        if (record.ai_feedback) {
          // 处理字符串和對象两種情况
          if (typeof record.ai_feedback === 'string') {
            ai_feedback = JSON.parse(record.ai_feedback);
          } else if (typeof record.ai_feedback === 'object' && record.ai_feedback !== null) {
            ai_feedback = record.ai_feedback;
          }
        }
      } catch (error) {
        console.warn(`解析記錄 ${record.id} 的 ai_feedback 失敗:`, error);
        console.warn(`原始數據:`, record.ai_feedback);
        ai_feedback = null;
      }
      return { ...record, ai_feedback };
    });

    // 組織任務信息（包含計劃名稱）
    const taskInfo = session.task_id ? {
      task_id: session.task_id,
      duration: session.duration,
      task_date: session.task_date,
      plan_id: session.plan_id,
      student_name: session.student_name,
      target_school: session.target_school,
      plan_name: session.student_name && session.target_school 
        ? `${session.student_name}的${session.target_school}衝刺計劃`
        : null,
    } : null;

    // questionIds 已在上面解析，這裡不需要重複聲明

    // 計算實際題目數量：使用question_ids的長度，如果為空則從qa_records統計唯一題目
    let actualQuestionCount = questionIds.length;
    if (actualQuestionCount === 0 && formattedRecords.length > 0) {
      // 如果沒有question_ids，從qa_records中統計唯一的題目ID
      const uniqueQuestionIds = new Set(
        formattedRecords
          .map((r: any) => r.question_id)
          .filter((id: any) => id !== null && id !== undefined)
      );
      actualQuestionCount = uniqueQuestionIds.size;
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
        total_answered: formattedRecords.length, // 已回答的記錄數
        total_questions: actualQuestionCount, // 實際題目數量
        question_ids: questionIds, // 返回題目ID列表
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('獲取會話詳情失敗:', error);
    throw new AppError(500, '獲取會話詳情失敗');
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

    // 驗證會話存在且未完成
    const session = await queryOne('SELECT id, status FROM sessions WHERE id = ?', [id]);
    if (!session) {
      throw new AppError(404, '會話不存在');
    }

    if (session.status === 'completed') {
      throw new AppError(400, '會話已完成，無法繼續提交答案');
    }

    // 確保 id 是數字類型（MySQL 需要數字類型匹配）
    const sessionIdNum = parseInt(id, 10)
    if (isNaN(sessionIdNum)) {
      console.error(`❌ 無效的會話ID: ${id}`)
      throw new AppError(400, '無效的會話ID')
    }
    
    // 獲取會話信息，包括關聯的 plan_id（通過 task_id 獲取）
    // 確保 plan_id 正確關聯：session -> task -> plan
    const sessionInfo = await queryOne(
      `SELECT s.id, s.task_id, s.category, dt.plan_id, dt.id as task_id_verified
       FROM sessions s
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       WHERE s.id = ?`,
      [sessionIdNum]
    );
    
    if (!sessionInfo) {
      throw new AppError(404, '會話不存在');
    }
    
    // 驗證 plan_id 的關聯關係
    let finalPlanId = null;
    if (sessionInfo.task_id) {
      // 有 task_id，必須從 task 獲取 plan_id
      if (!sessionInfo.plan_id) {
        console.warn(`⚠️  警告: 會話 ${sessionIdNum} 有 task_id=${sessionInfo.task_id}，但無法獲取 plan_id，可能是任務已刪除`)
      } else {
        finalPlanId = sessionInfo.plan_id;
      }
    }
    // 如果沒有 task_id，plan_id 保持為 null（自由練習）
    
    // 保存問答記錄，包含 plan_id 和 question_id
    const recordId = await insert(
      `INSERT INTO qa_records (session_id, plan_id, question_id, question_text, answer_text, response_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionIdNum, 
        finalPlanId,              // 從 task 關聯的 plan_id（如果有）
        question_id || null,       // 題目ID
        question_text, 
        answer_text, 
        response_time || null
      ]
    );

    console.log(`✅ 保存答案: 會話=${sessionIdNum}, 記錄=${recordId}, plan_id=${finalPlanId || 'null'}, question_id=${question_id || 'null'}, task_id=${sessionInfo.task_id || 'null'}`)
    
    // 驗證記錄是否成功插入
    const verifyRecord = await queryOne(
      `SELECT id, session_id, plan_id, question_id FROM qa_records WHERE id = ?`,
      [recordId]
    )
    if (verifyRecord) {
      console.log(`✅ 驗證成功: 記錄 ${recordId} 已保存，session_id=${verifyRecord.session_id}, plan_id=${verifyRecord.plan_id || 'null'}, question_id=${verifyRecord.question_id || 'null'}`)
    } else {
      console.error(`❌ 驗證失敗: 記錄 ${recordId} 未找到`)
    }

    res.status(201).json({
      success: true,
      message: '答案已保存',
      data: {
        record_id: recordId,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('提交答案失敗:', error);
    throw new AppError(500, '提交答案失敗');
  }
});

// 完成會話
router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 驗證會話存在並獲取關聯的任務ID和計劃ID
    const session = await queryOne(
      `SELECT s.id, s.status, s.task_id, s.category, dt.plan_id
       FROM sessions s
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       WHERE s.id = ?`, 
      [id]
    );
    if (!session) {
      throw new AppError(404, '會話不存在');
    }

    if (session.status === 'completed') {
      throw new AppError(400, '會話已完成');
    }

    // 更新會話狀態
    await execute(
      'UPDATE sessions SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', id]
    );

    // 如果會話關聯了任務,自動標記任務完成
    let taskCompleted = false;
    let planId = null;
    if (session.task_id) {
      const affectedRows = await execute(
        'UPDATE daily_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', session.task_id]
      );
      taskCompleted = affectedRows > 0;
      planId = session.plan_id;
      
      if (taskCompleted) {
        console.log(`✅ 任務自動完成: 任務ID=${session.task_id}, 計劃ID=${planId || 'null'}`);
      }
    }

    // 驗證並修復 qa_records 的 plan_id（確保所有記錄都正確關聯）
    if (session.task_id && session.plan_id) {
      const fixResult = await execute(
        `UPDATE qa_records qr
         SET qr.plan_id = ?
         WHERE qr.session_id = ? 
           AND (qr.plan_id IS NULL OR qr.plan_id != ?)`,
        [session.plan_id, id, session.plan_id]
      );
      if (fixResult > 0) {
        console.log(`✅ 修復了 ${fixResult} 條問答記錄的 plan_id: 會話=${id}, plan_id=${session.plan_id}`);
      }
    }

    console.log(`✅ 會話完成: ID=${id}, 類別=${session.category}, 關聯任務=${session.task_id || '無'}, 計劃ID=${planId || '無'}`);

    res.json({
      success: true,
      message: taskCompleted ? '會話已完成,任務已標記為完成' : '會話已完成',
      data: {
        session_id: id,
        task_id: session.task_id,
        plan_id: planId,
        task_completed: taskCompleted,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('完成會話失敗:', error);
    throw new AppError(500, '完成會話失敗');
  }
});

// 獲取最近會話列表
router.get('/recent/list', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 100);

    // 查詢所有會話，計算題目數量
    // 優先使用question_ids的長度，如果為空則從qa_records統計唯一題目數
    // 注意：包含所有會話（包括自由練習），只要它們有題目或問答記錄
    const queryLimit = limitNum * 2; // 多查詢一些，因為後面會去重
    const allSessions = await query(
      `SELECT s.id, s.category, s.mode, s.start_time, s.end_time, s.status, s.task_id, s.question_ids,
              COALESCE(JSON_LENGTH(s.question_ids), 0) as question_ids_count,
              (SELECT COUNT(DISTINCT qr.question_id) FROM qa_records qr WHERE qr.session_id = s.id AND qr.question_id IS NOT NULL) as qa_records_count,
              (SELECT COUNT(*) FROM qa_records qr WHERE qr.session_id = s.id) as total_qa_records
       FROM sessions s
       WHERE (s.question_ids IS NOT NULL AND JSON_LENGTH(s.question_ids) > 0)
          OR EXISTS (SELECT 1 FROM qa_records qr WHERE qr.session_id = s.id)
          OR s.status = 'in_progress'  -- 包含進行中的會話（即使還沒有題目或記錄）
       ORDER BY s.start_time DESC
       LIMIT ${queryLimit}`,
      [] // LIMIT不使用參數绑定
    );
    
    // 計算正確的題目數量：優先使用question_ids，如果為0則使用qa_records的唯一題目數
    // 對於自由練習，如果沒有question_ids但有qa_records，使用qa_records的唯一題目數
    const sessionsWithCount = allSessions.map((session: any) => {
      let questionCount = 0;
      
      if (session.question_ids_count > 0) {
        // 優先使用question_ids的長度
        questionCount = session.question_ids_count;
      } else if (session.qa_records_count > 0) {
        // 如果沒有question_ids，使用qa_records的唯一題目數
        questionCount = session.qa_records_count;
      } else if (session.total_qa_records > 0) {
        // 如果qa_records_count為0但total_qa_records > 0，說明有記錄但question_id為NULL
        // 這種情況下，使用總記錄數作為題目數（兼容舊數據）
        questionCount = session.total_qa_records;
      }
      
      return {
        ...session,
        question_count: questionCount
      };
    });

    // 去重：如果有相同task_id的多個會話，只保留最新的一個（優先保留進行中的）
    const sessionMap = new Map<string, any>();
    sessionsWithCount.forEach((session: any) => {
      if (session.task_id) {
        // 任務關聯的會話：每個任務只保留一個
        const key = `task_${session.task_id}`;
        const existing = sessionMap.get(key);
        if (!existing) {
          sessionMap.set(key, session);
        } else {
          // 優先保留進行中的會話，否則保留最新的
          if (session.status === 'in_progress' && existing.status !== 'in_progress') {
            sessionMap.set(key, session);
          } else if (existing.status !== 'in_progress' && 
                     new Date(session.start_time) > new Date(existing.start_time)) {
            sessionMap.set(key, session);
          }
        }
      } else {
        // 自由練習會話：每個會話ID都是唯一的
        sessionMap.set(`free_${session.id}`, session);
      }
    });

    // 轉換為數組，過濾掉沒有題目且沒有問答記錄的會話，並按時間排序
    // 注意：保留有question_ids、qa_records或正在進行中的會話
    const uniqueSessions = Array.from(sessionMap.values())
      .filter((s: any) => {
        // 保留有題目的會話，或者有問答記錄的會話，或者正在進行中的會話
        return s.question_count > 0 || s.status === 'in_progress';
      })
      .sort((a: any, b: any) => {
        // 先按狀態排序（進行中的在前），再按時間排序
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      })
      .slice(0, limitNum);

    res.json({
      success: true,
      data: uniqueSessions,
      total: uniqueSessions.length,
    });
  } catch (error) {
    console.error('獲取最近會話失敗:', error);
    throw new AppError(500, '獲取最近會話失敗');
  }
});

// 删除會話
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 檢查會話是否存在
    const session = await queryOne('SELECT id, category FROM sessions WHERE id = ?', [id]);
    if (!session) {
      throw new AppError(404, '會話不存在');
    }

    // 先刪除問答記錄（外鍵約束）
    await execute('DELETE FROM qa_records WHERE session_id = ?', [id]);
    
    // 刪除會話總結（如果有）
    await execute('DELETE FROM session_summaries WHERE session_id = ?', [id]);

    // 刪除會話
    await execute('DELETE FROM sessions WHERE id = ?', [id]);

    console.log(`🗑️  練習記錄已刪除: 會話ID=${id}, 類別=${session.category}`);

    res.json({
      success: true,
      message: '練習記錄已刪除',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('刪除練習記錄失敗:', error);
    throw new AppError(500, '刪除練習記錄失敗');
  }
});

export default router;
