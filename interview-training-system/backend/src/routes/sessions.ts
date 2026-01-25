/**
 * 练习会话路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute, queryWithPagination } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { ensureQuestionsAvailable } from '../utils/questionHelper.js';

const router = Router();

// 创建练习会话
router.post('/', async (req: Request, res: Response) => {
  try {
    const { task_id, category, mode = 'text_qa', question_count = 10 } = req.body;

    if (!category) {
      throw new AppError(400, '缺少必填字段：category');
    }

    // 如果有关联任务，检查是否已有进行中的会话（防止重复创建）
    if (task_id) {
      const existingSession = await queryOne(
        `SELECT id FROM sessions WHERE task_id = ? AND status = 'in_progress'`,
        [task_id]
      );
      
      if (existingSession) {
        throw new AppError(409, '该任务已有进行中的会话，请继续现有会话');
      }
    }

    // 使用自动生成函数确保有可用题目
    const questionCount = parseInt(question_count as string) || 10;
    const questions = await ensureQuestionsAvailable(
      category,
      questionCount,
      undefined, // 自由模式不指定学校
      'medium'
    );

    if (questions.length === 0) {
      // 如果自动生成也失败，返回友好错误但不导致服务崩溃
      console.error(`❌ 无法为类别 ${category} 获取或生成题目`);
      throw new AppError(500, `无法为类别(${category})生成题目，请稍后重试或手动添加题目`);
    }

    const questionIds = questions.map((q: any) => q.id);

    // 创建会话，保存题目ID列表
    const sessionId = await insert(
      `INSERT INTO sessions (task_id, category, mode, status, question_ids)
       VALUES (?, ?, ?, ?, ?)`,
      [task_id || null, category, mode, 'in_progress', JSON.stringify(questionIds)]
    );

    console.log(`✅ 创建练习会话: ID=${sessionId}, 类别=${category}, 题目数=${questionIds.length}, 任务ID=${task_id || '无'}`);

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

    // 统一类别名称：将 logical-thinking 转换为 logic-thinking（兼容旧数据）
    if (session.category === 'logical-thinking') {
      session.category = 'logic-thinking';
    }

    // 获取问答记录
    // 确保 id 是数字类型（MySQL 需要数字类型匹配）
    const sessionIdNum = parseInt(id, 10)
    if (isNaN(sessionIdNum)) {
      console.error(`❌ 无效的会话ID: ${id}`)
      throw new AppError(400, '无效的会话ID')
    }
    
    console.log(`🔍 查询问答记录: session_id = ${sessionIdNum} (原始: ${id})`)
    console.log(`📋 会话信息: id=${session.id}, question_ids=${JSON.stringify(session.question_ids)}`)
    
    // 先检查 question_ids 是否存在
    let questionIds: number[] = [];
    if (session.question_ids) {
      try {
        questionIds = typeof session.question_ids === 'string'
          ? JSON.parse(session.question_ids)
          : session.question_ids;
        console.log(`📋 解析后的 question_ids:`, questionIds)
      } catch (e) {
        console.warn(`解析会话 ${session.id} 的 question_ids 失败:`, e);
      }
    }
    
    // 查询问答记录
    const qaRecords = await query(
      `SELECT id, question_id, question_text, answer_text, response_time, ai_feedback, created_at
       FROM qa_records WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionIdNum]
    );
    
    console.log(`📊 查询结果: 找到 ${qaRecords.length} 条问答记录`)
    
    // 如果 question_ids 有数据但 qa_records 为空，可能是数据不一致
    if (questionIds.length > 0 && qaRecords.length === 0) {
      console.warn(`⚠️  警告: 会话 ${sessionIdNum} 有 ${questionIds.length} 个 question_ids，但没有对应的 qa_records`)
      console.warn(`    question_ids:`, questionIds)
      
      // 检查这些 question_id 是否在其他 session_id 中
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
        console.log(`🔍 这些 question_id 在其他会话中的记录:`, checkOtherSessions)
      }
    }
    
    if (qaRecords.length === 0) {
      // 检查数据库中是否真的没有记录（使用字符串和数字两种方式）
      const checkQueryNum = await query(
        `SELECT COUNT(*) as count FROM qa_records WHERE session_id = ?`,
        [sessionIdNum]
      )
      const checkQueryStr = await query(
        `SELECT COUNT(*) as count FROM qa_records WHERE session_id = ?`,
        [String(sessionIdNum)]
      )
      console.log(`🔍 数据库检查 (数字): session_id=${sessionIdNum} 的记录数 = ${checkQueryNum[0]?.count || 0}`)
      console.log(`🔍 数据库检查 (字符串): session_id="${String(sessionIdNum)}" 的记录数 = ${checkQueryStr[0]?.count || 0}`)
      
      // 检查所有 qa_records 的 session_id 类型和值
      const allSessionIds = await query(
        `SELECT DISTINCT session_id, COUNT(*) as count 
         FROM qa_records 
         GROUP BY session_id 
         ORDER BY session_id 
         LIMIT 20`
      )
      console.log(`📋 数据库中所有会话的问答记录统计:`, allSessionIds)
      
      // 检查是否有接近的 session_id（可能是数据错误）
      const nearbySessions = await query(
        `SELECT session_id, COUNT(*) as count 
         FROM qa_records 
         WHERE session_id BETWEEN ? AND ?
         GROUP BY session_id`,
        [sessionIdNum - 2, sessionIdNum + 2]
      )
      console.log(`🔍 附近的 session_id (${sessionIdNum - 2} 到 ${sessionIdNum + 2}):`, nearbySessions)
    }

    // 解析 JSON 字段（添加错误处理）
    const formattedRecords = qaRecords.map((record: any) => {
      let ai_feedback = null;
      try {
        if (record.ai_feedback) {
          // 处理字符串和对象两种情况
          if (typeof record.ai_feedback === 'string') {
            ai_feedback = JSON.parse(record.ai_feedback);
          } else if (typeof record.ai_feedback === 'object' && record.ai_feedback !== null) {
            ai_feedback = record.ai_feedback;
          }
        }
      } catch (error) {
        console.warn(`解析记录 ${record.id} 的 ai_feedback 失败:`, error);
        console.warn(`原始数据:`, record.ai_feedback);
        ai_feedback = null;
      }
      return { ...record, ai_feedback };
    });

    // 组织任务信息（包含计划名称）
    const taskInfo = session.task_id ? {
      task_id: session.task_id,
      duration: session.duration,
      task_date: session.task_date,
      plan_id: session.plan_id,
      student_name: session.student_name,
      target_school: session.target_school,
      plan_name: session.student_name && session.target_school 
        ? `${session.student_name}的${session.target_school}冲刺计划`
        : null,
    } : null;

    // questionIds 已在上面解析，这里不需要重复声明

    // 计算实际题目数量：使用question_ids的长度，如果为空则从qa_records统计唯一题目
    let actualQuestionCount = questionIds.length;
    if (actualQuestionCount === 0 && formattedRecords.length > 0) {
      // 如果没有question_ids，从qa_records中统计唯一的题目ID
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
        total_answered: formattedRecords.length, // 已回答的记录数
        total_questions: actualQuestionCount, // 实际题目数量
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

    // 确保 id 是数字类型（MySQL 需要数字类型匹配）
    const sessionIdNum = parseInt(id, 10)
    if (isNaN(sessionIdNum)) {
      console.error(`❌ 无效的会话ID: ${id}`)
      throw new AppError(400, '无效的会话ID')
    }
    
    // 获取会话信息，包括关联的 plan_id（通过 task_id 获取）
    // 确保 plan_id 正确关联：session -> task -> plan
    const sessionInfo = await queryOne(
      `SELECT s.id, s.task_id, s.category, dt.plan_id, dt.id as task_id_verified
       FROM sessions s
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       WHERE s.id = ?`,
      [sessionIdNum]
    );
    
    if (!sessionInfo) {
      throw new AppError(404, '会话不存在');
    }
    
    // 验证 plan_id 的关联关系
    let finalPlanId = null;
    if (sessionInfo.task_id) {
      // 有 task_id，必须从 task 获取 plan_id
      if (!sessionInfo.plan_id) {
        console.warn(`⚠️  警告: 会话 ${sessionIdNum} 有 task_id=${sessionInfo.task_id}，但无法获取 plan_id，可能是任务已删除`)
      } else {
        finalPlanId = sessionInfo.plan_id;
      }
    }
    // 如果没有 task_id，plan_id 保持为 null（自由练习）
    
    // 保存问答记录，包含 plan_id 和 question_id
    const recordId = await insert(
      `INSERT INTO qa_records (session_id, plan_id, question_id, question_text, answer_text, response_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionIdNum, 
        finalPlanId,              // 从 task 关联的 plan_id（如果有）
        question_id || null,       // 题目ID
        question_text, 
        answer_text, 
        response_time || null
      ]
    );

    console.log(`✅ 保存答案: 会话=${sessionIdNum}, 记录=${recordId}, plan_id=${finalPlanId || 'null'}, question_id=${question_id || 'null'}, task_id=${sessionInfo.task_id || 'null'}`)
    
    // 验证记录是否成功插入
    const verifyRecord = await queryOne(
      `SELECT id, session_id, plan_id, question_id FROM qa_records WHERE id = ?`,
      [recordId]
    )
    if (verifyRecord) {
      console.log(`✅ 验证成功: 记录 ${recordId} 已保存，session_id=${verifyRecord.session_id}, plan_id=${verifyRecord.plan_id || 'null'}, question_id=${verifyRecord.question_id || 'null'}`)
    } else {
      console.error(`❌ 验证失败: 记录 ${recordId} 未找到`)
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
    console.error('提交答案失败:', error);
    throw new AppError(500, '提交答案失败');
  }
});

// 完成会话
router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证会话存在并获取关联的任务ID和计划ID
    const session = await queryOne(
      `SELECT s.id, s.status, s.task_id, s.category, dt.plan_id
       FROM sessions s
       LEFT JOIN daily_tasks dt ON s.task_id = dt.id
       WHERE s.id = ?`, 
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
    let planId = null;
    if (session.task_id) {
      const affectedRows = await execute(
        'UPDATE daily_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', session.task_id]
      );
      taskCompleted = affectedRows > 0;
      planId = session.plan_id;
      
      if (taskCompleted) {
        console.log(`✅ 任务自动完成: 任务ID=${session.task_id}, 计划ID=${planId || 'null'}`);
      }
    }

    // 验证并修复 qa_records 的 plan_id（确保所有记录都正确关联）
    if (session.task_id && session.plan_id) {
      const fixResult = await execute(
        `UPDATE qa_records qr
         SET qr.plan_id = ?
         WHERE qr.session_id = ? 
           AND (qr.plan_id IS NULL OR qr.plan_id != ?)`,
        [session.plan_id, id, session.plan_id]
      );
      if (fixResult > 0) {
        console.log(`✅ 修复了 ${fixResult} 条问答记录的 plan_id: 会话=${id}, plan_id=${session.plan_id}`);
      }
    }

    console.log(`✅ 会话完成: ID=${id}, 类别=${session.category}, 关联任务=${session.task_id || '无'}, 计划ID=${planId || '无'}`);

    res.json({
      success: true,
      message: taskCompleted ? '会话已完成,任务已标记为完成' : '会话已完成',
      data: {
        session_id: id,
        task_id: session.task_id,
        plan_id: planId,
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

    // 查询所有会话，计算题目数量
    // 优先使用question_ids的长度，如果为空则从qa_records统计唯一题目数
    // 注意：包含所有会话（包括自由练习），只要它们有题目或问答记录
    const queryLimit = limitNum * 2; // 多查询一些，因为后面会去重
    const allSessions = await query(
      `SELECT s.id, s.category, s.mode, s.start_time, s.end_time, s.status, s.task_id, s.question_ids,
              COALESCE(JSON_LENGTH(s.question_ids), 0) as question_ids_count,
              (SELECT COUNT(DISTINCT qr.question_id) FROM qa_records qr WHERE qr.session_id = s.id AND qr.question_id IS NOT NULL) as qa_records_count,
              (SELECT COUNT(*) FROM qa_records qr WHERE qr.session_id = s.id) as total_qa_records
       FROM sessions s
       WHERE (s.question_ids IS NOT NULL AND JSON_LENGTH(s.question_ids) > 0)
          OR EXISTS (SELECT 1 FROM qa_records qr WHERE qr.session_id = s.id)
          OR s.status = 'in_progress'  -- 包含进行中的会话（即使还没有题目或记录）
       ORDER BY s.start_time DESC
       LIMIT ${queryLimit}`,
      [] // LIMIT不使用参数绑定
    );
    
    // 计算正确的题目数量：优先使用question_ids，如果为0则使用qa_records的唯一题目数
    // 对于自由练习，如果没有question_ids但有qa_records，使用qa_records的唯一题目数
    const sessionsWithCount = allSessions.map((session: any) => {
      let questionCount = 0;
      
      if (session.question_ids_count > 0) {
        // 优先使用question_ids的长度
        questionCount = session.question_ids_count;
      } else if (session.qa_records_count > 0) {
        // 如果没有question_ids，使用qa_records的唯一题目数
        questionCount = session.qa_records_count;
      } else if (session.total_qa_records > 0) {
        // 如果qa_records_count为0但total_qa_records > 0，说明有记录但question_id为NULL
        // 这种情况下，使用总记录数作为题目数（兼容旧数据）
        questionCount = session.total_qa_records;
      }
      
      return {
        ...session,
        question_count: questionCount
      };
    });

    // 去重：如果有相同task_id的多个会话，只保留最新的一个（优先保留进行中的）
    const sessionMap = new Map<string, any>();
    sessionsWithCount.forEach((session: any) => {
      if (session.task_id) {
        // 任务关联的会话：每个任务只保留一个
        const key = `task_${session.task_id}`;
        const existing = sessionMap.get(key);
        if (!existing) {
          sessionMap.set(key, session);
        } else {
          // 优先保留进行中的会话，否则保留最新的
          if (session.status === 'in_progress' && existing.status !== 'in_progress') {
            sessionMap.set(key, session);
          } else if (existing.status !== 'in_progress' && 
                     new Date(session.start_time) > new Date(existing.start_time)) {
            sessionMap.set(key, session);
          }
        }
      } else {
        // 自由练习会话：每个会话ID都是唯一的
        sessionMap.set(`free_${session.id}`, session);
      }
    });

    // 转换为数组，过滤掉没有题目且没有问答记录的会话，并按时间排序
    // 注意：保留有question_ids、qa_records或正在进行中的会话
    const uniqueSessions = Array.from(sessionMap.values())
      .filter((s: any) => {
        // 保留有题目的会话，或者有问答记录的会话，或者正在进行中的会话
        return s.question_count > 0 || s.status === 'in_progress';
      })
      .sort((a: any, b: any) => {
        // 先按状态排序（进行中的在前），再按时间排序
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
