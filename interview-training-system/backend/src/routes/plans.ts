/**
 * 訓練計劃路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateTrainingPlan, generateTrainingPlanFromWeakness } from '../ai/trainingPlanner.js';
import { ensureQuestionsAvailable } from '../utils/questionHelper.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

/**
 * 從設置文件讀取學生信息
 */
async function getStudentInfoFromSettings(): Promise<{ student_name: string; target_school?: string }> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    return {
      student_name: settings.student_name || '學生',
      target_school: settings.target_school,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // 文件不存在，返回默認值
      return { student_name: '學生' };
    }
    console.error('讀取設置失敗:', error);
    return { student_name: '學生' };
  }
}

const router = Router();

// 獲取所有訓練計劃
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, student_name } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (student_name) {
      conditions.push('student_name = ?');
      params.push(student_name);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const plans = await query(
      `SELECT id, student_name, target_school, start_date, end_date, total_days, 
              daily_duration, category_allocation, ai_suggestions, status, created_at, updated_at
       FROM training_plans
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    // 解析 JSON 字段（添加錯誤處理）
    const formattedPlans = plans.map((plan: any) => {
      let category_allocation = {};
      try {
        category_allocation = plan.category_allocation
          ? (typeof plan.category_allocation === 'string' 
              ? JSON.parse(plan.category_allocation) 
              : plan.category_allocation)
          : {};
      } catch (error) {
        console.warn(`解析計劃 ${plan.id} 的 category_allocation 失敗:`, error);
        category_allocation = {};
      }
      return { ...plan, category_allocation };
    });

    res.json({
      success: true,
      data: formattedPlans,
      total: formattedPlans.length,
    });
  } catch (error) {
    console.error('獲取訓練計劃列表失敗:', error);
    throw new AppError(500, '獲取訓練計劃列表失敗');
  }
});

// ⚠️ 重要：特定路由必須在參數化路由之前定義
// 獲取今日任務
router.get('/today/tasks', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const tasks = await query(
      `SELECT dt.id, dt.plan_id, dt.task_date, dt.category, dt.duration, 
              dt.question_ids, dt.status, dt.completed_at,
              tp.student_name, tp.target_school
       FROM daily_tasks dt
       INNER JOIN training_plans tp ON dt.plan_id = tp.id
       WHERE dt.task_date = ? AND tp.status = ?
       ORDER BY dt.category`,
      [today, 'active']
    );

    // 解析 JSON 字段（添加錯誤處理）
    const formattedTasks = tasks.map((task: any) => {
      let question_ids = [];
      try {
        question_ids = task.question_ids
          ? (typeof task.question_ids === 'string'
              ? JSON.parse(task.question_ids)
              : task.question_ids)
          : [];
      } catch (error) {
        console.warn(`解析任務 ${task.id} 的 question_ids 失敗:`, error);
        question_ids = [];
      }
      return { ...task, question_ids };
    });

    res.json({
      success: true,
      data: formattedTasks,
      total: formattedTasks.length,
    });
  } catch (error) {
    console.error('獲取今日任務失敗:', error);
    throw new AppError(500, '獲取今日任務失敗');
  }
});

// 獲取未完成任務列表 (支持指定日期和狀態篩選)
router.get('/pending-tasks', async (req: Request, res: Response) => {
  try {
    const { date, status } = req.query;
    
    // 默認使用今天的日期
    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];
    
    const conditions: string[] = ['dt.task_date = ?', 'tp.status = ?'];
    const params: any[] = [targetDate, 'active'];
    
    // 如果指定了狀態,添加狀態篩選
    if (status) {
      conditions.push('dt.status = ?');
      params.push(status);
    } else {
      // 默認只返回未完成的任務
      conditions.push("dt.status IN ('pending', 'in_progress')");
    }
    
    const tasks = await query(
      `SELECT dt.id, dt.plan_id, dt.task_date, dt.category, dt.duration, 
              dt.question_ids, dt.status, dt.completed_at,
              tp.student_name, tp.target_school,
              (SELECT COUNT(*) FROM sessions WHERE task_id = dt.id AND status = 'in_progress') as has_active_session
       FROM daily_tasks dt
       INNER JOIN training_plans tp ON dt.plan_id = tp.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY 
         CASE dt.status
           WHEN 'pending' THEN 1
           WHEN 'in_progress' THEN 2
           WHEN 'completed' THEN 3
           ELSE 4
         END,
         dt.id ASC`,
      params
    );
    
    // 解析 JSON 字段
    const formattedTasks = tasks.map((task: any) => {
      let question_ids = [];
      try {
        question_ids = task.question_ids
          ? (typeof task.question_ids === 'string'
              ? JSON.parse(task.question_ids)
              : task.question_ids)
          : [];
      } catch (error) {
        console.warn(`解析任務 ${task.id} 的 question_ids 失敗:`, error);
        question_ids = [];
      }
      return { 
        ...task, 
        question_ids,
        has_active_session: task.has_active_session > 0
      };
    });
    
    res.json({
      success: true,
      data: formattedTasks,
      total: formattedTasks.length,
      date: targetDate,
    });
  } catch (error) {
    console.error('獲取未完成任務失敗:', error);
    throw new AppError(500, '獲取未完成任務失敗');
  }
});

// 獲取單個訓練計劃詳情 (必須在特定路由之後)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const plan = await queryOne(
      `SELECT id, student_name, target_school, start_date, end_date, total_days,
              daily_duration, category_allocation, ai_suggestions, status, created_at, updated_at
       FROM training_plans WHERE id = ?`,
      [id]
    );

    if (!plan) {
      throw new AppError(404, '訓練計劃不存在');
    }

    // 解析 JSON 字段（添加錯誤處理）
    let category_allocation = {};
    try {
      category_allocation = plan.category_allocation
        ? (typeof plan.category_allocation === 'string'
            ? JSON.parse(plan.category_allocation)
            : plan.category_allocation)
        : {};
    } catch (error) {
      console.warn(`解析計劃 ${plan.id} 的 category_allocation 失敗:`, error);
      category_allocation = {};
    }

    const formattedPlan = { ...plan, category_allocation };

    // 獲取該計劃的所有每日任務，並關聯會話信息
    const tasks = await query(
      `SELECT dt.id, dt.task_date, dt.category, dt.duration, dt.question_ids, dt.status, dt.completed_at,
              (SELECT id FROM sessions WHERE task_id = dt.id ORDER BY start_time DESC LIMIT 1) as session_id
       FROM daily_tasks dt
       WHERE dt.plan_id = ?
       ORDER BY dt.task_date ASC`,
      [id]
    );

    // 解析 JSON 字段並獲取會話信息（添加錯誤處理）
    const formattedTasks = await Promise.all(tasks.map(async (task: any) => {
      let question_ids = [];
      try {
        question_ids = task.question_ids
          ? (typeof task.question_ids === 'string'
              ? JSON.parse(task.question_ids)
              : task.question_ids)
          : [];
      } catch (error) {
        console.warn(`解析任務 ${task.id} 的 question_ids 失敗:`, error);
        question_ids = [];
      }
      
      // 獲取會話信息（優先獲取已完成的會話，如果沒有則獲取最新的）
      let session_info = null;
      if (task.session_id) {
        try {
          // 確保 session_id 是數字類型
          const sessionIdNum = typeof task.session_id === 'string' 
            ? parseInt(task.session_id, 10) 
            : task.session_id;
          
          if (!isNaN(sessionIdNum)) {
            const qaCount = await queryOne(
              `SELECT COUNT(*) as count FROM qa_records WHERE session_id = ?`,
              [sessionIdNum]
            );
            session_info = {
              session_id: sessionIdNum,
              qa_records_count: qaCount?.count || 0
            };
          }
        } catch (error) {
          console.warn(`獲取任務 ${task.id} 的會話信息失敗:`, error);
        }
      } else {
        // 如果沒有找到會話，嘗試查找該任務的所有會話（可能有多條）
        try {
          const allSessions = await query(
            `SELECT id FROM sessions WHERE task_id = ? ORDER BY start_time DESC LIMIT 1`,
            [task.id]
          );
          if (allSessions.length > 0) {
            const sessionId = allSessions[0].id;
            const qaCount = await queryOne(
              `SELECT COUNT(*) as count FROM qa_records WHERE session_id = ?`,
              [sessionId]
            );
            session_info = {
              session_id: sessionId,
              qa_records_count: qaCount?.count || 0
            };
          }
        } catch (error) {
          console.warn(`查找任務 ${task.id} 的會話失敗:`, error);
        }
      }
      
      return { ...task, question_ids, session_info };
    }));

    res.json({
      success: true,
      data: {
        plan: formattedPlan,
        tasks: formattedTasks,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('獲取訓練計劃詳情失敗:', error);
    throw new AppError(500, '獲取訓練計劃詳情失敗');
  }
});

// 創建訓練計劃（AI 生成）
router.post('/', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, daily_duration, target_school: requestTargetSchool } = req.body;

    // 從設置獲取學生信息
    const settings = await getStudentInfoFromSettings();
    const student_name = settings.student_name;
    const target_school = requestTargetSchool || settings.target_school;

    // 驗證必填字段
    if (!student_name) {
      throw new AppError(400, '請先在設置頁面配置學生姓名');
    }
    if (!target_school) {
      throw new AppError(400, '請先在設置頁面配置目標學校，或在創建計劃時選擇目標學校');
    }
    if (!start_date || !end_date || !daily_duration) {
      throw new AppError(400, '缺少必填字段：start_date, end_date, daily_duration');
    }

    // 驗證日期
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError(400, '無效的日期格式');
    }

    if (endDate <= startDate) {
      throw new AppError(400, '結束日期必須晚於開始日期');
    }

    // 計算總天數
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log(`🤖 生成訓練計劃: ${student_name} -> ${target_school} (${totalDays}天)`);

    // 調用 AI 生成訓練計劃
    const generatedPlan = await generateTrainingPlan({
      student_name,
      target_school,
      start_date,
      end_date,
      total_days: totalDays,
      daily_duration,
    });

    // 保存計劃
    const planId = await insert(
      `INSERT INTO training_plans (student_name, target_school, start_date, end_date, total_days, daily_duration, category_allocation, ai_suggestions, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_name,
        target_school,
        start_date,
        end_date,
        totalDays,
        daily_duration,
        JSON.stringify(generatedPlan.category_allocation),
        generatedPlan.ai_suggestions,
        'active',
      ]
    );

    // 保存每日任務
    for (const task of generatedPlan.daily_tasks) {
      await insert(
        `INSERT INTO daily_tasks (plan_id, task_date, category, duration, question_ids, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [planId, task.task_date, task.category, task.duration, JSON.stringify(task.question_ids || []), 'pending']
      );
    }

    console.log(`✅ 訓練計劃已創建: ID=${planId}, 包含 ${generatedPlan.daily_tasks.length} 個每日任務`);

    res.status(201).json({
      success: true,
      message: '訓練計劃創建成功',
      data: {
        plan_id: planId,
        total_tasks: generatedPlan.daily_tasks.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('創建訓練計劃失敗:', error);
    throw new AppError(500, '創建訓練計劃失敗');
  }
});

// 基於弱點創建訓練計劃
router.post('/from-weakness', async (req: Request, res: Response) => {
  try {
    const { weakness_id, start_date, end_date, daily_duration, target_school: requestTargetSchool } = req.body;

    // 驗證必填字段
    if (!weakness_id || !start_date || !end_date || !daily_duration) {
      throw new AppError(400, '缺少必填字段：weakness_id, start_date, end_date, daily_duration');
    }

    // 從設置獲取學生信息
    const settings = await getStudentInfoFromSettings();
    const student_name = settings.student_name;
    const target_school = requestTargetSchool || settings.target_school;

    if (!student_name) {
      throw new AppError(400, '請先在設置頁面配置學生姓名');
    }

    // 驗證日期
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError(400, '無效的日期格式');
    }

    if (endDate <= startDate) {
      throw new AppError(400, '結束日期必須晚於開始日期');
    }

    // 計算總天數
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 獲取弱點信息
    const weakness = await queryOne(
      'SELECT * FROM student_weaknesses WHERE id = ?',
      [weakness_id]
    );

    if (!weakness) {
      throw new AppError(404, '弱點記錄不存在');
    }

    console.log(`🤖 基於弱點生成訓練計劃: ${student_name} -> ${target_school || '未指定'}, 弱點ID=${weakness_id}, 類別=${weakness.category} (${totalDays}天)`);

    // 調用 AI 生成針對性訓練計劃
    const generatedPlan = await generateTrainingPlanFromWeakness(
      {
        weakness_id,
        start_date,
        end_date,
        total_days: totalDays,
        daily_duration,
        target_school: target_school || null,
        student_name: student_name,
      },
      weakness
    );

    // 保存計劃
    const planId = await insert(
      `INSERT INTO training_plans (student_name, target_school, start_date, end_date, total_days, daily_duration, category_allocation, ai_suggestions, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_name,
        target_school || null,
        start_date,
        end_date,
        totalDays,
        daily_duration,
        JSON.stringify(generatedPlan.category_allocation),
        generatedPlan.ai_suggestions,
        'active',
      ]
    );

    // 保存每日任務
    for (const task of generatedPlan.daily_tasks) {
      await insert(
        `INSERT INTO daily_tasks (plan_id, task_date, category, duration, question_ids, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [planId, task.task_date, task.category, task.duration, JSON.stringify(task.question_ids || []), 'pending']
      );
    }

    // 為每日任務生成相關題目（針對弱點類別）
    const weaknessCategoryTasks = generatedPlan.daily_tasks.filter(t => t.category === weakness.category);
    if (weaknessCategoryTasks.length > 0) {
      console.log(`📝 為 ${weaknessCategoryTasks.length} 個弱點類別任務生成題目...`);
      // TODO: 可以在這裡調用題目生成API，為任務生成針對性題目
      // 暫時留空，後續可以增強
    }

    console.log(`✅ 基於弱點的訓練計劃已創建: ID=${planId}, 包含 ${generatedPlan.daily_tasks.length} 個每日任務`);

    res.status(201).json({
      success: true,
      message: '訓練計劃創建成功',
      data: {
        plan_id: planId,
        total_tasks: generatedPlan.daily_tasks.length,
        weakness_category: weakness.category,
        weakness_category_tasks: weaknessCategoryTasks.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('基於弱點創建訓練計劃失敗:', error);
    throw new AppError(500, '創建訓練計劃失敗');
  }
});

// 更新訓練計劃狀態
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'completed', 'paused'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, `無效的狀態，必須是: ${validStatuses.join(', ')}`);
    }

    const affectedRows = await execute(
      'UPDATE training_plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    if (affectedRows === 0) {
      throw new AppError(404, '訓練計劃不存在');
    }

    res.json({
      success: true,
      message: '計劃狀態已更新',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('更新計劃狀態失敗:', error);
    throw new AppError(500, '更新計劃狀態失敗');
  }
});

// 刪除訓練計劃
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 檢查計劃是否存在
    const existing = await queryOne('SELECT id FROM training_plans WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError(404, '訓練計劃不存在');
    }

    // 刪除計劃（會級聯刪除每日任務）
    const affectedRows = await execute('DELETE FROM training_plans WHERE id = ?', [id]);

    if (affectedRows === 0) {
      throw new AppError(500, '刪除計劃失敗');
    }

    res.json({
      success: true,
      message: '訓練計劃已刪除',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('刪除訓練計劃失敗:', error);
    throw new AppError(500, '刪除訓練計劃失敗');
  }
});

// 標記任務完成
router.patch('/tasks/:taskId/complete', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const affectedRows = await execute(
      'UPDATE daily_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', taskId]
    );

    if (affectedRows === 0) {
      throw new AppError(404, '任務不存在');
    }

    res.json({
      success: true,
      message: '任務已標記為完成',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('標記任務完成失敗:', error);
    throw new AppError(500, '標記任務完成失敗');
  }
});

// 跳過任務
router.patch('/tasks/:taskId/skip', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    // 檢查任務是否存在
    const task = await queryOne(
      'SELECT id, status FROM daily_tasks WHERE id = ?',
      [taskId]
    );

    if (!task) {
      throw new AppError(404, '任務不存在');
    }

    if (task.status === 'completed') {
      throw new AppError(400, '任務已完成，無法跳過');
    }

    // 讀取現有的 metadata（如果存在）
    const existingTask = await queryOne(
      'SELECT metadata FROM daily_tasks WHERE id = ?',
      [taskId]
    );
    
    let metadata: any = {};
    if (existingTask?.metadata) {
      try {
        metadata = typeof existingTask.metadata === 'string' 
          ? JSON.parse(existingTask.metadata) 
          : existingTask.metadata;
      } catch (e) {
        metadata = {};
      }
    }
    
    // 設置跳過標記
    metadata.skipped = true;
    metadata.skipped_at = new Date().toISOString();
    
    // 更新任務狀態為完成，並保存 metadata
    await execute(
      'UPDATE daily_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP, metadata = ? WHERE id = ?',
      ['completed', JSON.stringify(metadata), taskId]
    );

    console.log(`✅ 任務已跳過: 任務ID=${taskId}`);

    res.json({
      success: true,
      message: '任務已跳過',
      data: {
        task_id: taskId,
        skipped: true,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('跳過任務失敗:', error);
    throw new AppError(500, '跳過任務失敗');
  }
});

// 從任務創建練習會話
router.post('/tasks/:taskId/start-practice', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { question_count } = req.body;
    
    // 獲取任務詳情（包含計劃名稱）
    const task = await queryOne(
      `SELECT dt.id, dt.plan_id, dt.category, dt.duration, dt.status, dt.task_date,
              tp.student_name, tp.target_school,
              CONCAT(tp.student_name, '的', tp.target_school, '衝刺計劃') as plan_name
       FROM daily_tasks dt
       INNER JOIN training_plans tp ON dt.plan_id = tp.id
       WHERE dt.id = ?`,
      [taskId]
    );
    
    if (!task) {
      throw new AppError(404, '任務不存在');
    }
    
    // 如果任務已完成，檢查是否有已完成的會話
    // 如果有，允許用戶查看已完成的會話（不創建新會話）
    // 如果沒有，不允許創建新會話（任務已完成）
    if (task.status === 'completed') {
      const completedSession = await queryOne(
        `SELECT id FROM sessions WHERE task_id = ? AND status = 'completed' ORDER BY start_time DESC LIMIT 1`,
        [taskId]
      );
      
      if (!completedSession) {
        // 任務已完成但沒有會話，不允許創建新會話
        throw new AppError(400, '任務已完成,無法再次練習');
      }
      // 如果有已完成的會話，繼續處理（會在下面返回現有會話）
    }
    
    // 根據任務時長計算題目數量：每10分鐘1題，最少1題
    // 如果前端指定了question_count，優先使用前端的值
    const calculatedQuestionCount = question_count 
      ? parseInt(question_count as string)
      : Math.max(1, Math.ceil(task.duration / 10));
    
    // 檢查是否已有會話（優先查找進行中的，如果沒有則查找已完成的）
    // 避免重複創建會話，即使會話已完成也應該返回它
    let existingSession = await queryOne(
      `SELECT id, question_ids, status FROM sessions WHERE task_id = ? AND status = 'in_progress' ORDER BY start_time DESC LIMIT 1`,
      [taskId]
    );
    
    // 如果沒有進行中的會話，查找已完成的會話（最新的）
    if (!existingSession) {
      existingSession = await queryOne(
        `SELECT id, question_ids, status FROM sessions WHERE task_id = ? AND status = 'completed' ORDER BY start_time DESC LIMIT 1`,
        [taskId]
      );
    }
    
    // 如果已有現有會話，返回現有會話信息
    if (existingSession) {
      const sessionId = existingSession.id;
      
      // 從會話中獲取保存的題目ID列表
      let questionIds: number[] = [];
      if (existingSession.question_ids) {
        try {
          const parsed = typeof existingSession.question_ids === 'string'
            ? JSON.parse(existingSession.question_ids)
            : existingSession.question_ids;
          if (Array.isArray(parsed)) {
            questionIds = parsed;
          }
        } catch (e) {
          console.warn('解析會話題目ID列表失敗:', e);
        }
      }
      
      // 如果會話中沒有保存題目ID，從 qa_records 中提取（兼容舊數據）
      if (questionIds.length === 0) {
        // 使用子查詢來獲取按時間排序的唯一題目ID
        const qaRecords = await query(
          `SELECT question_id 
           FROM qa_records 
           WHERE session_id = ? AND question_id IS NOT NULL 
           GROUP BY question_id 
           ORDER BY MIN(created_at) ASC`,
          [sessionId]
        );
        questionIds = qaRecords.map((r: any) => r.question_id);
        
        // 如果從 qa_records 中提取到了題目ID，保存到會話中（更新舊數據）
        if (questionIds.length > 0) {
          await execute(
            `UPDATE sessions SET question_ids = ? WHERE id = ?`,
            [JSON.stringify(questionIds), sessionId]
          );
        }
      }
      
      // 獲取題目詳情（按會話保存的題目ID順序）
      let questions = [];
      if (questionIds.length > 0) {
        const placeholders = questionIds.map(() => '?').join(',');
        const allQuestions = await query(
          `SELECT id, question_text, category, difficulty, reference_answer
           FROM questions
           WHERE id IN (${placeholders})`,
          questionIds
        );
        
        // 按會話保存的題目ID順序排序
        const questionMap = new Map(allQuestions.map((q: any) => [q.id, q]));
        questions = questionIds
          .map((id: number) => questionMap.get(id))
          .filter((q: any) => q !== undefined); // 過濾掉已刪除的題目
      }
      
      // 如果會話中沒有題目或題目被刪除了，從題庫重新選擇題目
      if (questions.length === 0) {
        const questionCount = question_count ? parseInt(question_count as string) : calculatedQuestionCount;
        // 使用自動生成函數確保有可用題目
        questions = await ensureQuestionsAvailable(
          task.category,
          questionCount,
          task.target_school,
          'medium'
        );
        
        if (questions.length === 0) {
          // 如果自動生成也失敗，返回友好錯誤但不導致服務崩潰
          console.error(`❌ 無法為類別 ${task.category} 獲取或生成題目`);
          throw new AppError(500, `無法為類別(${task.category})生成題目，請稍後重試或手動添加題目`);
        }
        
        // 更新會話，保存新的題目ID列表
        const newQuestionIds = questions.map((q: any) => q.id);
        await execute(
          `UPDATE sessions SET question_ids = ? WHERE id = ?`,
          [JSON.stringify(newQuestionIds), sessionId]
        );
      }
      
      console.log(`✅ 返回现有會話: 任務ID=${taskId}, 會話ID=${sessionId}, 狀態=${existingSession.status}, 題目數=${questions.length}`);
      
      return res.json({
        success: true,
        message: existingSession.status === 'completed' ? '已找到已完成的會話' : '已找到现有會話',
        data: {
          session_id: sessionId,
          task_id: taskId,
          questions,
          total_questions: questions.length,
          session_status: existingSession.status, // 返回會話狀態
          task_info: {
            category: task.category,
            duration: task.duration,
            student_name: task.student_name,
            target_school: task.target_school,
            task_date: task.task_date,
            plan_name: task.plan_name,
          },
          is_existing: true, // 標記這是現有會話
          is_completed: existingSession.status === 'completed', // 標記是否已完成
        },
      });
    }
    
    // 如果沒有現有會話，創建新會話
    // 使用自動生成函數確保有可用題目
    const questions = await ensureQuestionsAvailable(
      task.category,
      calculatedQuestionCount,
      task.target_school,
      'medium'
    );
    
    if (questions.length === 0) {
      // 如果自動生成也失敗，返回友好錯誤但不導致服務崩潰
      console.error(`❌ 無法為類別 ${task.category} 獲取或生成題目`);
      throw new AppError(500, `無法為類別(${task.category})生成題目，請稍後重試或手動添加題目`);
    }
    
    // 創建會話，保存題目ID列表
    const questionIds = questions.map((q: any) => q.id);
    const sessionId = await insert(
      `INSERT INTO sessions (task_id, category, mode, status, question_ids)
       VALUES (?, ?, ?, ?, ?)`,
      [taskId, task.category, 'text_qa', 'in_progress', JSON.stringify(questionIds)]
    );
    
    // 更新任務狀態為進行中
    await execute(
      'UPDATE daily_tasks SET status = ? WHERE id = ?',
      ['in_progress', taskId]
    );
    
    console.log(`✅ 從任務創建練習會話: 任務ID=${taskId}, 會話ID=${sessionId}, 題目數=${questions.length}`);
    
    res.status(201).json({
      success: true,
      message: '會話創建成功',
      data: {
        session_id: sessionId,
        task_id: taskId,
        questions,
        total_questions: questions.length,
        task_info: {
          category: task.category,
          duration: task.duration,
          student_name: task.student_name,
          target_school: task.target_school,
        },
        is_existing: false, // 標記這是新創建的會話
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('從任務創建會話失敗:', error);
    throw new AppError(500, '從任務創建會話失敗');
  }
});

export default router;
