/**
 * AI 訓練計劃生成服務
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
 * 生成訓練計劃
 */
export async function generateTrainingPlan(params: TrainingPlanRequest): Promise<GeneratedTrainingPlan> {
  const { student_name, target_school, start_date, end_date, total_days, daily_duration } = params;

  // 获取學校信息
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
目標學校：${school.name_zh} (${school.code})
面試重點：${focusAreas.join('、')}
面試風格：${school.interview_style}
備注：${school.notes}`;
  }

  // 構建提示詞
  const prompt = `⚠️ 重要：你必須使用繁體中文回應。所有內容必須使用繁體中文。

你是一位資深的香港升中面試輔導專家。請為學生生成一個係統化的訓練計劃。

學生信息：
- 姓名：${student_name}
- 目標學校：${target_school}${schoolInfo}
- 訓練週期：${start_date} 至 ${end_date}（共 ${total_days} 天）
- 每日可用時長：${daily_duration} 分鐘

七大專項類別：
1. english-oral（英文口語）
2. chinese-oral（中文表達）
3. logic-thinking（邏輯思維）
4. current-affairs（時事常識）
5. science-knowledge（科學常識）
6. personal-growth（個人成長）
7. group-discussion（小組討論）

四個學科能力類別（可選，用於專項基礎能力訓練）：
8. chinese-reading（中文閱讀理解）：通過閱讀文章，考察閱讀理解、字詞理解、觀點提煉等能力
9. english-reading（英文閱讀理解）：通過閱讀英文文章，考察閱讀理解、詞彙、觀點分析等能力
10. mathematics（數學基礎）：考察計算能力、數學概念理解、基礎數學知識應用
11. science-practice（科學實踐）：考察科學現象說明、科學推理、科學行為等能力

注意：學科能力類別可以作為補充訓練，建議與相關專項類別結合（如英文閱讀理解與英文口語結合）。

請生成訓練計劃，以 JSON 格式返回：

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
  "ai_suggestions": "根據 ${target_school} 的特點，建議重點加強...（必須使用繁體中文）",
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
1. category_allocation 為各專項的百分比分配（總和=100）
2. 根據學校特點調整專項比例（如 SPCC 增加 science-knowledge 和 science-practice）
3. 學科能力類別可以作為補充訓練，建議與相關專項類別結合（如英文閱讀理解與英文口語結合）
4. daily_tasks 數組包含每一天的任務安排
5. 每天可以安排 1-2 個專項（可以是專項類別或學科能力類別）
6. 合理分配時間，確保每個專項都有充分練習
7. ai_suggestions 必須使用繁體中文
7. ai_suggestions 提供針對性建議（200-300字），如果包含學科能力訓練，應說明訓練重點

現在請生成完整的訓練計劃：`;

  console.log(`🤖 生成訓練計劃: ${student_name} -> ${target_school}`);

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

    // 驗證結果
    if (!plan.category_allocation || !plan.daily_tasks || !Array.isArray(plan.daily_tasks)) {
      throw new Error('AI 返回的數據格式不正確');
    }

    // 驗證日期和類別
    for (const task of plan.daily_tasks) {
      if (!task.task_date || !task.category || !task.duration) {
        throw new Error('每日任務缺少必要字段');
      }
    }

    console.log(`✅ 成功生成訓練計劃：${plan.daily_tasks.length} 個每日任務`);
    return plan;
  } catch (error: any) {
    console.error('❌ AI 生成訓練計劃失敗:', error.message);
    
    // 降級：使用預設模板
    console.log('🔄 使用預設模板生成計劃...');
    return generateDefaultPlan(params);
  }
}

/**
 * 預設模板計劃（AI 失敗時的降級方案）
 */
function generateDefaultPlan(params: TrainingPlanRequest): GeneratedTrainingPlan {
  const { start_date, total_days, daily_duration } = params;

  // 默認類別分配
  const category_allocation = {
    'english-oral': 25,
    'chinese-oral': 20,
    'logic-thinking': 15,
    'current-affairs': 15,
    'science-knowledge': 10,
    'personal-growth': 10,
    'group-discussion': 5,
  };

  // 生成每日任務（循環分配專項）
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
    ai_suggestions: '使用默認模板生成的計劃。建議根據實際情況調整，並在數據管理頁面手動優化。',
    daily_tasks,
  };
}

/**
 * 基於弱點生成訓練計劃
 */
export async function generateTrainingPlanFromWeakness(
  params: WeaknessBasedPlanRequest,
  weakness: any
): Promise<GeneratedTrainingPlan> {
  const { start_date, end_date, total_days, daily_duration, target_school, student_name } = params;

  // 獲取學校信息（如果有）
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
目標學校：${school.name_zh} (${school.code})
面試重點：${focusAreas.join('、')}
面試風格：${school.interview_style}`;
    }
  }

  // 解析弱點相關信息
  const relatedTopics = typeof weakness.related_topics === 'string'
    ? JSON.parse(weakness.related_topics || '[]')
    : weakness.related_topics || [];

  // 構建針對弱點的提示詞
  const prompt = `⚠️ 重要：你必須使用繁體中文回應。所有內容必須使用繁體中文。

你是一位資深的香港升中面試輔導專家。請根據學生的具體弱點，生成一個針對性的訓練計劃。

學生信息：
- 姓名：${student_name || '學生'}
${target_school ? `- 目標學校：${target_school}${schoolInfo}` : ''}
- 訓練週期：${start_date} 至 ${end_date}（共 ${total_days} 天）
- 每日可用時長：${daily_duration} 分鐘

需要改善的弱點：
- 專項類別：${weakness.category}（${getCategoryName(weakness.category)}）
- 弱點類型：${weakness.weakness_type}（${getWeaknessTypeName(weakness.weakness_type)}）
- 嚴重程度：${weakness.severity === 'high' ? '高' : weakness.severity === 'medium' ? '中' : '低'}
- 弱點描述：${weakness.description}
${weakness.example_text ? `- 示例：${weakness.example_text}` : ''}
${weakness.improvement_suggestions ? `- 改進建議：${weakness.improvement_suggestions}` : ''}
${relatedTopics.length > 0 ? `- 相關話題：${relatedTopics.join('、')}` : ''}

七大專項類別：
1. english-oral（英文口語）
2. chinese-oral（中文表達）
3. logic-thinking（邏輯思維）
4. current-affairs（時事常識）
5. science-knowledge（科學常識）
6. personal-growth（個人成長）
7. group-discussion（小組討論）

四個學科能力類別（可選，用於專項基礎能力訓練）：
8. chinese-reading（中文閱讀理解）：通過閱讀文章，考察閱讀理解、字詞理解、觀點提煉等能力
9. english-reading（英文閱讀理解）：通過閱讀英文文章，考察閱讀理解、詞彙、觀點分析等能力
10. mathematics（數學基礎）：考察計算能力、數學概念理解、基礎數學知識應用
11. science-practice（科學實踐）：考察科學現象說明、科學推理、科學行為等能力

請生成針對該弱點的訓練計劃，以 JSON 格式返回：

{
  "category_allocation": {
    "${weakness.category}": 40,
    "其他相關類別": 60
  },
  "ai_suggestions": "針對${getWeaknessTypeName(weakness.weakness_type)}弱點的訓練建議...（必須使用繁體中文）",
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
1. category_allocation 中，弱點所屬類別應佔較高比例（30-50%），其他類別合理分配
2. 根據弱點類型設計練習重點：
   - vocabulary（詞彙量不足）：重點練習詞彙豐富度、同義詞替換
   - grammar（語法錯誤）：重點練習語法結構、句式多樣性
   - logic（邏輯不清晰）：重點練習邏輯推理、條理表達
   - knowledge_gap（知識盲區）：重點補充相關知識、擴展視野
   - confidence（信心不足）：重點練習表達流暢度、自信心培養
   - expression（表達能力弱）：重點練習表達技巧、組織能力
3. daily_tasks 中，弱點所屬類別應佔至少40%的任務天數
4. 每天可以安排 1-2 個專項，但弱點類別應優先安排
5. ai_suggestions 應詳細說明如何針對該弱點進行訓練（300-400字，必須使用繁體中文）
6. 如果提供了改進建議和相關話題，應在計劃中體現

現在請生成針對性的訓練計劃：`;

  console.log(`🤖 基於弱點生成訓練計劃: 弱點ID=${params.weakness_id}, 類別=${weakness.category}`);

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

    // 驗證結果
    if (!plan.category_allocation || !plan.daily_tasks || !Array.isArray(plan.daily_tasks)) {
      throw new Error('AI 返回的數據格式不正確');
    }

    // 確保弱點類別在分配中佔較高比例
    if (!plan.category_allocation[weakness.category] || plan.category_allocation[weakness.category] < 30) {
      // 調整分配，確保弱點類別至少佔30%
      const total = Object.values(plan.category_allocation).reduce((a: number, b: number) => a + b, 0);
      const weaknessPercent = Math.max(30, plan.category_allocation[weakness.category] || 0);
      const remaining = 100 - weaknessPercent;
      
      // 重新分配其他類別
      const otherCategories = Object.keys(plan.category_allocation).filter(c => c !== weakness.category);
      const perCategory = remaining / Math.max(1, otherCategories.length);
      
      plan.category_allocation = {
        [weakness.category]: weaknessPercent,
        ...Object.fromEntries(otherCategories.map(c => [c, perCategory]))
      };
    }

    // 驗證每日任務
    for (const task of plan.daily_tasks) {
      if (!task.task_date || !task.category || !task.duration) {
        throw new Error('每日任務缺少必要字段');
      }
    }

    // 確保弱點類別在任務中佔足夠比例
    const weaknessCategoryTasks = plan.daily_tasks.filter(t => t.category === weakness.category).length;
    const minWeaknessTasks = Math.ceil(plan.daily_tasks.length * 0.4);
    if (weaknessCategoryTasks < minWeaknessTasks) {
      // 調整任務，增加弱點類別的任務
      const needMore = minWeaknessTasks - weaknessCategoryTasks;
      for (let i = 0; i < needMore && i < plan.daily_tasks.length; i++) {
        if (plan.daily_tasks[i].category !== weakness.category) {
          plan.daily_tasks[i].category = weakness.category;
        }
      }
    }

    console.log(`✅ 成功生成針對性訓練計劃：${plan.daily_tasks.length} 個每日任務，弱點類別佔比${Math.round((plan.daily_tasks.filter(t => t.category === weakness.category).length / plan.daily_tasks.length) * 100)}%`);
    return plan;
  } catch (error: any) {
    console.error('❌ AI 生成針對性訓練計劃失敗:', error.message);
    
    // 降級：使用預設模板
    console.log('🔄 使用預設模板生成針對性計劃...');
    return generateDefaultWeaknessPlan(params, weakness);
  }
}

/**
 * 預設模板計劃（基於弱點，AI失敗時的降級方案）
 */
function generateDefaultWeaknessPlan(
  params: WeaknessBasedPlanRequest,
  weakness: any
): GeneratedTrainingPlan {
  const { start_date, total_days, daily_duration } = params;

  // 弱點類別佔40%，其他類別平均分配
  const weaknessCategoryPercent = 40;
  const otherPercent = (100 - weaknessCategoryPercent) / 6; // 其他6個類別平均分配

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

  // 移除0值的類別
  Object.keys(category_allocation).forEach(key => {
    if (category_allocation[key] === 0) {
      delete category_allocation[key];
    }
  });

  // 生成每日任務（40%为弱點類別，60%为其他類別）
  const daily_tasks: DailyTask[] = [];
  const otherCategories = Object.keys(category_allocation).filter(c => c !== weakness.category);
  
  for (let i = 0; i < total_days; i++) {
    const date = new Date(start_date);
    date.setDate(date.getDate() + i);
    const taskDate = date.toISOString().split('T')[0];

    // 前40%的任務使用弱點類別，後60%使用其他類別循环
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
    ai_suggestions: `針對${weaknessTypeName}弱點的訓練計劃。重點加强${categoryName}專項，建議每天進行針對性練習，逐步改善${weakness.description}。${weakness.improvement_suggestions ? `具体改進方向：${weakness.improvement_suggestions}` : ''}`,
    daily_tasks,
  };
}

/**
 * 获取類別中文名称
 */
function getCategoryName(category: string): string {
  const map: Record<string, string> = {
    'english-oral': '英文口語',
    'chinese-oral': '中文表達',
    'chinese-expression': '中文表達',
    'logic-thinking': '邏輯思維',
    'logical-thinking': '邏輯思維',
    'current-affairs': '時事常識',
    'science-knowledge': '科學常識',
    'personal-growth': '个人成長',
    'group-discussion': '小組討論',
    'chinese-reading': '中文阅读理解',
    'english-reading': '英文阅读理解',
    'mathematics': '數學基础',
    'science-practice': '科學实践',
  };
  return map[category] || category;
}

/**
 * 获取弱點類型中文名称
 */
function getWeaknessTypeName(type: string): string {
  const map: Record<string, string> = {
    vocabulary: '詞汇量不足',
    grammar: '語法错误',
    logic: '邏輯不清晰',
    knowledge_gap: '知識盲区',
    confidence: '信心不足',
    expression: '表達能力弱',
  };
  return map[type] || type;
}
