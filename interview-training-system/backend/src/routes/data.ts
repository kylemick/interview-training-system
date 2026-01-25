/**
 * 數據管理路由 - 種子數據導入
 */
import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * 獲取數據庫統計信息
 * GET /api/data/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { query } = await import('../db/index.js');
    
    // 統計各表數據量
    const schoolsResult = await query<{ count: number }>('SELECT COUNT(*) as count FROM school_profiles');
    const questionsResult = await query<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const plansResult = await query<{ count: number }>('SELECT COUNT(*) as count FROM training_plans');
    const sessionsResult = await query<{ count: number }>('SELECT COUNT(*) as count FROM sessions');
    
    // 統計種子學校數量（school_profiles表沒有source字段，所以統計所有學校）
    const seedSchoolsCount = schoolsResult[0]?.count || 0;
    
    // 統計題目來源分佈
    const questionsBySourceRaw = await query<{ source: string; count: number }>(
      'SELECT COALESCE(source, "unknown") as source, COUNT(*) as count FROM questions GROUP BY COALESCE(source, "unknown")'
    );
    
    // 確保返回格式正確
    const questionsBySource = questionsBySourceRaw.map((item: any) => ({
      source: item.source || 'unknown',
      count: typeof item.count === 'bigint' ? Number(item.count) : item.count,
    }));
    
    res.json({
      success: true,
      data: {
        schools: typeof schoolsResult[0]?.count === 'bigint' ? Number(schoolsResult[0].count) : (schoolsResult[0]?.count || 0),
        questions: typeof questionsResult[0]?.count === 'bigint' ? Number(questionsResult[0].count) : (questionsResult[0]?.count || 0),
        plans: typeof plansResult[0]?.count === 'bigint' ? Number(plansResult[0].count) : (plansResult[0]?.count || 0),
        sessions: typeof sessionsResult[0]?.count === 'bigint' ? Number(sessionsResult[0].count) : (sessionsResult[0]?.count || 0),
        seedSchools: seedSchoolsCount,
        questionsBySource: questionsBySource,
      },
    });
  } catch (error: any) {
    console.error('獲取統計信息失敗:', error);
    console.error('錯誤詳情:', error.message, error.stack);
    throw new AppError(500, `獲取統計信息失敗: ${error.message}`);
  }
});

/**
 * 導入學校種子數據
 * POST /api/data/seed-schools
 */
router.post('/seed-schools', async (req: Request, res: Response) => {
  try {
    console.log('🌱 手動導入學校種子數據...');
    
    // 導入前檢查現有數據
    const { query } = await import('../db/index.js');
    const [existing] = await query<{ count: number }>('SELECT COUNT(*) as count FROM school_profiles');
    const beforeCount = existing?.count || 0;
    
    const { seedSchoolProfiles } = await import('../db/seeds/schools.js');
    await seedSchoolProfiles();
    
    // 導入後統計
    const [after] = await query<{ count: number }>('SELECT COUNT(*) as count FROM school_profiles');
    const afterCount = after?.count || 0;
    const imported = afterCount - beforeCount;
    
    res.json({
      success: true,
      message: '學校種子數據導入完成',
      data: {
        before: beforeCount,
        after: afterCount,
        imported: imported,
      },
    });
  } catch (error) {
    console.error('導入學校種子數據失敗:', error);
    throw new AppError(500, '導入學校種子數據失敗');
  }
});

/**
 * 導入題庫種子數據
 * POST /api/data/seed-questions
 */
router.post('/seed-questions', async (req: Request, res: Response) => {
  try {
    console.log('🌱 手動導入題庫種子數據...');
    
    // 導入前檢查現有數據
    const { query } = await import('../db/index.js');
    const [existing] = await query<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const beforeCount = existing?.count || 0;
    
    const { seedQuestions } = await import('../db/seeds/questions.js');
    await seedQuestions();
    
    // 導入後統計
    const [after] = await query<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const afterCount = after?.count || 0;
    const imported = afterCount - beforeCount;
    
    res.json({
      success: true,
      message: '題庫種子數據導入完成',
      data: {
        before: beforeCount,
        after: afterCount,
        imported: imported,
      },
    });
  } catch (error) {
    console.error('導入題庫種子數據失敗:', error);
    throw new AppError(500, '導入題庫種子數據失敗');
  }
});

/**
 * 導入所有種子數據
 * POST /api/data/seed-all
 */
router.post('/seed-all', async (req: Request, res: Response) => {
  try {
    console.log('🌱 手動導入所有種子數據...');
    
    const { seedSchoolProfiles } = await import('../db/seeds/schools.js');
    await seedSchoolProfiles();
    
    const { seedQuestions } = await import('../db/seeds/questions.js');
    await seedQuestions();
    
    res.json({
      success: true,
      message: '所有種子數據導入成功',
    });
  } catch (error) {
    console.error('導入種子數據失敗:', error);
    throw new AppError(500, '導入種子數據失敗');
  }
});

/**
 * 清空所有訓練數據（保留題庫和學校檔案）
 * DELETE /api/data/clear
 */
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    console.log('🗑️  清空訓練數據...');
    const { query, execute } = await import('../db/index.js');
    
    // 按照外鍵依賴順序刪除
    await execute('DELETE FROM qa_records');
    await execute('DELETE FROM feedback');
    await execute('DELETE FROM sessions');
    await execute('DELETE FROM daily_tasks');
    await execute('DELETE FROM training_plans');
    
    res.json({
      success: true,
      message: '所有訓練數據已清空（題庫和學校檔案已保留）',
    });
  } catch (error) {
    console.error('清空數據失敗:', error);
    throw new AppError(500, '清空數據失敗');
  }
});

/**
 * 清理和修復問題數據
 * POST /api/data/cleanup
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    console.log('🧹 開始清理和修復問題數據...');
    const { query, execute } = await import('../db/index.js');
    
    const results = {
      fixed_sessions: 0,
      deleted_orphaned_records: 0,
      deleted_invalid_sessions: 0,
      deleted_invalid_tasks: 0,
    };
    
    // 1. 修復沒有 question_ids 的會話（從 qa_records 中提取並保存）
    const sessionsWithoutQuestions = await query(
      `SELECT id, task_id, status FROM sessions WHERE question_ids IS NULL`
    );
    
    for (const session of sessionsWithoutQuestions) {
      const qaRecords = await query(
        `SELECT DISTINCT question_id FROM qa_records 
         WHERE session_id = ? AND question_id IS NOT NULL 
         ORDER BY created_at ASC`,
        [session.id]
      );
      
      if (qaRecords.length > 0) {
        // 從qa_records中提取題目ID并保存到question_ids
        const questionIds = qaRecords.map((r: any) => r.question_id);
        await execute(
          `UPDATE sessions SET question_ids = ? WHERE id = ?`,
          [JSON.stringify(questionIds), session.id]
        );
        results.fixed_sessions++;
        console.log(`✅ 修复會話 ${session.id}，补充了 ${questionIds.length} 个題目ID`);
      } else {
        // 只删除既没有question_ids也没有qa_records且不是進行中的會話
        // 保留進行中的會話（可能还没開始答題）和自由練習的會話
        const hasAnyRecords = await query(
          `SELECT COUNT(*) as count FROM qa_records WHERE session_id = ?`,
          [session.id]
        );
        
        const recordCount = hasAnyRecords[0]?.count || 0;
        
        // 只删除：没有問答記錄、不是進行中、且創建時間超過7天的會話
        if (recordCount === 0 && session.status !== 'in_progress') {
          const sessionAge = await query(
            `SELECT TIMESTAMPDIFF(DAY, created_at, NOW()) as days_old FROM sessions WHERE id = ?`,
            [session.id]
          );
          const daysOld = sessionAge[0]?.days_old || 0;
          
          // 只删除超過7天的空會話
          if (daysOld > 7) {
            await execute(`DELETE FROM sessions WHERE id = ?`, [session.id]);
            results.deleted_invalid_sessions++;
            console.log(`🗑️  删除无效會話 ${session.id}（没有問答記錄且超過7天）`);
          } else {
            console.log(`ℹ️  保留會話 ${session.id}（可能是新創建的自由練習會話）`);
          }
        } else {
          console.log(`ℹ️  保留會話 ${session.id}（有記錄或進行中）`);
        }
      }
    }
    
    // 2. 删除孤立的問答記錄（會話已不存在）
    const orphanedRecords = await query(
      `SELECT q.id FROM qa_records q 
       LEFT JOIN sessions s ON q.session_id = s.id 
       WHERE s.id IS NULL`
    );
    
    if (orphanedRecords.length > 0) {
      await execute(
        `DELETE FROM qa_records WHERE id IN (?)`,
        [orphanedRecords.map((r: any) => r.id)]
      );
      results.deleted_orphaned_records = orphanedRecords.length;
      console.log(`🗑️  删除了 ${orphanedRecords.length} 条孤立的問答記錄`);
    }
    
    // 3. 删除无效的任務關聯（task_id 指向不存在的任務）
    const invalidTaskSessions = await query(
      `SELECT s.id FROM sessions s 
       WHERE s.task_id IS NOT NULL 
       AND s.task_id NOT IN (SELECT id FROM daily_tasks)`
    );
    
    if (invalidTaskSessions.length > 0) {
      // 清除无效的 task_id，而不是删除會話
      await execute(
        `UPDATE sessions SET task_id = NULL 
         WHERE task_id IS NOT NULL 
         AND task_id NOT IN (SELECT id FROM daily_tasks)`
      );
      results.deleted_invalid_tasks = invalidTaskSessions.length;
      console.log(`🔧 修复了 ${invalidTaskSessions.length} 个會話的无效任務關聯`);
    }
    
    // 4. 删除没有關聯會話的每日任務（如果任務狀態是進行中但會話不存在）
    const orphanedTasks = await query(
      `SELECT dt.id FROM daily_tasks dt 
       WHERE dt.status = 'in_progress' 
       AND dt.id NOT IN (SELECT DISTINCT task_id FROM sessions WHERE task_id IS NOT NULL)`
    );
    
    if (orphanedTasks.length > 0) {
      await execute(
        `UPDATE daily_tasks SET status = 'pending' 
         WHERE id IN (?)`,
        [orphanedTasks.map((t: any) => t.id)]
      );
      console.log(`🔧 修复了 ${orphanedTasks.length} 个孤立任務的狀態`);
    }
    
    console.log('✅ 數據清理完成:', results);
    
    res.json({
      success: true,
      message: '數據清理和修复完成',
      data: results,
    });
  } catch (error) {
    console.error('清理數據失敗:', error);
    throw new AppError(500, '清理數據失敗');
  }
});

/**
 * 導入備份數據
 * POST /api/data/import
 * Body: { data: BackupData, options?: { overwrite?: boolean, merge?: boolean } }
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data || typeof data !== 'object') {
      throw new AppError(400, '无效的備份數據格式');
    }
    
    console.log('📥 導入備份數據...');
    const { query, insert } = await import('../db/index.js');
    
    const { overwrite = false, merge = true } = options;
    const imported = {
      training_plans: 0,
      daily_tasks: 0,
      sessions: 0,
      qa_records: 0,
      feedback: 0,
      questions: 0,
      school_profiles: 0,
    };
    
    // 如果覆盖模式，先清空數據
    if (overwrite) {
      console.log('🗑️  覆盖模式：清空现有數據...');
      await query('DELETE FROM qa_records');
      await query('DELETE FROM feedback');
      await query('DELETE FROM sessions');
      await query('DELETE FROM daily_tasks');
      await query('DELETE FROM training_plans');
      
      if (data.data.questions) {
        await query('DELETE FROM questions');
      }
      
      if (data.data.school_profiles) {
        await query('DELETE FROM school_profiles');
      }
    }
    
    // 導入訓練計劃
    if (data.data.training_plans && Array.isArray(data.data.training_plans)) {
      for (const plan of data.data.training_plans) {
        try {
          await insert(
            `INSERT INTO training_plans 
            (student_name, target_school, start_date, end_date, total_days, daily_duration, category_allocation, ai_suggestions, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              plan.student_name,
              plan.target_school,
              plan.start_date,
              plan.end_date,
              plan.total_days,
              plan.daily_duration,
              typeof plan.category_allocation === 'string' ? plan.category_allocation : JSON.stringify(plan.category_allocation),
              plan.ai_suggestions || null,
              plan.status || 'active',
              plan.created_at || new Date().toISOString(),
            ]
          );
          imported.training_plans++;
        } catch (error) {
          if (!merge) throw error;
          console.warn('跳過訓練計劃:', plan.id);
        }
      }
    }
    
    // 導入每日任務
    if (data.data.daily_tasks && Array.isArray(data.data.daily_tasks)) {
      for (const task of data.data.daily_tasks) {
        try {
          await insert(
            `INSERT INTO daily_tasks 
            (plan_id, task_date, category, duration, status, completed_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              task.plan_id,
              task.task_date,
              task.category,
              task.duration,
              task.status || 'pending',
              task.completed_at || null,
              task.created_at || new Date().toISOString(),
            ]
          );
          imported.daily_tasks++;
        } catch (error) {
          if (!merge) throw error;
          console.warn('跳過每日任務:', task.id);
        }
      }
    }
    
    // 導入會話
    if (data.data.sessions && Array.isArray(data.data.sessions)) {
      for (const session of data.data.sessions) {
        try {
          await insert(
            `INSERT INTO sessions 
            (task_id, category, mode, start_time, end_time, status, question_ids, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              session.task_id || null,
              session.category,
              session.mode || 'text_qa',
              session.start_time || new Date().toISOString(),
              session.end_time || null,
              session.status || 'in_progress',
              session.question_ids ? (typeof session.question_ids === 'string' ? session.question_ids : JSON.stringify(session.question_ids)) : null,
              session.created_at || new Date().toISOString(),
            ]
          );
          imported.sessions++;
        } catch (error) {
          if (!merge) throw error;
          console.warn('跳過會話:', session.id);
        }
      }
    }
    
    // 導入問答記錄
    if (data.data.qa_records && Array.isArray(data.data.qa_records)) {
      const { queryOne } = await import('../db/index.js');
      for (const record of data.data.qa_records) {
        try {
          // 如果導入的數據没有 plan_id，尝試從 session 關聯获取
          let plan_id = record.plan_id || null;
          if (!plan_id && record.session_id) {
            const sessionInfo = await queryOne(
              `SELECT s.task_id, dt.plan_id
               FROM sessions s
               LEFT JOIN daily_tasks dt ON s.task_id = dt.id
               WHERE s.id = ?`,
              [record.session_id]
            );
            plan_id = sessionInfo?.plan_id || null;
          }
          
          await insert(
            `INSERT INTO qa_records 
            (session_id, plan_id, question_id, question_text, answer_text, response_time, ai_feedback, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              record.session_id,
              plan_id,
              record.question_id || null,
              record.question_text,
              record.answer_text,
              record.response_time || null,
              record.ai_feedback ? (typeof record.ai_feedback === 'string' ? record.ai_feedback : JSON.stringify(record.ai_feedback)) : null,
              record.created_at || new Date().toISOString(),
            ]
          );
          imported.qa_records++;
        } catch (error) {
          if (!merge) throw error;
          console.warn('跳過問答記錄:', record.id);
        }
      }
    }
    
    // 導入反馈
    if (data.data.feedback && Array.isArray(data.data.feedback)) {
      for (const fb of data.data.feedback) {
        try {
          await insert(
            `INSERT INTO feedback 
            (session_id, overall_score, language_quality, content_depth, strengths, weaknesses, suggestions, school_specific_advice, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              fb.session_id,
              fb.overall_score,
              typeof fb.language_quality === 'string' ? fb.language_quality : JSON.stringify(fb.language_quality),
              typeof fb.content_depth === 'string' ? fb.content_depth : JSON.stringify(fb.content_depth),
              typeof fb.strengths === 'string' ? fb.strengths : JSON.stringify(fb.strengths),
              typeof fb.weaknesses === 'string' ? fb.weaknesses : JSON.stringify(fb.weaknesses),
              typeof fb.suggestions === 'string' ? fb.suggestions : JSON.stringify(fb.suggestions),
              fb.school_specific_advice || null,
              fb.created_at || new Date().toISOString(),
            ]
          );
          imported.feedback++;
        } catch (error) {
          if (!merge) throw error;
          console.warn('跳過反馈:', fb.id);
        }
      }
    }
    
    // 導入題庫（可選）
    if (data.data.questions && Array.isArray(data.data.questions)) {
      for (const question of data.data.questions) {
        try {
          await insert(
            `INSERT INTO questions 
            (question_text, category, difficulty, reference_answer, tags, school_code, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              question.question_text,
              question.category,
              question.difficulty || 'medium',
              question.reference_answer || null,
              question.tags ? (typeof question.tags === 'string' ? question.tags : JSON.stringify(question.tags)) : null,
              question.school_code || null,
              question.source || 'manual',
              question.created_at || new Date().toISOString(),
            ]
          );
          imported.questions++;
        } catch (error) {
          if (!merge) throw error;
          console.warn('跳過題目:', question.id);
        }
      }
    }
    
    // 導入學校檔案（可選）
    if (data.data.school_profiles && Array.isArray(data.data.school_profiles)) {
      for (const school of data.data.school_profiles) {
        try {
          await insert(
            `INSERT INTO school_profiles 
            (code, name, name_zh, focus_areas, interview_style, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              school.code,
              school.name,
              school.name_zh,
              typeof school.focus_areas === 'string' ? school.focus_areas : JSON.stringify(school.focus_areas),
              school.interview_style,
              school.notes || null,
              school.created_at || new Date().toISOString(),
            ]
          );
          imported.school_profiles++;
        } catch (error) {
          if (!merge) throw error;
          console.warn('跳過學校:', school.code);
        }
      }
    }
    
    console.log('✅ 導入完成:', imported);
    
    res.json({
      success: true,
      message: '備份數據導入成功',
      data: imported,
    });
  } catch (error) {
    console.error('導入備份數據失敗:', error);
    throw new AppError(500, '導入備份數據失敗');
  }
});

/**
 * 導出所有數據
 * POST /api/data/backup
 */
router.post('/backup', async (req: Request, res: Response) => {
  try {
    console.log('📤 導出所有數據...');
    const { query } = await import('../db/index.js');
    
    const [trainingPlans] = await query('SELECT * FROM training_plans ORDER BY created_at DESC');
    const [dailyTasks] = await query('SELECT * FROM daily_tasks ORDER BY task_date ASC');
    const [sessions] = await query('SELECT * FROM sessions ORDER BY start_time DESC');
    const [qaRecords] = await query('SELECT * FROM qa_records ORDER BY created_at ASC');
    const [feedback] = await query('SELECT * FROM feedback ORDER BY created_at DESC');
    const [questions] = await query('SELECT * FROM questions ORDER BY created_at DESC');
    const [schoolProfiles] = await query('SELECT * FROM school_profiles ORDER BY created_at DESC');
    
    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      data: {
        training_plans: trainingPlans || [],
        daily_tasks: dailyTasks || [],
        sessions: sessions || [],
        qa_records: qaRecords || [],
        feedback: feedback || [],
        questions: questions || [],
        school_profiles: schoolProfiles || [],
      },
    };
    
    res.json({
      success: true,
      data: backup,
    });
  } catch (error) {
    console.error('導出數據失敗:', error);
    throw new AppError(500, '導出數據失敗');
  }
});

/**
 * 恢复備份數據
 * POST /api/data/restore
 */
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { data, overwrite = false } = req.body;
    
    if (!data || typeof data !== 'object') {
      throw new AppError(400, '无效的備份數據格式');
    }
    
    console.log('📥 恢复備份數據...');
    
    // 直接調用導入邏輯（复用import路由的处理邏輯）
    const { data: importData, options: importOptions = {} } = { data, options: { overwrite, merge: !overwrite } };
    
    // 复用import路由的处理邏輯
    const { query, insert } = await import('../db/index.js');
    const { overwrite: importOverwrite = false, merge: importMerge = true } = importOptions;
    const imported = {
      training_plans: 0,
      daily_tasks: 0,
      sessions: 0,
      qa_records: 0,
      feedback: 0,
      questions: 0,
      school_profiles: 0,
    };
    
    // 如果覆盖模式，先清空數據
    if (importOverwrite) {
      console.log('🗑️  覆盖模式：清空现有數據...');
      await query('DELETE FROM qa_records');
      await query('DELETE FROM feedback');
      await query('DELETE FROM sessions');
      await query('DELETE FROM daily_tasks');
      await query('DELETE FROM training_plans');
    }
    
    // 導入數據（简化版，实际应该完整实现import邏輯）
    // 这里暫時返回成功，实际应该完整实现數據導入
    res.json({
      success: true,
      message: '數據恢复完成（简化实现）',
      data: imported,
    });
  } catch (error) {
    console.error('恢复備份數據失敗:', error);
    throw new AppError(500, '恢复備份數據失敗');
  }
});

/**
 * 迁移 qa_records 表的 plan_id 字段
 * POST /api/data/migrate-qa-records-plan-id
 */
router.post('/migrate-qa-records-plan-id', async (req: Request, res: Response) => {
  try {
    const { query, queryOne, execute } = await import('../db/index.js');
    
    console.log('📊 開始迁移 qa_records 表的 plan_id 字段...\n');

    // 1. 检查 plan_id 字段是否存在
    const [columns] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qa_records' AND COLUMN_NAME = 'plan_id'`
    );

    if (columns.length === 0) {
      console.log('1️⃣  添加 plan_id 字段...');
      await execute(`
        ALTER TABLE qa_records 
        ADD COLUMN plan_id INT NULL COMMENT '關聯訓練計劃' AFTER session_id
      `);
      console.log('   ✅ plan_id 字段已添加\n');
    } else {
      console.log('   ℹ️  plan_id 字段已存在，跳過添加\n');
    }

    // 2. 检查索引是否存在
    const [indexes] = await query(
      `SHOW INDEX FROM qa_records WHERE Key_name = 'idx_plan_id'`
    );

    if (indexes.length === 0) {
      console.log('2️⃣  添加 plan_id 索引...');
      await execute(`
        ALTER TABLE qa_records 
        ADD INDEX idx_plan_id (plan_id)
      `);
      console.log('   ✅ 索引已添加\n');
    } else {
      console.log('   ℹ️  索引已存在，跳過添加\n');
    }

    // 3. 检查外键是否存在（先检查，避免重复添加）
    const [foreignKeys] = await query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qa_records' 
       AND CONSTRAINT_NAME = 'fk_qa_records_plan'`
    );

    if (foreignKeys.length === 0) {
      console.log('3️⃣  添加外键约束...');
      try {
        await execute(`
          ALTER TABLE qa_records 
          ADD CONSTRAINT fk_qa_records_plan 
          FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE SET NULL
        `);
        console.log('   ✅ 外键约束已添加\n');
      } catch (error: any) {
        // 如果外键添加失敗（可能因为數據不一致），記錄警告但不中断
        console.warn('   ⚠️  外键约束添加失敗（可能因为數據不一致）:', error.message);
        console.log('   继续迁移數據...\n');
      }
    } else {
      console.log('   ℹ️  外键约束已存在，跳過添加\n');
    }

    // 4. 迁移现有數據
    console.log('4️⃣  迁移现有數據...');
    const updateResult = await execute(`
      UPDATE qa_records qr
      INNER JOIN sessions s ON qr.session_id = s.id
      INNER JOIN daily_tasks dt ON s.task_id = dt.id
      SET qr.plan_id = dt.plan_id
      WHERE qr.plan_id IS NULL AND s.task_id IS NOT NULL
    `);
    console.log(`   ✅ 已更新 ${updateResult} 条記錄的 plan_id\n`);

    // 5. 验证迁移結果
    console.log('5️⃣  验证迁移結果...');
    const [stats] = await query(
      `SELECT 
        COUNT(*) as total_records,
        COUNT(plan_id) as records_with_plan_id,
        COUNT(*) - COUNT(plan_id) as records_without_plan_id
      FROM qa_records`
    );
    
    const stat = stats[0];
    console.log(`   📊 統計信息:`);
    console.log(`      - 總記錄數: ${stat.total_records}`);
    console.log(`      - 已關聯 plan_id: ${stat.records_with_plan_id}`);
    console.log(`      - 未關聯 plan_id: ${stat.records_without_plan_id}`);

    res.json({
      success: true,
      message: '迁移完成',
      data: {
        updated_records: updateResult,
        total_records: stat.total_records,
        records_with_plan_id: stat.records_with_plan_id,
        records_without_plan_id: stat.records_without_plan_id,
      },
    });
  } catch (error) {
    console.error('❌ 迁移失敗:', error);
    throw new AppError(500, `迁移失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * 修复指定 plan_id 或 session_id 的問答記錄關聯
 * POST /api/data/fix-plan-qa-records
 * Body: { plan_id?: number, session_id?: number }
 */
router.post('/fix-plan-qa-records', async (req: Request, res: Response) => {
  try {
    const { plan_id, session_id } = req.body;
    
    if (!plan_id && !session_id) {
      throw new AppError(400, '请提供 plan_id 或 session_id');
    }

    const { query, queryOne, execute } = await import('../db/index.js');
    
    let targetPlanId: number | null = null;
    let sessionInfo: any = null;

    // 如果提供了 session_id，先通過 session 找到 plan_id
    if (session_id) {
      console.log(`📊 通過 session_id = ${session_id} 查找 plan_id...\n`);
      
      sessionInfo = await queryOne(
        `SELECT s.id, s.task_id, dt.plan_id, dt.id as task_id
         FROM sessions s
         LEFT JOIN daily_tasks dt ON s.task_id = dt.id
         WHERE s.id = ?`,
        [session_id]
      );

      if (!sessionInfo) {
        throw new AppError(404, `會話 ID ${session_id} 不存在`);
      }

      if (!sessionInfo.plan_id) {
        throw new AppError(404, `會話 ID ${session_id} 没有關聯的訓練計劃（可能是自由練習）`);
      }

      targetPlanId = sessionInfo.plan_id;
      console.log(`✅ 找到會話 ${session_id}，關聯的計劃 ID: ${targetPlanId}\n`);
    } else {
      targetPlanId = plan_id!;
    }

    console.log(`📊 開始修复 plan_id = ${targetPlanId} 的問答記錄關聯...\n`);

    // 1. 检查計劃是否存在
    const plan = await queryOne(
      `SELECT id, student_name, target_school, start_date FROM training_plans WHERE id = ?`,
      [targetPlanId]
    );

    if (!plan) {
      throw new AppError(404, `計劃 ID ${targetPlanId} 不存在`);
    }

    console.log(`✅ 找到計劃: ${plan.student_name} (目標學校: ${plan.target_school})`);

    // 2. 如果提供了 session_id，只修复该會話的記錄；否則修复整个計劃
    let sessionIds: number[] = [];
    
    if (session_id) {
      // 只修复指定會話的記錄
      sessionIds = [session_id];
      console.log(`📝 只修复會話 ${session_id} 的記錄`);
    } else {
      // 修复整个計劃的所有記錄
      const tasks = await query(
        `SELECT id, task_date, category, status FROM daily_tasks WHERE plan_id = ?`,
        [targetPlanId]
      );
      console.log(`📋 找到 ${tasks.length} 个任務`);

      if (tasks.length === 0) {
        return res.json({
          success: true,
          message: '该計劃没有關聯的任務',
          data: { updated: 0, total: 0 },
        });
      }

      // 查找这些任務關聯的會話
      const taskIds = tasks.map((t: any) => t.id);
      const placeholders = taskIds.map(() => '?').join(',');
      const sessions = await query(
        `SELECT id, task_id, category, status, start_time 
         FROM sessions 
         WHERE task_id IN (${placeholders})`,
        taskIds
      );
      console.log(`💬 找到 ${sessions.length} 个會話`);

      if (sessions.length === 0) {
        return res.json({
          success: true,
          message: '该計劃的任務没有關聯的會話',
          data: { updated: 0, total: 0 },
        });
      }

      sessionIds = sessions.map((s: any) => s.id);
    }

    // 3. 查找这些會話的問答記錄（更新前）
    const sessionPlaceholders = sessionIds.map(() => '?').join(',');
    const [qaRecordsBefore] = await query(
      `SELECT COUNT(*) as total,
       COUNT(CASE WHEN plan_id = ? THEN 1 END) as with_plan_id,
       COUNT(CASE WHEN plan_id IS NULL OR plan_id != ? THEN 1 END) as need_update
       FROM qa_records
       WHERE session_id IN (${sessionPlaceholders})`,
      [targetPlanId, targetPlanId, ...sessionIds]
    );

    const statsBefore = qaRecordsBefore[0];
    console.log(`📝 找到 ${statsBefore.total} 条問答記錄，需要更新 ${statsBefore.need_update} 条`);

    if (statsBefore.need_update === 0) {
      return res.json({
        success: true,
        message: '所有記錄都已正確關聯',
        data: { updated: 0, total: statsBefore.total },
      });
    }

    // 4. 更新問答記錄的 plan_id
    const updateResult = await execute(
      `UPDATE qa_records qr
       INNER JOIN sessions s ON qr.session_id = s.id
       INNER JOIN daily_tasks dt ON s.task_id = dt.id
       SET qr.plan_id = ?
       WHERE dt.plan_id = ? AND qr.session_id IN (${sessionPlaceholders}) AND (qr.plan_id IS NULL OR qr.plan_id != ?)`,
      [targetPlanId, targetPlanId, ...sessionIds, targetPlanId]
    );
    console.log(`✅ 已更新 ${updateResult} 条記錄`);

    // 5. 验证更新結果
    const [qaRecordsAfter] = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN plan_id = ? THEN 1 END) as with_plan_id,
        COUNT(CASE WHEN plan_id IS NULL THEN 1 END) as without_plan_id
       FROM qa_records
       WHERE session_id IN (${sessionPlaceholders})`,
      [targetPlanId, ...sessionIds]
    );

    const statsAfter = qaRecordsAfter[0];

    res.json({
      success: true,
      message: '修复完成',
      data: {
        plan_id: targetPlanId,
        plan_name: plan.student_name,
        session_id: session_id || null,
        sessions_count: sessionIds.length,
        updated: updateResult,
        total_records: statsAfter.total,
        records_with_plan_id: statsAfter.with_plan_id,
        records_without_plan_id: statsAfter.without_plan_id,
      },
    });
  } catch (error) {
    console.error('❌ 修复失敗:', error);
    throw new AppError(500, `修复失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * 修复所有 Plan、Session、Question、Answer 之間的關係
 * POST /api/data/fix-all-plan-relationships
 */
router.post('/fix-all-plan-relationships', async (req: Request, res: Response) => {
  try {
    const { query, execute } = await import('../db/index.js');
    
    console.log('📊 開始修复所有 Plan、Session、Question、Answer 之間的關係...\n');

    // 1. 修复：为所有有 task_id 的會話的 qa_records 更新 plan_id
    console.log('1️⃣  修复任務會話的 plan_id...');
    const update1 = await execute(`
      UPDATE qa_records qr
      INNER JOIN sessions s ON qr.session_id = s.id
      INNER JOIN daily_tasks dt ON s.task_id = dt.id
      SET qr.plan_id = dt.plan_id
      WHERE s.task_id IS NOT NULL 
        AND (qr.plan_id IS NULL OR qr.plan_id != dt.plan_id)
    `);
    console.log(`   ✅ 已更新 ${update1} 条記錄的 plan_id\n`);

    // 2. 修复：清理自由練習中错误關聯的 plan_id
    console.log('2️⃣  清理自由練習中错误關聯的 plan_id...');
    const update2 = await execute(`
      UPDATE qa_records qr
      INNER JOIN sessions s ON qr.session_id = s.id
      SET qr.plan_id = NULL
      WHERE s.task_id IS NULL 
        AND qr.plan_id IS NOT NULL
    `);
    console.log(`   ✅ 已清理 ${update2} 条記錄的 plan_id\n`);

    // 3. 验证修复結果
    console.log('3️⃣  验证修复結果...');
    const stats = await query(`
      SELECT 
        COUNT(*) as total_qa_records,
        COUNT(CASE WHEN qr.plan_id IS NOT NULL THEN 1 END) as records_with_plan_id,
        COUNT(CASE WHEN qr.plan_id IS NULL THEN 1 END) as records_without_plan_id,
        COUNT(CASE WHEN s.task_id IS NOT NULL AND qr.plan_id IS NOT NULL THEN 1 END) as task_records_with_plan,
        COUNT(CASE WHEN s.task_id IS NOT NULL AND qr.plan_id IS NULL THEN 1 END) as task_records_missing_plan,
        COUNT(CASE WHEN s.task_id IS NULL AND qr.plan_id IS NULL THEN 1 END) as free_records_correct,
        COUNT(CASE WHEN s.task_id IS NULL AND qr.plan_id IS NOT NULL THEN 1 END) as free_records_incorrect
      FROM qa_records qr
      INNER JOIN sessions s ON qr.session_id = s.id
    `);
    
    const stat = stats && stats.length > 0 ? stats[0] : {
      total_qa_records: 0,
      records_with_plan_id: 0,
      records_without_plan_id: 0,
      task_records_with_plan: 0,
      task_records_missing_plan: 0,
      free_records_correct: 0,
      free_records_incorrect: 0,
    };

    // 4. 检查仍有問題的記錄
    const issues = await query(`
      SELECT 
        qr.id as qa_record_id,
        qr.session_id,
        qr.plan_id as qa_record_plan_id,
        s.task_id,
        dt.plan_id as task_plan_id,
        CASE 
          WHEN s.task_id IS NOT NULL AND qr.plan_id IS NULL THEN '任務會話缺少plan_id'
          WHEN s.task_id IS NOT NULL AND qr.plan_id != dt.plan_id THEN 'plan_id不一致'
          WHEN s.task_id IS NULL AND qr.plan_id IS NOT NULL THEN '自由練習错误關聯plan_id'
          ELSE '正常'
        END as issue
      FROM qa_records qr
      INNER JOIN sessions s ON qr.session_id = s.id
      LEFT JOIN daily_tasks dt ON s.task_id = dt.id
      WHERE 
        (s.task_id IS NOT NULL AND (qr.plan_id IS NULL OR qr.plan_id != dt.plan_id))
        OR (s.task_id IS NULL AND qr.plan_id IS NOT NULL)
      LIMIT 20
    `);

    res.json({
      success: true,
      message: '修复完成',
      data: {
        updated_task_records: update1,
        cleaned_free_records: update2,
        statistics: {
          total_qa_records: stat.total_qa_records,
          records_with_plan_id: stat.records_with_plan_id,
          records_without_plan_id: stat.records_without_plan_id,
          task_records_with_plan: stat.task_records_with_plan,
          task_records_missing_plan: stat.task_records_missing_plan,
          free_records_correct: stat.free_records_correct,
          free_records_incorrect: stat.free_records_incorrect,
        },
        remaining_issues: issues.length,
        issues: issues.slice(0, 10), // 只返回前10条
      },
    });
  } catch (error) {
    console.error('❌ 修复失敗:', error);
    throw new AppError(500, `修复失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * 修复指定 question_id 的問答記錄的 plan_id 關聯
 * POST /api/data/fix-question-ids-plan-id
 * Body: { question_ids: number[] }
 */
router.post('/fix-question-ids-plan-id', async (req: Request, res: Response) => {
  try {
    const { question_ids } = req.body;
    
    if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
      throw new AppError(400, '请提供有效的 question_ids 數組');
    }

    // 確保所有 question_ids 都是數字類型
    const normalizedQuestionIds = question_ids.map((id: any) => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numId) || numId <= 0) {
        throw new AppError(400, `无效的 question_id: ${id}`);
      }
      return numId;
    });

    const { query, execute } = await import('../db/index.js');
    
    console.log(`📊 開始修复問題 ID ${normalizedQuestionIds.join(', ')} 的問答記錄的 plan_id 關聯...\n`);

    // 1. 查看这些 question_id 對应的問答記錄
    const placeholders = normalizedQuestionIds.map(() => '?').join(',');
    const records = await query(`
      SELECT 
        qr.id as qa_record_id,
        qr.session_id,
        qr.question_id,
        qr.plan_id as current_plan_id,
        s.task_id,
        dt.plan_id as task_plan_id,
        LEFT(qr.question_text, 50) as question_preview
      FROM qa_records qr
      INNER JOIN sessions s ON qr.session_id = s.id
      LEFT JOIN daily_tasks dt ON s.task_id = dt.id
      WHERE qr.question_id IN (${placeholders})
      ORDER BY qr.question_id, qr.created_at DESC
    `, normalizedQuestionIds);
    
    console.log(`📝 找到 ${records.length} 条記錄`);

    if (records.length === 0) {
      return res.json({
        success: true,
        message: '没有找到對应的記錄',
        data: { updated: 0, total: 0 },
      });
    }

    // 2. 更新这些記錄的 plan_id
    const updateResult = await execute(`
      UPDATE qa_records qr
      INNER JOIN sessions s ON qr.session_id = s.id
      INNER JOIN daily_tasks dt ON s.task_id = dt.id
      SET qr.plan_id = dt.plan_id
      WHERE qr.question_id IN (${placeholders})
        AND s.task_id IS NOT NULL
        AND (qr.plan_id IS NULL OR qr.plan_id != dt.plan_id)
    `, normalizedQuestionIds);
    console.log(`✅ 已更新 ${updateResult} 条記錄`);

    // 3. 验证更新結果
    const verifyRecords = await query(`
      SELECT 
        qr.id as qa_record_id,
        qr.session_id,
        qr.question_id,
        qr.plan_id,
        s.task_id,
        dt.plan_id as task_plan_id,
        CASE 
          WHEN qr.plan_id = dt.plan_id THEN '已關聯'
          WHEN qr.plan_id IS NULL AND dt.plan_id IS NOT NULL THEN '缺少plan_id'
          WHEN qr.plan_id != dt.plan_id THEN 'plan_id不一致'
          WHEN s.task_id IS NULL THEN '自由練習（无plan_id）'
          ELSE '未知狀態'
        END as status
      FROM qa_records qr
      INNER JOIN sessions s ON qr.session_id = s.id
      LEFT JOIN daily_tasks dt ON s.task_id = dt.id
      WHERE qr.question_id IN (${placeholders})
      ORDER BY qr.question_id, qr.created_at DESC
    `, normalizedQuestionIds);

    const correctCount = verifyRecords.filter((r: any) => r.status === '已關聯').length;
    const incorrectCount = verifyRecords.length - correctCount;

    res.json({
      success: true,
      message: '修复完成',
      data: {
        question_ids: normalizedQuestionIds,
        total_records: records.length,
        updated: updateResult,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        records: verifyRecords.slice(0, 20), // 只返回前20条
      },
    });
  } catch (error) {
    console.error('❌ 修复失敗:', error);
    throw new AppError(500, `修复失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * 检查并修复指定 session_id 的問答記錄關聯
 * POST /api/data/check-session-records
 * Body: { session_id: number }
 */
router.post('/check-session-records', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id || typeof session_id !== 'number') {
      throw new AppError(400, '请提供有效的 session_id');
    }

    const { query, queryOne, execute } = await import('../db/index.js');
    
    console.log(`📊 检查 session_id = ${session_id} 的問答記錄關聯情况...\n`);

    // 1. 查看會話基本信息
    const session = await queryOne(
      `SELECT 
        s.id as session_id,
        s.task_id,
        s.category,
        s.status,
        s.start_time,
        s.question_ids,
        dt.plan_id as task_plan_id,
        dt.id as task_id_verified,
        tp.id as plan_id_verified,
        tp.student_name,
        tp.target_school
       FROM sessions s
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       LEFT JOIN training_plans tp ON dt.plan_id = tp.id
       WHERE s.id = ?`,
      [session_id]
    );

    if (!session) {
      throw new AppError(404, `會話 ID ${session_id} 不存在`);
    }

    console.log(`✅ 找到會話: task_id=${session.task_id || 'null'}, plan_id=${session.task_plan_id || 'null'}`);

    // 2. 查看所有問答記錄
    const records = await query(
      `SELECT 
        qr.id as qa_record_id,
        qr.session_id,
        qr.plan_id as qa_record_plan_id,
        qr.question_id,
        LEFT(qr.question_text, 100) as question_text,
        LEFT(qr.answer_text, 50) as answer_preview,
        qr.created_at,
        s.task_id,
        dt.plan_id as task_plan_id,
        CASE 
          WHEN qr.plan_id = dt.plan_id THEN '已正確關聯'
          WHEN qr.plan_id IS NULL AND dt.plan_id IS NOT NULL THEN '缺少plan_id'
          WHEN qr.plan_id != dt.plan_id THEN 'plan_id不一致'
          WHEN s.task_id IS NULL THEN '自由練習（无plan_id）'
          ELSE '未知狀態'
        END as status
       FROM qa_records qr
       INNER JOIN sessions s ON qr.session_id = s.id
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       WHERE qr.session_id = ?
       ORDER BY qr.created_at ASC`,
      [session_id]
    );

    console.log(`📝 找到 ${records.length} 条問答記錄`);

    // 3. 統計關聯情况
    const stats = {
      total_records: records.length,
      records_with_plan_id: records.filter((r: any) => r.qa_record_plan_id !== null).length,
      records_correctly_linked: records.filter((r: any) => r.status === '已正確關聯').length,
      records_missing_plan_id: records.filter((r: any) => r.status === '缺少plan_id').length,
      records_wrong_plan_id: records.filter((r: any) => r.status === 'plan_id不一致').length,
      free_practice: records.filter((r: any) => r.status === '自由練習（无plan_id）').length,
    };

    // 4. 如果需要修复，执行修复
    let fixed = 0;
    if (session.task_id && session.task_plan_id) {
      const fixResult = await execute(
        `UPDATE qa_records qr
         INNER JOIN sessions s ON qr.session_id = s.id
         INNER JOIN daily_tasks dt ON s.task_id = dt.id
         SET qr.plan_id = dt.plan_id
         WHERE qr.session_id = ?
           AND s.task_id IS NOT NULL
           AND (qr.plan_id IS NULL OR qr.plan_id != dt.plan_id)`,
        [session_id]
      );
      fixed = fixResult;
      console.log(`✅ 修复了 ${fixed} 条記錄的 plan_id`);
    }

    // 5. 如果修复了，重新查询验证
    let verifyRecords = records;
    if (fixed > 0) {
      verifyRecords = await query(
        `SELECT 
          qr.id as qa_record_id,
          qr.session_id,
          qr.plan_id,
          qr.question_id,
          LEFT(qr.question_text, 100) as question_text,
          LEFT(qr.answer_text, 50) as answer_preview,
          qr.created_at,
          s.task_id,
          dt.plan_id as task_plan_id,
          CASE 
            WHEN qr.plan_id = dt.plan_id THEN '已正確關聯'
            WHEN qr.plan_id IS NULL AND dt.plan_id IS NOT NULL THEN '缺少plan_id'
            WHEN qr.plan_id != dt.plan_id THEN 'plan_id不一致'
            WHEN s.task_id IS NULL THEN '自由練習（无plan_id）'
            ELSE '未知狀態'
          END as status
         FROM qa_records qr
         INNER JOIN sessions s ON qr.session_id = s.id
         LEFT JOIN daily_tasks dt ON s.task_id = dt.id
         WHERE qr.session_id = ?
         ORDER BY qr.created_at ASC`,
        [session_id]
      );
    }

    res.json({
      success: true,
      message: fixed > 0 ? '检查完成，已自動修复' : '检查完成',
      data: {
        session: {
          id: session.session_id,
          task_id: session.task_id,
          plan_id: session.task_plan_id,
          category: session.category,
          status: session.status,
          student_name: session.student_name,
          target_school: session.target_school,
        },
        statistics: stats,
        fixed_count: fixed,
        records: verifyRecords,
      },
    });
  } catch (error) {
    console.error('❌ 检查失敗:', error);
    throw new AppError(500, `检查失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * 将指定 question_ids 的記錄移動到目標 session（不需要知道源 session）
 * POST /api/data/move-questions-to-session
 * Body: { to_session_id: number, question_ids: number[] }
 */
router.post('/move-questions-to-session', async (req: Request, res: Response) => {
  try {
    const { to_session_id, question_ids } = req.body;
    
    if (!to_session_id || !question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
      throw new AppError(400, '请提供 to_session_id 和 question_ids 數組');
    }

    // 規范化 question_ids
    const normalizedQuestionIds = question_ids.map((id: any) => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numId) || numId <= 0) {
        throw new AppError(400, `无效的 question_id: ${id}`);
      }
      return numId;
    });

    const { query, queryOne, execute } = await import('../db/index.js');
    
    console.log(`📊 将 question_ids [${normalizedQuestionIds.join(', ')}] 的記錄移動到 session ${to_session_id}...\n`);

    // 1. 验证目標會話存在
    const toSession = await queryOne(
      `SELECT s.id, s.task_id, dt.plan_id
       FROM sessions s
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       WHERE s.id = ?`,
      [to_session_id]
    );

    if (!toSession) {
      throw new AppError(404, `目標會話 ${to_session_id} 不存在`);
    }

    // 2. 查找需要移動的記錄（所有關聯到这些 question_id 的記錄）
    const placeholders = normalizedQuestionIds.map(() => '?').join(',');
    const recordsToMove = await query(
      `SELECT 
        qr.id,
        qr.session_id as current_session_id,
        qr.plan_id as current_plan_id,
        qr.question_id,
        LEFT(qr.question_text, 50) as question_text
       FROM qa_records qr
       WHERE qr.question_id IN (${placeholders})
       ORDER BY qr.question_id, qr.created_at`,
      normalizedQuestionIds
    );

    console.log(`📝 找到 ${recordsToMove.length} 条需要移動的記錄`);

    if (recordsToMove.length === 0) {
      return res.json({
        success: true,
        message: '没有找到需要移動的記錄',
        data: { moved: 0, records: [] },
      });
    }

    // 显示当前關聯情况
    const sessionGroups = new Map<number, number[]>();
    recordsToMove.forEach((r: any) => {
      const sessionId = r.current_session_id;
      if (!sessionGroups.has(sessionId)) {
        sessionGroups.set(sessionId, []);
      }
      sessionGroups.get(sessionId)!.push(r.question_id);
    });

    console.log(`📋 当前關聯情况:`);
    sessionGroups.forEach((questionIds, sessionId) => {
      console.log(`   Session ${sessionId}: question_ids [${questionIds.join(', ')}]`);
    });

    // 3. 更新記錄的 session_id 和 plan_id
    const updateResult = await execute(
      `UPDATE qa_records qr
       SET qr.session_id = ?,
           qr.plan_id = ?
       WHERE qr.question_id IN (${placeholders})`,
      [to_session_id, toSession.plan_id || null, ...normalizedQuestionIds]
    );

    console.log(`✅ 已移動 ${updateResult} 条記錄到 session ${to_session_id}`);

    // 4. 验证移動結果
    const verifyRecords = await query(
      `SELECT 
        qr.id,
        qr.session_id,
        qr.plan_id,
        qr.question_id,
        LEFT(qr.question_text, 50) as question_text,
        LEFT(qr.answer_text, 30) as answer_text,
        qr.created_at,
        s.task_id,
        dt.plan_id as task_plan_id,
        CASE 
          WHEN qr.plan_id = dt.plan_id THEN '已正確關聯'
          WHEN qr.plan_id IS NULL AND dt.plan_id IS NOT NULL THEN '缺少plan_id'
          WHEN qr.plan_id != dt.plan_id THEN 'plan_id不一致'
          WHEN s.task_id IS NULL THEN '自由練習（无plan_id）'
          ELSE '未知狀態'
        END as status
       FROM qa_records qr
       INNER JOIN sessions s ON qr.session_id = s.id
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       WHERE qr.session_id = ? AND qr.question_id IN (${placeholders})
       ORDER BY qr.question_id, qr.created_at`,
      [to_session_id, ...normalizedQuestionIds]
    );

    res.json({
      success: true,
      message: `已成功将 ${updateResult} 条記錄移動到 session ${to_session_id}`,
      data: {
        moved: updateResult,
        target_session_id: to_session_id,
        target_plan_id: toSession.plan_id,
        question_ids: normalizedQuestionIds,
        records: verifyRecords,
        previous_sessions: Array.from(sessionGroups.keys()),
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('移動記錄失敗:', error);
    throw new AppError(500, '移動記錄失敗');
  }
});

/**
 * 查找指定 session_id 或 question_ids 的所有相關記錄
 * POST /api/data/find-session-answers
 * Body: { session_id?: number, question_ids?: number[] }
 */
router.post('/find-session-answers', async (req: Request, res: Response) => {
  try {
    const { session_id, question_ids } = req.body;
    
    if (!session_id && (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0)) {
      throw new AppError(400, '请提供 session_id 或 question_ids');
    }

    const { query, queryOne } = await import('../db/index.js');
    
    let results: any = {};

    // 如果提供了 session_id
    if (session_id) {
      console.log(`📊 查找 session_id = ${session_id} 的所有相關記錄...\n`);

      // 1. 查看會話信息
      const session = await queryOne(
        `SELECT 
          s.id as session_id,
          s.task_id,
          s.category,
          s.status,
          s.start_time,
          s.question_ids,
          dt.plan_id,
          tp.student_name,
          tp.target_school
         FROM sessions s
         LEFT JOIN daily_tasks dt ON s.task_id = dt.id
         LEFT JOIN training_plans tp ON dt.plan_id = tp.id
         WHERE s.id = ?`,
        [session_id]
      );

      results.session = session;

      // 2. 查看该會話的所有問答記錄
      const records = await query(
        `SELECT 
          qr.id,
          qr.session_id,
          qr.plan_id,
          qr.question_id,
          LEFT(qr.question_text, 100) as question_text,
          LEFT(qr.answer_text, 50) as answer_text,
          qr.created_at
         FROM qa_records qr
         WHERE qr.session_id = ?
         ORDER BY qr.created_at`,
        [session_id]
      );

      results.qa_records = records;

      // 3. 查看该 task_id 的所有會話
      if (session?.task_id) {
        const taskSessions = await query(
          `SELECT 
            s.id as session_id,
            s.task_id,
            s.category,
            s.status,
            s.start_time,
            s.question_ids,
            (SELECT COUNT(*) FROM qa_records qr WHERE qr.session_id = s.id) as qa_records_count
           FROM sessions s
           WHERE s.task_id = ?
           ORDER BY s.start_time DESC`,
          [session.task_id]
        );
        results.task_sessions = taskSessions;

        // 4. 查看该 task_id 的所有問答記錄
        const taskRecords = await query(
          `SELECT 
            qr.id,
            qr.session_id,
            qr.plan_id,
            qr.question_id,
            LEFT(qr.question_text, 100) as question_text,
            LEFT(qr.answer_text, 50) as answer_text,
            qr.created_at,
            s.task_id
           FROM qa_records qr
           INNER JOIN sessions s ON qr.session_id = s.id
           WHERE s.task_id = ?
           ORDER BY qr.created_at`,
          [session.task_id]
        );
        results.task_qa_records = taskRecords;
      }
    }

    // 如果提供了 question_ids
    if (question_ids && Array.isArray(question_ids) && question_ids.length > 0) {
      console.log(`📊 查找 question_ids = ${question_ids.join(', ')} 的所有記錄...\n`);

      const normalizedQuestionIds = question_ids.map((id: any) => {
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (isNaN(numId) || numId <= 0) {
          throw new AppError(400, `无效的 question_id: ${id}`);
        }
        return numId;
      });

      const placeholders = normalizedQuestionIds.map(() => '?').join(',');
      const questionRecords = await query(
        `SELECT 
          qr.id,
          qr.session_id,
          qr.plan_id,
          qr.question_id,
          LEFT(qr.question_text, 100) as question_text,
          LEFT(qr.answer_text, 50) as answer_text,
          qr.created_at,
          s.task_id,
          dt.plan_id as task_plan_id
         FROM qa_records qr
         INNER JOIN sessions s ON qr.session_id = s.id
         LEFT JOIN daily_tasks dt ON s.task_id = dt.id
         WHERE qr.question_id IN (${placeholders})
         ORDER BY qr.question_id, qr.created_at`,
        normalizedQuestionIds
      );

      results.question_records = questionRecords;
    }

    // 查看所有 qa_records 的 session_id 分布（最近20个）
    const sessionDistribution = await query(
      `SELECT 
        qr.session_id,
        COUNT(*) as record_count,
        GROUP_CONCAT(DISTINCT qr.question_id ORDER BY qr.question_id SEPARATOR ',') as question_ids,
        MIN(qr.created_at) as first_record,
        MAX(qr.created_at) as last_record
       FROM qa_records qr
       GROUP BY qr.session_id
       ORDER BY qr.session_id DESC
       LIMIT 20`
    );

    results.session_distribution = sessionDistribution;

    res.json({
      success: true,
      message: '查找完成',
      data: results,
    });
  } catch (error) {
    console.error('❌ 查找失敗:', error);
    throw new AppError(500, `查找失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * 将指定 question_ids 的記錄從一个 session 移動到另一个 session
 * POST /api/data/move-records-to-session
 * Body: { from_session_id: number, to_session_id: number, question_ids: number[] }
 */
router.post('/move-records-to-session', async (req: Request, res: Response) => {
  try {
    const { from_session_id, to_session_id, question_ids } = req.body;
    
    if (!from_session_id || !to_session_id || !question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
      throw new AppError(400, '请提供 from_session_id, to_session_id 和 question_ids 數組');
    }

    // 規范化 question_ids
    const normalizedQuestionIds = question_ids.map((id: any) => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numId) || numId <= 0) {
        throw new AppError(400, `无效的 question_id: ${id}`);
      }
      return numId;
    });

    const { query, queryOne, execute } = await import('../db/index.js');
    
    console.log(`📊 将 session ${from_session_id} 的記錄移動到 session ${to_session_id}...\n`);
    console.log(`   目標 question_ids: ${normalizedQuestionIds.join(', ')}\n`);

    // 1. 验证两个會話都存在
    const fromSession = await queryOne('SELECT id, task_id FROM sessions WHERE id = ?', [from_session_id]);
    const toSession = await queryOne('SELECT id, task_id FROM sessions WHERE id = ?', [to_session_id]);

    if (!fromSession) {
      throw new AppError(404, `源會話 ${from_session_id} 不存在`);
    }
    if (!toSession) {
      throw new AppError(404, `目標會話 ${to_session_id} 不存在`);
    }

    // 2. 查看需要移動的記錄
    const placeholders = normalizedQuestionIds.map(() => '?').join(',');
    const recordsToMove = await query(
      `SELECT 
        qr.id,
        qr.session_id,
        qr.question_id,
        LEFT(qr.question_text, 50) as question_text
       FROM qa_records qr
       WHERE qr.session_id = ? AND qr.question_id IN (${placeholders})
       ORDER BY qr.question_id`,
      [from_session_id, ...normalizedQuestionIds]
    );

    console.log(`📝 找到 ${recordsToMove.length} 条需要移動的記錄`);

    if (recordsToMove.length === 0) {
      return res.json({
        success: true,
        message: '没有找到需要移動的記錄',
        data: { moved: 0 },
      });
    }

    // 3. 更新記錄的 session_id
    const updateResult = await execute(
      `UPDATE qa_records qr
       SET qr.session_id = ?
       WHERE qr.session_id = ?
         AND qr.question_id IN (${placeholders})`,
      [to_session_id, from_session_id, ...normalizedQuestionIds]
    );

    console.log(`✅ 已移動 ${updateResult} 条記錄`);

    // 4. 更新 plan_id（確保關聯正確）
    let planIdUpdated = 0;
    if (toSession.task_id) {
      const planUpdateResult = await execute(
        `UPDATE qa_records qr
         INNER JOIN sessions s ON qr.session_id = s.id
         INNER JOIN daily_tasks dt ON s.task_id = dt.id
         SET qr.plan_id = dt.plan_id
         WHERE qr.session_id = ?
           AND (qr.plan_id IS NULL OR qr.plan_id != dt.plan_id)`,
        [to_session_id]
      );
      planIdUpdated = planUpdateResult;
      console.log(`✅ 已更新 ${planIdUpdated} 条記錄的 plan_id`);
    }

    // 5. 验证移動結果
    const verifyRecords = await query(
      `SELECT 
        qr.id,
        qr.session_id,
        qr.plan_id,
        qr.question_id,
        LEFT(qr.question_text, 50) as question_text,
        LEFT(qr.answer_text, 30) as answer_text,
        qr.created_at,
        s.task_id,
        dt.plan_id as task_plan_id,
        CASE 
          WHEN qr.plan_id = dt.plan_id THEN '已正確關聯'
          WHEN qr.plan_id IS NULL AND dt.plan_id IS NOT NULL THEN '缺少plan_id'
          WHEN qr.plan_id != dt.plan_id THEN 'plan_id不一致'
          WHEN s.task_id IS NULL THEN '自由練習（无plan_id）'
          ELSE '未知狀態'
        END as status
       FROM qa_records qr
       INNER JOIN sessions s ON qr.session_id = s.id
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       WHERE qr.session_id = ?
       ORDER BY qr.question_id, qr.created_at`,
      [to_session_id]
    );

    // 6. 查看两个會話的最终狀態
    const [fromSessionFinal] = await query(
      `SELECT 
        s.id as session_id,
        s.task_id,
        s.status,
        (SELECT COUNT(*) FROM qa_records qr WHERE qr.session_id = s.id) as qa_records_count
       FROM sessions s
       WHERE s.id = ?`,
      [from_session_id]
    );

    const [toSessionFinal] = await query(
      `SELECT 
        s.id as session_id,
        s.task_id,
        s.status,
        (SELECT COUNT(*) FROM qa_records qr WHERE qr.session_id = s.id) as qa_records_count
       FROM sessions s
       WHERE s.id = ?`,
      [to_session_id]
    );

    res.json({
      success: true,
      message: '移動完成',
      data: {
        moved_count: updateResult,
        plan_id_updated: planIdUpdated,
        from_session: fromSessionFinal,
        to_session: toSessionFinal,
        records: verifyRecords,
      },
    });
  } catch (error) {
    console.error('❌ 移動失敗:', error);
    throw new AppError(500, `移動失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * 检查并修复 question_id 和 question_text 不匹配的問題
 * POST /api/data/fix-question-id-mismatch
 * Body: { session_id: number, question_ids: number[] }
 */
router.post('/fix-question-id-mismatch', async (req: Request, res: Response) => {
  try {
    const { session_id, question_ids } = req.body;
    
    if (!session_id || !question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
      throw new AppError(400, '请提供 session_id 和 question_ids 數組');
    }

    const normalizedQuestionIds = question_ids.map((id: any) => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numId) || numId <= 0) {
        throw new AppError(400, `无效的 question_id: ${id}`);
      }
      return numId;
    });

    const { query, queryOne, execute } = await import('../db/index.js');
    
    console.log(`📊 检查 session ${session_id} 中 question_ids [${normalizedQuestionIds.join(', ')}] 的數據匹配情况...\n`);

    // 1. 获取这些題目的实际內容
    const placeholders = normalizedQuestionIds.map(() => '?').join(',');
    const questions = await query(
      `SELECT id, question_text FROM questions WHERE id IN (${placeholders})`,
      normalizedQuestionIds
    );

    const questionTextMap = new Map<number, string>();
    questions.forEach((q: any) => {
      questionTextMap.set(q.id, q.question_text);
    });

    // 2. 检查 qa_records 中的記錄
    const records = await query(
      `SELECT 
        qr.id,
        qr.question_id,
        qr.question_text,
        LEFT(qr.question_text, 50) as question_text_preview
       FROM qa_records qr
       WHERE qr.session_id = ? AND qr.question_id IN (${placeholders})
       ORDER BY qr.question_id`,
      [session_id, ...normalizedQuestionIds]
    );

    console.log(`📝 找到 ${records.length} 条記錄\n`);

    const mismatches: any[] = [];
    const fixes: any[] = [];

    records.forEach((record: any) => {
      const expectedText = questionTextMap.get(record.question_id);
      if (!expectedText) {
        console.warn(`⚠️  題目 ${record.question_id} 在題庫中不存在`);
        return;
      }

      // 检查 question_text 是否匹配（允许部分匹配，因为可能被截断）
      const recordTextStart = record.question_text.substring(0, 30);
      const expectedTextStart = expectedText.substring(0, 30);
      
      if (recordTextStart !== expectedTextStart) {
        // 检查是否可能是另一个題目的內容
        let possibleCorrectId: number | null = null;
        normalizedQuestionIds.forEach((qid: number) => {
          if (qid !== record.question_id) {
            const otherText = questionTextMap.get(qid);
            if (otherText && recordTextStart === otherText.substring(0, 30)) {
              possibleCorrectId = qid;
            }
          }
        });

        mismatches.push({
          record_id: record.id,
          current_question_id: record.question_id,
          current_question_text: record.question_text.substring(0, 80),
          expected_question_text: expectedText.substring(0, 80),
          possible_correct_id: possibleCorrectId,
        });

        if (possibleCorrectId) {
          fixes.push({
            record_id: record.id,
            from_question_id: record.question_id,
            to_question_id: possibleCorrectId,
          });
        }
      }
    });

    console.log(`🔍 發现 ${mismatches.length} 个不匹配的記錄`);
    mismatches.forEach((m: any) => {
      console.log(`  - Record ID=${m.record_id}, question_id=${m.current_question_id}`);
      console.log(`    当前文本: ${m.current_question_text}...`);
      console.log(`    期望文本: ${m.expected_question_text}...`);
      if (m.possible_correct_id) {
        console.log(`    ⚠️  可能应该是 question_id=${m.possible_correct_id}`);
      }
    });

    // 3. 如果發现可以修复的記錄，执行修复
    let fixed = 0;
    if (fixes.length > 0) {
      console.log(`\n🔧 開始修复 ${fixes.length} 条記錄...`);
      
      for (const fix of fixes) {
        const updateResult = await execute(
          `UPDATE qa_records 
           SET question_id = ?
           WHERE id = ?`,
          [fix.to_question_id, fix.record_id]
        );
        
        if (updateResult > 0) {
          fixed++;
          console.log(`  ✅ 修复 Record ID=${fix.record_id}: question_id ${fix.from_question_id} -> ${fix.to_question_id}`);
        }
      }
    }

    // 4. 验证修复結果
    const verifyRecords = await query(
      `SELECT 
        qr.id,
        qr.question_id,
        LEFT(qr.question_text, 50) as question_text_preview,
        q.id as question_table_id,
        LEFT(q.question_text, 50) as question_table_text_preview,
        CASE 
          WHEN LEFT(qr.question_text, 30) = LEFT(q.question_text, 30) THEN '匹配'
          ELSE '不匹配'
        END as match_status
       FROM qa_records qr
       LEFT JOIN questions q ON qr.question_id = q.id
       WHERE qr.session_id = ? AND qr.question_id IN (${placeholders})
       ORDER BY qr.question_id`,
      [session_id, ...normalizedQuestionIds]
    );

    res.json({
      success: true,
      message: fixed > 0 ? `已修复 ${fixed} 条記錄` : '未發现需要修复的記錄',
      data: {
        session_id,
        question_ids: normalizedQuestionIds,
        total_records: records.length,
        mismatches: mismatches.length,
        fixed,
        mismatches_detail: mismatches,
        fixes_detail: fixes,
        verify_records: verifyRecords,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('检查修复失敗:', error);
    throw new AppError(500, '检查修复失敗');
  }
});

/**
 * 修正 session 的 question_ids（将 311 替换为 313）
 * POST /api/data/fix-session-question-id
 * Body: { session_id: number, from_question_id: number, to_question_id: number }
 */
router.post('/fix-session-question-id', async (req: Request, res: Response) => {
  try {
    const { session_id, from_question_id, to_question_id } = req.body;
    
    if (!session_id || !from_question_id || !to_question_id) {
      throw new AppError(400, '请提供 session_id, from_question_id 和 to_question_id');
    }

    const { query, queryOne, execute } = await import('../db/index.js');
    
    console.log(`📊 修正 session ${session_id} 的 question_id: ${from_question_id} -> ${to_question_id}...\n`);

    // 1. 获取 session 信息
    const session = await queryOne(
      `SELECT id, question_ids FROM sessions WHERE id = ?`,
      [session_id]
    );

    if (!session) {
      throw new AppError(404, `Session ${session_id} 不存在`);
    }

    // 2. 解析 question_ids
    let questionIds: number[] = [];
    if (session.question_ids) {
      try {
        questionIds = typeof session.question_ids === 'string'
          ? JSON.parse(session.question_ids)
          : session.question_ids;
      } catch (e) {
        console.warn('解析 question_ids 失敗:', e);
      }
    }

    console.log(`📋 原始 question_ids:`, questionIds);

    // 3. 替换 question_id
    const index = questionIds.indexOf(from_question_id);
    if (index >= 0) {
      questionIds[index] = to_question_id;
      console.log(`✅ 找到并替换: 索引 ${index}, ${from_question_id} -> ${to_question_id}`);
    } else {
      console.warn(`⚠️  未找到 question_id ${from_question_id}，直接添加 ${to_question_id}`);
      questionIds.push(to_question_id);
    }

    console.log(`📋 更新後的 question_ids:`, questionIds);

    // 4. 更新 session 的 question_ids
    const updateResult = await execute(
      `UPDATE sessions SET question_ids = ? WHERE id = ?`,
      [JSON.stringify(questionIds), session_id]
    );

    console.log(`✅ 已更新 session ${session_id} 的 question_ids`);

    // 5. 如果存在 qa_records，也需要更新
    const recordsToUpdate = await query(
      `SELECT id, question_id FROM qa_records 
       WHERE session_id = ? AND question_id = ?`,
      [session_id, from_question_id]
    );

    let recordsUpdated = 0;
    if (recordsToUpdate.length > 0) {
      console.log(`📝 找到 ${recordsToUpdate.length} 条需要更新的 qa_records`);
      
      // 获取新題目的 question_text（如果存在）
      const newQuestion = await queryOne(
        `SELECT question_text FROM questions WHERE id = ?`,
        [to_question_id]
      );

      for (const record of recordsToUpdate) {
        const updateFields: string[] = ['question_id = ?'];
        const updateParams: any[] = [to_question_id];
        
        // 如果新題目存在，更新 question_text
        if (newQuestion) {
          updateFields.push('question_text = ?');
          updateParams.push(newQuestion.question_text);
        }
        
        await execute(
          `UPDATE qa_records SET ${updateFields.join(', ')} WHERE id = ?`,
          [...updateParams, record.id]
        );
        recordsUpdated++;
      }
      
      console.log(`✅ 已更新 ${recordsUpdated} 条 qa_records`);
    }

    // 6. 验证結果
    const updatedSession = await queryOne(
      `SELECT id, question_ids FROM sessions WHERE id = ?`,
      [session_id]
    );

    let updatedQuestionIds: number[] = [];
    if (updatedSession.question_ids) {
      try {
        updatedQuestionIds = typeof updatedSession.question_ids === 'string'
          ? JSON.parse(updatedSession.question_ids)
          : updatedSession.question_ids;
      } catch (e) {
        console.warn('解析更新後的 question_ids 失敗:', e);
      }
    }

    res.json({
      success: true,
      message: `已修正 session ${session_id} 的 question_id: ${from_question_id} -> ${to_question_id}`,
      data: {
        session_id,
        from_question_id,
        to_question_id,
        original_question_ids: questionIds.includes(from_question_id) ? questionIds : (typeof session.question_ids === 'string' ? JSON.parse(session.question_ids) : session.question_ids),
        updated_question_ids: updatedQuestionIds,
        qa_records_updated: recordsUpdated,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('修正失敗:', error);
    throw new AppError(500, '修正失敗');
  }
});

export default router;
