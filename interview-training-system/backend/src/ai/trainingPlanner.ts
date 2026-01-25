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

export interface WeaknessBasedPlanRequest {
  weakness_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  daily_duration: number;
  target_school?: string;
  student_name?: string;
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

/**
 * 基于弱点生成训练计划
 */
export async function generateTrainingPlanFromWeakness(
  params: WeaknessBasedPlanRequest,
  weakness: any
): Promise<GeneratedTrainingPlan> {
  const { start_date, end_date, total_days, daily_duration, target_school, student_name } = params;

  // 获取学校信息（如果有）
  let schoolInfo = '';
  if (target_school) {
    const school = await queryOne(
      'SELECT code, name, name_zh, focus_areas, interview_style, notes FROM school_profiles WHERE code = ?',
      [target_school]
    );
    if (school) {
      const focusAreas = typeof school.focus_areas === 'string' 
        ? JSON.parse(school.focus_areas) 
        : school.focus_areas;
      schoolInfo = `
目标学校：${school.name_zh} (${school.code})
面试重点：${focusAreas.join('、')}
面试风格：${school.interview_style}`;
    }
  }

  // 解析弱点相关信息
  const relatedTopics = typeof weakness.related_topics === 'string'
    ? JSON.parse(weakness.related_topics || '[]')
    : weakness.related_topics || [];

  // 构建针对弱点的提示词
  const prompt = `你是一位资深的香港升中面试辅导专家。请根据学生的具体弱点，生成一个针对性的训练计划。

学生信息：
- 姓名：${student_name || '学生'}
${target_school ? `- 目标学校：${target_school}${schoolInfo}` : ''}
- 训练周期：${start_date} 至 ${end_date}（共 ${total_days} 天）
- 每日可用时长：${daily_duration} 分钟

需要改善的弱点：
- 专项类别：${weakness.category}（${getCategoryName(weakness.category)}）
- 弱点类型：${weakness.weakness_type}（${getWeaknessTypeName(weakness.weakness_type)}）
- 严重程度：${weakness.severity === 'high' ? '高' : weakness.severity === 'medium' ? '中' : '低'}
- 弱点描述：${weakness.description}
${weakness.example_text ? `- 示例：${weakness.example_text}` : ''}
${weakness.improvement_suggestions ? `- 改进建议：${weakness.improvement_suggestions}` : ''}
${relatedTopics.length > 0 ? `- 相关话题：${relatedTopics.join('、')}` : ''}

七大专项类别：
1. english-oral（英文口语）
2. chinese-oral（中文表达）
3. logic-thinking（逻辑思维）
4. current-affairs（时事常识）
5. science-knowledge（科学常识）
6. personal-growth（个人成长）
7. group-discussion（小组讨论）

请生成针对该弱点的训练计划，以 JSON 格式返回：

{
  "category_allocation": {
    "${weakness.category}": 40,
    "其他相关类别": 60
  },
  "ai_suggestions": "针对${getWeaknessTypeName(weakness.weakness_type)}弱点的训练建议...",
  "daily_tasks": [
    {
      "task_date": "${start_date}",
      "category": "${weakness.category}",
      "duration": ${daily_duration},
      "question_ids": []
    }
  ]
}

要求：
1. category_allocation 中，弱点所属类别应占较高比例（30-50%），其他类别合理分配
2. 根据弱点类型设计练习重点：
   - vocabulary（词汇量不足）：重点练习词汇丰富度、同义词替换
   - grammar（语法错误）：重点练习语法结构、句式多样性
   - logic（逻辑不清晰）：重点练习逻辑推理、条理表达
   - knowledge_gap（知识盲区）：重点补充相关知识、扩展视野
   - confidence（信心不足）：重点练习表达流畅度、自信心培养
   - expression（表达能力弱）：重点练习表达技巧、组织能力
3. daily_tasks 中，弱点所属类别应占至少40%的任务天数
4. 每天可以安排 1-2 个专项，但弱点类别应优先安排
5. ai_suggestions 应详细说明如何针对该弱点进行训练（300-400字）
6. 如果提供了改进建议和相关话题，应在计划中体现

现在请生成针对性的训练计划：`;

  console.log(`🤖 基于弱点生成训练计划: 弱点ID=${params.weakness_id}, 类别=${weakness.category}`);

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

    // 确保弱点类别在分配中占较高比例
    if (!plan.category_allocation[weakness.category] || plan.category_allocation[weakness.category] < 30) {
      // 调整分配，确保弱点类别至少占30%
      const total = Object.values(plan.category_allocation).reduce((a: number, b: number) => a + b, 0);
      const weaknessPercent = Math.max(30, plan.category_allocation[weakness.category] || 0);
      const remaining = 100 - weaknessPercent;
      
      // 重新分配其他类别
      const otherCategories = Object.keys(plan.category_allocation).filter(c => c !== weakness.category);
      const perCategory = remaining / Math.max(1, otherCategories.length);
      
      plan.category_allocation = {
        [weakness.category]: weaknessPercent,
        ...Object.fromEntries(otherCategories.map(c => [c, perCategory]))
      };
    }

    // 验证每日任务
    for (const task of plan.daily_tasks) {
      if (!task.task_date || !task.category || !task.duration) {
        throw new Error('每日任务缺少必要字段');
      }
    }

    // 确保弱点类别在任务中占足够比例
    const weaknessCategoryTasks = plan.daily_tasks.filter(t => t.category === weakness.category).length;
    const minWeaknessTasks = Math.ceil(plan.daily_tasks.length * 0.4);
    if (weaknessCategoryTasks < minWeaknessTasks) {
      // 调整任务，增加弱点类别的任务
      const needMore = minWeaknessTasks - weaknessCategoryTasks;
      for (let i = 0; i < needMore && i < plan.daily_tasks.length; i++) {
        if (plan.daily_tasks[i].category !== weakness.category) {
          plan.daily_tasks[i].category = weakness.category;
        }
      }
    }

    console.log(`✅ 成功生成针对性训练计划：${plan.daily_tasks.length} 个每日任务，弱点类别占比${Math.round((plan.daily_tasks.filter(t => t.category === weakness.category).length / plan.daily_tasks.length) * 100)}%`);
    return plan;
  } catch (error: any) {
    console.error('❌ AI 生成针对性训练计划失败:', error.message);
    
    // 降级：使用预设模板
    console.log('🔄 使用预设模板生成针对性计划...');
    return generateDefaultWeaknessPlan(params, weakness);
  }
}

/**
 * 预设模板计划（基于弱点，AI失败时的降级方案）
 */
function generateDefaultWeaknessPlan(
  params: WeaknessBasedPlanRequest,
  weakness: any
): GeneratedTrainingPlan {
  const { start_date, total_days, daily_duration } = params;

  // 弱点类别占40%，其他类别平均分配
  const weaknessCategoryPercent = 40;
  const otherPercent = (100 - weaknessCategoryPercent) / 6; // 其他6个类别平均分配

  const category_allocation: Record<string, number> = {
    [weakness.category]: weaknessCategoryPercent,
    'english-oral': weakness.category === 'english-oral' ? 0 : otherPercent,
    'chinese-oral': weakness.category === 'chinese-oral' ? 0 : otherPercent,
    'logic-thinking': weakness.category === 'logic-thinking' ? 0 : otherPercent,
    'current-affairs': weakness.category === 'current-affairs' ? 0 : otherPercent,
    'science-knowledge': weakness.category === 'science-knowledge' ? 0 : otherPercent,
    'personal-growth': weakness.category === 'personal-growth' ? 0 : otherPercent,
    'group-discussion': weakness.category === 'group-discussion' ? 0 : otherPercent,
  };

  // 移除0值的类别
  Object.keys(category_allocation).forEach(key => {
    if (category_allocation[key] === 0) {
      delete category_allocation[key];
    }
  });

  // 生成每日任务（40%为弱点类别，60%为其他类别）
  const daily_tasks: DailyTask[] = [];
  const otherCategories = Object.keys(category_allocation).filter(c => c !== weakness.category);
  
  for (let i = 0; i < total_days; i++) {
    const date = new Date(start_date);
    date.setDate(date.getDate() + i);
    const taskDate = date.toISOString().split('T')[0];

    // 前40%的任务使用弱点类别，后60%使用其他类别循环
    const category = i < Math.ceil(total_days * 0.4)
      ? weakness.category
      : otherCategories[i % otherCategories.length];

    daily_tasks.push({
      task_date: taskDate,
      category,
      duration: daily_duration,
      question_ids: [],
    });
  }

  const weaknessTypeName = getWeaknessTypeName(weakness.weakness_type);
  const categoryName = getCategoryName(weakness.category);

  return {
    category_allocation,
    ai_suggestions: `针对${weaknessTypeName}弱点的训练计划。重点加强${categoryName}专项，建议每天进行针对性练习，逐步改善${weakness.description}。${weakness.improvement_suggestions ? `具体改进方向：${weakness.improvement_suggestions}` : ''}`,
    daily_tasks,
  };
}

/**
 * 获取类别中文名称
 */
function getCategoryName(category: string): string {
  const map: Record<string, string> = {
    'english-oral': '英文口语',
    'chinese-oral': '中文表达',
    'chinese-expression': '中文表达',
    'logic-thinking': '逻辑思维',
    'logical-thinking': '逻辑思维',
    'current-affairs': '时事常识',
    'science-knowledge': '科学常识',
    'personal-growth': '个人成长',
    'group-discussion': '小组讨论',
  };
  return map[category] || category;
}

/**
 * 获取弱点类型中文名称
 */
function getWeaknessTypeName(type: string): string {
  const map: Record<string, string> = {
    vocabulary: '词汇量不足',
    grammar: '语法错误',
    logic: '逻辑不清晰',
    knowledge_gap: '知识盲区',
    confidence: '信心不足',
    expression: '表达能力弱',
  };
  return map[type] || type;
}
