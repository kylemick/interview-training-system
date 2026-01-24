/**
 * 训练计划路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateTrainingPlan } from '../ai/trainingPlanner.js';

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

// 获取单个训练计划详情
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
    const { student_name, target_school, start_date, end_date, daily_duration } = req.body;

    // 验证必填字段
    if (!student_name || !target_school || !start_date || !end_date || !daily_duration) {
      throw new AppError(400, '缺少必填字段');
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

export default router;
