/**
 * AI 题目生成服务
 */
import { DeepSeekClient } from './deepseek.js';
import { AppError } from '../middleware/errorHandler.js';

const client = new DeepSeekClient();

// 类别中文名称映射
const CATEGORY_NAMES: Record<string, string> = {
  'english-oral': '英文口语',
  'chinese-oral': '中文表达',
  'logic-thinking': '逻辑思维',
  'current-affairs': '时事常识',
  'science-knowledge': '科学常识',
  'personal-growth': '个人成长',
  'group-discussion': '小组讨论',
};

// 难度中文名称映射
const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export interface GenerateQuestionsRequest {
  category: string;
  difficulty: string;
  count: number;
  school_code?: string;
  topic?: string;
}

export interface GeneratedQuestion {
  question_text: string;
  reference_answer: string;
  tags: string[];
}

/**
 * 生成指定数量的题目
 */
export async function generateQuestions(params: GenerateQuestionsRequest): Promise<GeneratedQuestion[]> {
  const { category, difficulty, count, school_code, topic } = params;

  const categoryName = CATEGORY_NAMES[category] || category;
  const difficultyName = DIFFICULTY_NAMES[difficulty] || difficulty;

  // 构建提示词
  let prompt = `你是一位资深的香港升中面试辅导老师。请生成 ${count} 道 ${categoryName} 类别的面试题目。

要求：
- 难度：${difficultyName}
- 适合香港小学五六年级学生（10-12岁）
- 题目要具体、清晰、有针对性`;

  if (school_code) {
    prompt += `\n- 针对目标学校：${school_code}`;
  }

  if (topic) {
    prompt += `\n- 围绕主题：${topic}`;
  }

  // 根据类别添加特定要求
  switch (category) {
    case 'english-oral':
      prompt += `\n- 题目用英文表达
- 涵盖自我介绍、日常对话、看图说话、即兴演讲等场景
- 评估语法、词汇、流利度、表达能力`;
      break;
    case 'chinese-oral':
      prompt += `\n- 题目用中文表达
- 涵盖朗读、时事讨论、阅读理解、观点阐述等
- 评估语言表达、逻辑思维、文化素养`;
      break;
    case 'logic-thinking':
      prompt += `\n- 涵盖数学应用题、推理题、解难题
- 考查逻辑推理、批判性思维、解决问题的能力`;
      break;
    case 'current-affairs':
      prompt += `\n- 基于近期（2024-2026年）的热点新闻和时事
- 涵盖香港本地、国际事件、社会议题
- 考查时事关注、分析能力、观点表达`;
      break;
    case 'science-knowledge':
      prompt += `\n- 涵盖科学原理、生活中的科学、环境保护、科技发展
- STEM 相关话题（尤其是 SPCC 重视）
- 考查科学素养、探究精神、逻辑思维`;
      break;
    case 'personal-growth':
      prompt += `\n- 涵盖兴趣爱好、学习经历、志向抱负、自我认知
- 考查自我了解、成长反思、价值观`;
      break;
    case 'group-discussion':
      prompt += `\n- 适合小组讨论的开放性话题
- 考查合作技巧、表达观点、倾听回应、领导协调`;
      break;
  }

  prompt += `

请以 JSON 数组格式返回，每个题目包含：
- question_text: 题目内容（字符串）
- reference_answer: 参考答案要点（字符串，150-300字）
- tags: 标签数组（如 ["自我介绍", "英语口语"]）

示例格式：
[
  {
    "question_text": "Please introduce yourself in English, including your name, hobbies, and why you want to join our school.",
    "reference_answer": "参考要点：1. 清晰的自我介绍结构（姓名-爱好-原因）2. 使用完整句子和正确语法 3. 表达对学校的了解和向往 4. 展示个人特点和优势",
    "tags": ["自我介绍", "英语口语", "学校认知"]
  }
]

现在请生成 ${count} 道题目：`;

  console.log(`🤖 生成题目: ${categoryName} (${difficultyName}) x ${count}`);

  try {
    const response = await client.chat(prompt, {
      temperature: 0.8,
      max_tokens: 4000,
    });

    // 提取 JSON
    let jsonText = response.trim();

    // 处理可能的 markdown 代码块
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    // 解析 JSON
    const questions = JSON.parse(jsonText) as GeneratedQuestion[];

    // 验证结果
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI 返回的数据格式不正确');
    }

    // 验证每个题目的字段
    for (const q of questions) {
      if (!q.question_text || !q.reference_answer) {
        throw new Error('题目缺少必要字段');
      }
      // 确保 tags 是数组
      if (!Array.isArray(q.tags)) {
        q.tags = [];
      }
    }

    console.log(`✅ 成功生成 ${questions.length} 道题目`);
    return questions;
  } catch (error: any) {
    console.error('❌ AI 生成题目失败:', error.message);
    throw new AppError(500, `AI 生成题目失败: ${error.message}`);
  }
}
