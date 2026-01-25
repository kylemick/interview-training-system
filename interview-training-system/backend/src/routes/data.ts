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
    
    // 导入前检查现有数据
    const { query } = await import('../db/index.js');
    const [existing] = await query<{ count: number }>('SELECT COUNT(*) as count FROM school_profiles');
    const beforeCount = existing?.count || 0;
    
    const { seedSchoolProfiles } = await import('../db/seeds/schools.js');
    await seedSchoolProfiles();
    
    // 导入后统计
    const [after] = await query<{ count: number }>('SELECT COUNT(*) as count FROM school_profiles');
    const afterCount = after?.count || 0;
    const imported = afterCount - beforeCount;
    
    res.json({
      success: true,
      message: '学校种子数据导入完成',
      data: {
        before: beforeCount,
        after: afterCount,
        imported: imported,
      },
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
    
    // 导入前检查现有数据
    const { query } = await import('../db/index.js');
    const [existing] = await query<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const beforeCount = existing?.count || 0;
    
    const { seedQuestions } = await import('../db/seeds/questions.js');
    await seedQuestions();
    
    // 导入后统计
    const [after] = await query<{ count: number }>('SELECT COUNT(*) as count FROM questions');
    const afterCount = after?.count || 0;
    const imported = afterCount - beforeCount;
    
    res.json({
      success: true,
      message: '题库种子数据导入完成',
      data: {
        before: beforeCount,
        after: afterCount,
        imported: imported,
      },
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
 * 清空所有训练数据（保留题库和学校档案）
 * DELETE /api/data/clear
 */
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    console.log('🗑️  清空训练数据...');
    const { query, execute } = await import('../db/index.js');
    
    // 按照外键依赖顺序删除
    await execute('DELETE FROM qa_records');
    await execute('DELETE FROM feedback');
    await execute('DELETE FROM sessions');
    await execute('DELETE FROM daily_tasks');
    await execute('DELETE FROM training_plans');
    
    res.json({
      success: true,
      message: '所有训练数据已清空（题库和学校档案已保留）',
    });
  } catch (error) {
    console.error('清空数据失败:', error);
    throw new AppError(500, '清空数据失败');
  }
});

/**
 * 清理和修复问题数据
 * POST /api/data/cleanup
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    console.log('🧹 开始清理和修复问题数据...');
    const { query, execute } = await import('../db/index.js');
    
    const results = {
      fixed_sessions: 0,
      deleted_orphaned_records: 0,
      deleted_invalid_sessions: 0,
      deleted_invalid_tasks: 0,
    };
    
    // 1. 修复没有 question_ids 的会话（从 qa_records 中提取并保存）
    const sessionsWithoutQuestions = await query(
      `SELECT id FROM sessions WHERE question_ids IS NULL`
    );
    
    for (const session of sessionsWithoutQuestions) {
      const qaRecords = await query(
        `SELECT DISTINCT question_id FROM qa_records 
         WHERE session_id = ? AND question_id IS NOT NULL 
         ORDER BY created_at ASC`,
        [session.id]
      );
      
      if (qaRecords.length > 0) {
        const questionIds = qaRecords.map((r: any) => r.question_id);
        await execute(
          `UPDATE sessions SET question_ids = ? WHERE id = ?`,
          [JSON.stringify(questionIds), session.id]
        );
        results.fixed_sessions++;
        console.log(`✅ 修复会话 ${session.id}，补充了 ${questionIds.length} 个题目ID`);
      } else {
        // 如果会话没有任何问答记录，可能是无效会话，删除它
        await execute(`DELETE FROM sessions WHERE id = ?`, [session.id]);
        results.deleted_invalid_sessions++;
        console.log(`🗑️  删除无效会话 ${session.id}（没有问答记录）`);
      }
    }
    
    // 2. 删除孤立的问答记录（会话已不存在）
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
      console.log(`🗑️  删除了 ${orphanedRecords.length} 条孤立的问答记录`);
    }
    
    // 3. 删除无效的任务关联（task_id 指向不存在的任务）
    const invalidTaskSessions = await query(
      `SELECT s.id FROM sessions s 
       WHERE s.task_id IS NOT NULL 
       AND s.task_id NOT IN (SELECT id FROM daily_tasks)`
    );
    
    if (invalidTaskSessions.length > 0) {
      // 清除无效的 task_id，而不是删除会话
      await execute(
        `UPDATE sessions SET task_id = NULL 
         WHERE task_id IS NOT NULL 
         AND task_id NOT IN (SELECT id FROM daily_tasks)`
      );
      results.deleted_invalid_tasks = invalidTaskSessions.length;
      console.log(`🔧 修复了 ${invalidTaskSessions.length} 个会话的无效任务关联`);
    }
    
    // 4. 删除没有关联会话的每日任务（如果任务状态是进行中但会话不存在）
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
      console.log(`🔧 修复了 ${orphanedTasks.length} 个孤立任务的状态`);
    }
    
    console.log('✅ 数据清理完成:', results);
    
    res.json({
      success: true,
      message: '数据清理和修复完成',
      data: results,
    });
  } catch (error) {
    console.error('清理数据失败:', error);
    throw new AppError(500, '清理数据失败');
  }
});

/**
 * 导入备份数据
 * POST /api/data/import
 * Body: { data: BackupData, options?: { overwrite?: boolean, merge?: boolean } }
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data || typeof data !== 'object') {
      throw new AppError(400, '无效的备份数据格式');
    }
    
    console.log('📥 导入备份数据...');
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
    
    // 如果覆盖模式，先清空数据
    if (overwrite) {
      console.log('🗑️  覆盖模式：清空现有数据...');
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
    
    // 导入训练计划
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
          console.warn('跳过训练计划:', plan.id);
        }
      }
    }
    
    // 导入每日任务
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
          console.warn('跳过每日任务:', task.id);
        }
      }
    }
    
    // 导入会话
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
          console.warn('跳过会话:', session.id);
        }
      }
    }
    
    // 导入问答记录
    if (data.data.qa_records && Array.isArray(data.data.qa_records)) {
      for (const record of data.data.qa_records) {
        try {
          await insert(
            `INSERT INTO qa_records 
            (session_id, question_id, question_text, answer_text, response_time, ai_feedback, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              record.session_id,
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
          console.warn('跳过问答记录:', record.id);
        }
      }
    }
    
    // 导入反馈
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
          console.warn('跳过反馈:', fb.id);
        }
      }
    }
    
    // 导入题库（可选）
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
          console.warn('跳过题目:', question.id);
        }
      }
    }
    
    // 导入学校档案（可选）
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
          console.warn('跳过学校:', school.code);
        }
      }
    }
    
    console.log('✅ 导入完成:', imported);
    
    res.json({
      success: true,
      message: '备份数据导入成功',
      data: imported,
    });
  } catch (error) {
    console.error('导入备份数据失败:', error);
    throw new AppError(500, '导入备份数据失败');
  }
});

/**
 * 导出所有数据
 * POST /api/data/backup
 */
router.post('/backup', async (req: Request, res: Response) => {
  try {
    console.log('📤 导出所有数据...');
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
    console.error('导出数据失败:', error);
    throw new AppError(500, '导出数据失败');
  }
});

/**
 * 恢复备份数据
 * POST /api/data/restore
 */
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { data, overwrite = false } = req.body;
    
    if (!data || typeof data !== 'object') {
      throw new AppError(400, '无效的备份数据格式');
    }
    
    console.log('📥 恢复备份数据...');
    
    // 调用导入接口
    const importResponse = await router.handle({
      method: 'POST',
      url: '/import',
      body: { data, options: { overwrite, merge: !overwrite } },
    } as any);
    
    res.json(importResponse);
  } catch (error) {
    console.error('恢复备份数据失败:', error);
    throw new AppError(500, '恢复备份数据失败');
  }
});

export default router;
