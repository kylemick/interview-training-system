/**
 * AI 训练计划生成服务
 */
import { deepseekClient } from './deepseek.js';
import { AppError } from '../middleware/errorHandler.js';
import { queryOne } from '../db/index.js';

export interface TrainingPlanRequest {
  student_name: string;
  target_school: string;
  start_date: string;
  end_date: string;
  total_days: number;
  daily_duration: number;
}

export interface DailyTask {
  task_date: string;
  category: string;
  duration: number;
  question_ids: number[];
}

export interface GeneratedTrainingPlan {
  category_allocation: Record<string, number>;
  ai_suggestions: string;
  daily_tasks: DailyTask[];
}

/**
 * 生成训练计划
 */
export async function generateTrainingPlan(params: TrainingPlanRequest): Promise<GeneratedTrainingPlan> {
  const { student_name, target_school, start_date, end_date, total_days, daily_duration } = params;

  // 获取学校信息
  const school = await queryOne(
    'SELECT code, name, name_zh, focus_areas, interview_style, notes FROM school_profiles WHERE code = ?',
    [target_school]
  );

  let schoolInfo = '';
  if (school) {
    const focusAreas = typeof school.focus_areas === 'string' 
      ? JSON.parse(school.focus_areas) 
      : school.focus_areas;
    schoolInfo = `
目标学校：${school.name_zh} (${school.code})
面试重点：${focusAreas.join('、')}
面试风格：${school.interview_style}
备注：${school.notes}`;
  }

  // 构建提示词
  const prompt = `你是一位资深的香港升中面试辅导专家。请为学生生成一个系统化的训练计划。

学生信息：
- 姓名：${student_name}
- 目标学校：${target_school}${schoolInfo}
- 训练周期：${start_date} 至 ${end_date}（共 ${total_days} 天）
- 每日可用时长：${daily_duration} 分钟

七大专项类别：
1. english-oral（英文口语）
2. chinese-oral（中文表达）
3. logic-thinking（逻辑思维）
4. current-affairs（时事常识）
5. science-knowledge（科学常识）
6. personal-growth（个人成长）
7. group-discussion（小组讨论）

请生成训练计划，以 JSON 格式返回：

{
  "category_allocation": {
    "english-oral": 25,
    "chinese-oral": 20,
    "logic-thinking": 15,
    "current-affairs": 15,
    "science-knowledge": 10,
    "personal-growth": 10,
    "group-discussion": 5
  },
  "ai_suggestions": "根据 ${target_school} 的特点，建议重点加强...",
  "daily_tasks": [
    {
      "task_date": "${start_date}",
      "category": "english-oral",
      "duration": ${daily_duration},
      "question_ids": []
    }
  ]
}

要求：
1. category_allocation 为各专项的百分比分配（总和=100）
2. 根据学校特点调整专项比例（如 SPCC 增加 science-knowledge）
3. daily_tasks 数组包含每一天的任务安排
4. 每天可以安排 1-2 个专项
5. 合理分配时间，确保每个专项都有充分练习
6. ai_suggestions 提供针对性建议（200-300字）

现在请生成完整的训练计划：`;

  console.log(`🤖 生成训练计划: ${student_name} -> ${target_school}`);

  try {
    const response = await deepseekClient.chat(
      [{ role: 'user', content: prompt }],
      0.7,
      3000
    );

    // 提取 JSON
    let jsonText = response.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    // 解析 JSON
    const plan = JSON.parse(jsonText) as GeneratedTrainingPlan;

    // 验证结果
    if (!plan.category_allocation || !plan.daily_tasks || !Array.isArray(plan.daily_tasks)) {
      throw new Error('AI 返回的数据格式不正确');
    }

    // 验证日期和类别
    for (const task of plan.daily_tasks) {
      if (!task.task_date || !task.category || !task.duration) {
        throw new Error('每日任务缺少必要字段');
      }
    }

    console.log(`✅ 成功生成训练计划：${plan.daily_tasks.length} 个每日任务`);
    return plan;
  } catch (error: any) {
    console.error('❌ AI 生成训练计划失败:', error.message);
    
    // 降级：使用预设模板
    console.log('🔄 使用预设模板生成计划...');
    return generateDefaultPlan(params);
  }
}

/**
 * 预设模板计划（AI 失败时的降级方案）
 */
function generateDefaultPlan(params: TrainingPlanRequest): GeneratedTrainingPlan {
  const { start_date, total_days, daily_duration } = params;

  // 默认类别分配
  const category_allocation = {
    'english-oral': 25,
    'chinese-oral': 20,
    'logic-thinking': 15,
    'current-affairs': 15,
    'science-knowledge': 10,
    'personal-growth': 10,
    'group-discussion': 5,
  };

  // 生成每日任务（循环分配专项）
  const categories = Object.keys(category_allocation);
  const daily_tasks: DailyTask[] = [];

  for (let i = 0; i < total_days; i++) {
    const date = new Date(start_date);
    date.setDate(date.getDate() + i);
    const taskDate = date.toISOString().split('T')[0];

    const category = categories[i % categories.length];

    daily_tasks.push({
      task_date: taskDate,
      category,
      duration: daily_duration,
      question_ids: [],
    });
  }

  return {
    category_allocation,
    ai_suggestions: '使用默认模板生成的计划。建议根据实际情况调整，并在数据管理页面手动优化。',
    daily_tasks,
  };
}
