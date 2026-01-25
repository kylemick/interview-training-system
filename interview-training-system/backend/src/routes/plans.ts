/**
 * 训练计划路由
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
 * 从设置文件读取学生信息
 */
async function getStudentInfoFromSettings(): Promise<{ student_name: string; target_school?: string }> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    return {
      student_name: settings.student_name || '学生',
      target_school: settings.target_school,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // 文件不存在，返回默认值
      return { student_name: '学生' };
    }
    console.error('读取设置失败:', error);
    return { student_name: '学生' };
  }
}

const router = Router();

// 获取所有训练计划
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

    // 解析 JSON 字段（添加错误处理）
    const formattedPlans = plans.map((plan: any) => {
      let category_allocation = {};
      try {
        category_allocation = plan.category_allocation
          ? (typeof plan.category_allocation === 'string' 
              ? JSON.parse(plan.category_allocation) 
              : plan.category_allocation)
          : {};
      } catch (error) {
        console.warn(`解析计划 ${plan.id} 的 category_allocation 失败:`, error);
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
    console.error('获取训练计划列表失败:', error);
    throw new AppError(500, '获取训练计划列表失败');
  }
});

// ⚠️ 重要：特定路由必须在参数化路由之前定义
// 获取今日任务
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

    // 解析 JSON 字段（添加错误处理）
    const formattedTasks = tasks.map((task: any) => {
      let question_ids = [];
      try {
        question_ids = task.question_ids
          ? (typeof task.question_ids === 'string'
              ? JSON.parse(task.question_ids)
              : task.question_ids)
          : [];
      } catch (error) {
        console.warn(`解析任务 ${task.id} 的 question_ids 失败:`, error);
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
    console.error('获取今日任务失败:', error);
    throw new AppError(500, '获取今日任务失败');
  }
});

// 获取未完成任务列表 (支持指定日期和状态筛选)
router.get('/pending-tasks', async (req: Request, res: Response) => {
  try {
    const { date, status } = req.query;
    
    // 默认使用今天的日期
    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];
    
    const conditions: string[] = ['dt.task_date = ?', 'tp.status = ?'];
    const params: any[] = [targetDate, 'active'];
    
    // 如果指定了状态,添加状态筛选
    if (status) {
      conditions.push('dt.status = ?');
      params.push(status);
    } else {
      // 默认只返回未完成的任务
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
        console.warn(`解析任务 ${task.id} 的 question_ids 失败:`, error);
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
    console.error('获取未完成任务失败:', error);
    throw new AppError(500, '获取未完成任务失败');
  }
});

// 获取单个训练计划详情 (必须在特定路由之后)
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
      throw new AppError(404, '训练计划不存在');
    }

    // 解析 JSON 字段（添加错误处理）
    let category_allocation = {};
    try {
      category_allocation = plan.category_allocation
        ? (typeof plan.category_allocation === 'string'
            ? JSON.parse(plan.category_allocation)
            : plan.category_allocation)
        : {};
    } catch (error) {
      console.warn(`解析计划 ${plan.id} 的 category_allocation 失败:`, error);
      category_allocation = {};
    }

    const formattedPlan = { ...plan, category_allocation };

    // 获取该计划的所有每日任务
    const tasks = await query(
      `SELECT id, task_date, category, duration, question_ids, status, completed_at
       FROM daily_tasks
       WHERE plan_id = ?
       ORDER BY task_date ASC`,
      [id]
    );

    // 解析 JSON 字段（添加错误处理）
    const formattedTasks = tasks.map((task: any) => {
      let question_ids = [];
      try {
        question_ids = task.question_ids
          ? (typeof task.question_ids === 'string'
              ? JSON.parse(task.question_ids)
              : task.question_ids)
          : [];
      } catch (error) {
        console.warn(`解析任务 ${task.id} 的 question_ids 失败:`, error);
        question_ids = [];
      }
      return { ...task, question_ids };
    });

    res.json({
      success: true,
      data: {
        plan: formattedPlan,
        tasks: formattedTasks,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('获取训练计划详情失败:', error);
    throw new AppError(500, '获取训练计划详情失败');
  }
});

// 创建训练计划（AI 生成）
router.post('/', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, daily_duration, target_school: requestTargetSchool } = req.body;

    // 从设置获取学生信息
    const settings = await getStudentInfoFromSettings();
    const student_name = settings.student_name;
    const target_school = requestTargetSchool || settings.target_school;

    // 验证必填字段
    if (!student_name) {
      throw new AppError(400, '请先在设置页面配置学生姓名');
    }
    if (!target_school) {
      throw new AppError(400, '请先在设置页面配置目标学校，或在创建计划时选择目标学校');
    }
    if (!start_date || !end_date || !daily_duration) {
      throw new AppError(400, '缺少必填字段：start_date, end_date, daily_duration');
    }

    // 验证日期
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError(400, '无效的日期格式');
    }

    if (endDate <= startDate) {
      throw new AppError(400, '结束日期必须晚于开始日期');
    }

    // 计算总天数
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log(`🤖 生成训练计划: ${student_name} -> ${target_school} (${totalDays}天)`);

    // 调用 AI 生成训练计划
    const generatedPlan = await generateTrainingPlan({
      student_name,
      target_school,
      start_date,
      end_date,
      total_days: totalDays,
      daily_duration,
    });

    // 保存计划
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

    // 保存每日任务
    for (const task of generatedPlan.daily_tasks) {
      await insert(
        `INSERT INTO daily_tasks (plan_id, task_date, category, duration, question_ids, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [planId, task.task_date, task.category, task.duration, JSON.stringify(task.question_ids || []), 'pending']
      );
    }

    console.log(`✅ 训练计划已创建: ID=${planId}, 包含 ${generatedPlan.daily_tasks.length} 个每日任务`);

    res.status(201).json({
      success: true,
      message: '训练计划创建成功',
      data: {
        plan_id: planId,
        total_tasks: generatedPlan.daily_tasks.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('创建训练计划失败:', error);
    throw new AppError(500, '创建训练计划失败');
  }
});

// 基于弱点创建训练计划
router.post('/from-weakness', async (req: Request, res: Response) => {
  try {
    const { weakness_id, start_date, end_date, daily_duration, target_school: requestTargetSchool } = req.body;

    // 验证必填字段
    if (!weakness_id || !start_date || !end_date || !daily_duration) {
      throw new AppError(400, '缺少必填字段：weakness_id, start_date, end_date, daily_duration');
    }

    // 从设置获取学生信息
    const settings = await getStudentInfoFromSettings();
    const student_name = settings.student_name;
    const target_school = requestTargetSchool || settings.target_school;

    if (!student_name) {
      throw new AppError(400, '请先在设置页面配置学生姓名');
    }

    // 验证日期
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError(400, '无效的日期格式');
    }

    if (endDate <= startDate) {
      throw new AppError(400, '结束日期必须晚于开始日期');
    }

    // 计算总天数
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 获取弱点信息
    const weakness = await queryOne(
      'SELECT * FROM student_weaknesses WHERE id = ?',
      [weakness_id]
    );

    if (!weakness) {
      throw new AppError(404, '弱点记录不存在');
    }

    console.log(`🤖 基于弱点生成训练计划: ${student_name} -> ${target_school || '未指定'}, 弱点ID=${weakness_id}, 类别=${weakness.category} (${totalDays}天)`);

    // 调用 AI 生成针对性训练计划
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

    // 保存计划
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

    // 保存每日任务
    for (const task of generatedPlan.daily_tasks) {
      await insert(
        `INSERT INTO daily_tasks (plan_id, task_date, category, duration, question_ids, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [planId, task.task_date, task.category, task.duration, JSON.stringify(task.question_ids || []), 'pending']
      );
    }

    // 为每日任务生成相关题目（针对弱点类别）
    const weaknessCategoryTasks = generatedPlan.daily_tasks.filter(t => t.category === weakness.category);
    if (weaknessCategoryTasks.length > 0) {
      console.log(`📝 为 ${weaknessCategoryTasks.length} 个弱点类别任务生成题目...`);
      // TODO: 可以在这里调用题目生成API，为任务生成针对性题目
      // 暂时留空，后续可以增强
    }

    console.log(`✅ 基于弱点的训练计划已创建: ID=${planId}, 包含 ${generatedPlan.daily_tasks.length} 个每日任务`);

    res.status(201).json({
      success: true,
      message: '训练计划创建成功',
      data: {
        plan_id: planId,
        total_tasks: generatedPlan.daily_tasks.length,
        weakness_category: weakness.category,
        weakness_category_tasks: weaknessCategoryTasks.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('基于弱点创建训练计划失败:', error);
    throw new AppError(500, '创建训练计划失败');
  }
});

// 更新训练计划状态
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'completed', 'paused'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, `无效的状态，必须是: ${validStatuses.join(', ')}`);
    }

    const affectedRows = await execute(
      'UPDATE training_plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    if (affectedRows === 0) {
      throw new AppError(404, '训练计划不存在');
    }

    res.json({
      success: true,
      message: '计划状态已更新',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('更新计划状态失败:', error);
    throw new AppError(500, '更新计划状态失败');
  }
});

// 删除训练计划
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查计划是否存在
    const existing = await queryOne('SELECT id FROM training_plans WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError(404, '训练计划不存在');
    }

    // 删除计划（会级联删除每日任务）
    const affectedRows = await execute('DELETE FROM training_plans WHERE id = ?', [id]);

    if (affectedRows === 0) {
      throw new AppError(500, '删除计划失败');
    }

    res.json({
      success: true,
      message: '训练计划已删除',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('删除训练计划失败:', error);
    throw new AppError(500, '删除训练计划失败');
  }
});

// 标记任务完成
router.patch('/tasks/:taskId/complete', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const affectedRows = await execute(
      'UPDATE daily_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', taskId]
    );

    if (affectedRows === 0) {
      throw new AppError(404, '任务不存在');
    }

    res.json({
      success: true,
      message: '任务已标记为完成',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('标记任务完成失败:', error);
    throw new AppError(500, '标记任务完成失败');
  }
});

// 跳过任务
router.patch('/tasks/:taskId/skip', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    // 检查任务是否存在
    const task = await queryOne(
      'SELECT id, status FROM daily_tasks WHERE id = ?',
      [taskId]
    );

    if (!task) {
      throw new AppError(404, '任务不存在');
    }

    if (task.status === 'completed') {
      throw new AppError(400, '任务已完成，无法跳过');
    }

    // 读取现有的 metadata（如果存在）
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
    
    // 设置跳过标记
    metadata.skipped = true;
    metadata.skipped_at = new Date().toISOString();
    
    // 更新任务状态为完成，并保存 metadata
    await execute(
      'UPDATE daily_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP, metadata = ? WHERE id = ?',
      ['completed', JSON.stringify(metadata), taskId]
    );

    console.log(`✅ 任务已跳过: 任务ID=${taskId}`);

    res.json({
      success: true,
      message: '任务已跳过',
      data: {
        task_id: taskId,
        skipped: true,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('跳过任务失败:', error);
    throw new AppError(500, '跳过任务失败');
  }
});

// 从任务创建练习会话
router.post('/tasks/:taskId/start-practice', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { question_count } = req.body;
    
    // 获取任务详情（包含计划名称）
    const task = await queryOne(
      `SELECT dt.id, dt.plan_id, dt.category, dt.duration, dt.status, dt.task_date,
              tp.student_name, tp.target_school,
              CONCAT(tp.student_name, '的', tp.target_school, '冲刺计划') as plan_name
       FROM daily_tasks dt
       INNER JOIN training_plans tp ON dt.plan_id = tp.id
       WHERE dt.id = ?`,
      [taskId]
    );
    
    if (!task) {
      throw new AppError(404, '任务不存在');
    }
    
    if (task.status === 'completed') {
      throw new AppError(400, '任务已完成,无法再次练习');
    }
    
    // 根据任务时长计算题目数量：每10分钟1题，最少1题
    // 如果前端指定了question_count，优先使用前端的值
    const calculatedQuestionCount = question_count 
      ? parseInt(question_count as string)
      : Math.max(1, Math.ceil(task.duration / 10));
    
    // 检查是否已有进行中的会话
    const existingSession = await queryOne(
      `SELECT id, question_ids FROM sessions WHERE task_id = ? AND status = 'in_progress'`,
      [taskId]
    );
    
    // 如果已有现有会话，返回现有会话信息
    if (existingSession) {
      const sessionId = existingSession.id;
      
      // 从会话中获取保存的题目ID列表
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
          console.warn('解析会话题目ID列表失败:', e);
        }
      }
      
      // 如果会话中没有保存题目ID，从 qa_records 中提取（兼容旧数据）
      if (questionIds.length === 0) {
        // 使用子查询来获取按时间排序的唯一题目ID
        const qaRecords = await query(
          `SELECT question_id 
           FROM qa_records 
           WHERE session_id = ? AND question_id IS NOT NULL 
           GROUP BY question_id 
           ORDER BY MIN(created_at) ASC`,
          [sessionId]
        );
        questionIds = qaRecords.map((r: any) => r.question_id);
        
        // 如果从 qa_records 中提取到了题目ID，保存到会话中（更新旧数据）
        if (questionIds.length > 0) {
          await execute(
            `UPDATE sessions SET question_ids = ? WHERE id = ?`,
            [JSON.stringify(questionIds), sessionId]
          );
        }
      }
      
      // 获取题目详情（按会话保存的题目ID顺序）
      let questions = [];
      if (questionIds.length > 0) {
        const placeholders = questionIds.map(() => '?').join(',');
        const allQuestions = await query(
          `SELECT id, question_text, category, difficulty, reference_answer
           FROM questions
           WHERE id IN (${placeholders})`,
          questionIds
        );
        
        // 按会话保存的题目ID顺序排序
        const questionMap = new Map(allQuestions.map((q: any) => [q.id, q]));
        questions = questionIds
          .map((id: number) => questionMap.get(id))
          .filter((q: any) => q !== undefined); // 过滤掉已删除的题目
      }
      
      // 如果会话中没有题目或题目被删除了，从题库重新选择题目
      if (questions.length === 0) {
        const questionCount = question_count ? parseInt(question_count as string) : calculatedQuestionCount;
        // 使用自动生成函数确保有可用题目
        questions = await ensureQuestionsAvailable(
          task.category,
          questionCount,
          task.target_school,
          'medium'
        );
        
        if (questions.length === 0) {
          // 如果自动生成也失败，返回友好错误但不导致服务崩溃
          console.error(`❌ 无法为类别 ${task.category} 获取或生成题目`);
          throw new AppError(500, `无法为类别(${task.category})生成题目，请稍后重试或手动添加题目`);
        }
        
        // 更新会话，保存新的题目ID列表
        const newQuestionIds = questions.map((q: any) => q.id);
        await execute(
          `UPDATE sessions SET question_ids = ? WHERE id = ?`,
          [JSON.stringify(newQuestionIds), sessionId]
        );
      }
      
      console.log(`✅ 返回现有会话: 任务ID=${taskId}, 会话ID=${sessionId}, 题目数=${questions.length}`);
      
      return res.json({
        success: true,
        message: '已找到现有会话',
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
            task_date: task.task_date,
            plan_name: task.plan_name,
          },
          is_existing: true, // 标记这是现有会话
        },
      });
    }
    
    // 如果没有现有会话，创建新会话
    // 使用自动生成函数确保有可用题目
    const questions = await ensureQuestionsAvailable(
      task.category,
      calculatedQuestionCount,
      task.target_school,
      'medium'
    );
    
    if (questions.length === 0) {
      // 如果自动生成也失败，返回友好错误但不导致服务崩溃
      console.error(`❌ 无法为类别 ${task.category} 获取或生成题目`);
      throw new AppError(500, `无法为类别(${task.category})生成题目，请稍后重试或手动添加题目`);
    }
    
    // 创建会话，保存题目ID列表
    const questionIds = questions.map((q: any) => q.id);
    const sessionId = await insert(
      `INSERT INTO sessions (task_id, category, mode, status, question_ids)
       VALUES (?, ?, ?, ?, ?)`,
      [taskId, task.category, 'text_qa', 'in_progress', JSON.stringify(questionIds)]
    );
    
    // 更新任务状态为进行中
    await execute(
      'UPDATE daily_tasks SET status = ? WHERE id = ?',
      ['in_progress', taskId]
    );
    
    console.log(`✅ 从任务创建练习会话: 任务ID=${taskId}, 会话ID=${sessionId}, 题目数=${questions.length}`);
    
    res.status(201).json({
      success: true,
      message: '会话创建成功',
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
        is_existing: false, // 标记这是新创建的会话
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('从任务创建会话失败:', error);
    throw new AppError(500, '从任务创建会话失败');
  }
});

export default router;
