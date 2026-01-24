/**
 * AI 反馈生成服务
 */
import { deepseekClient } from './deepseek.js';
import { AppError } from '../middleware/errorHandler.js';
import { query, queryOne } from '../db/index.js';

export interface FeedbackRequest {
  session_id: number;
  question_text: string;
  answer_text: string;
  category: string;
  target_school?: string;
  reference_answer?: string;
}

export interface AIFeedback {
  language_score: number;
  content_score: number;
  overall_score: number;
  score?: number; // 简化的综合评分 0-10
  strengths: string | string[];
  weaknesses: string | string[];
  suggestions: string;
  reference_thinking?: string; // 参考回答思路
  reference_answer?: string;
  school_specific_tips?: string;
}

/**
 * 生成单题反馈
 */
export async function generateFeedback(params: FeedbackRequest): Promise<AIFeedback> {
  const { question_text, answer_text, category, target_school, reference_answer } = params;

  // 获取学校信息（如果有）
  let schoolContext = '';
  if (target_school) {
    const school = await queryOne(
      'SELECT name_zh, interview_style, notes FROM school_profiles WHERE code = ?',
      [target_school]
    );
    if (school) {
      schoolContext = `\n目标学校：${school.name_zh} (${target_school})
面试风格：${school.interview_style}
学校特点：${school.notes}`;
    }
  }

  // 构建提示词
  const prompt = `你是一位资深的香港升中面试辅导老师。请分析学生的回答并给出详细反馈。

题目信息：
类别：${getCategoryName(category)}
问题：${question_text}${schoolContext}

学生回答：
${answer_text}
${reference_answer ? `\n题目参考答案：\n${reference_answer}` : ''}

请以 JSON 格式返回详细反馈：

{
  "score": 7.5,
  "strengths": "语法正确，表达流畅",
  "weaknesses": "词汇较简单，缺少具体例子",
  "suggestions": "建议增加具体例子来支持观点，可以使用更丰富的词汇...",
  "reference_thinking": "回答这道题的思路：首先..., 其次..., 最后...",
  "reference_answer": "优秀回答示例：...",
  "language_score": 85,
  "content_score": 78,
  "overall_score": 82
}

评分标准：
- score（简化评分）：0-10分（小数），便于学生理解
- language_score（语言质量）：0-100分，评估语法、词汇、表达流畅度
- content_score（内容深度）：0-100分，评估相关性、完整性、见解深度
- overall_score（综合得分）：0-100分

要求：
1. score 是简化版评分（0-10），小学生水平 6-8 分是合理的
2. strengths 简洁地指出 2-3 个优点，用逗号分隔
3. weaknesses 简洁地指出 2-3 个不足，用逗号分隔
4. suggestions 具体可行的改进建议（80-150字）
5. reference_thinking **必须提供**：清晰的答题思路（3-5个要点）
6. reference_answer **必须提供**：一个优秀的参考答案（150-250字）
7. 所有文字内容使用繁体中文

现在请分析并返回反馈：`;

  console.log(`🤖 生成反馈: 类别=${category}, 学校=${target_school || '无'}`);

  try {
    const response = await deepseekClient.chat(
      [{ role: 'user', content: prompt }],
      0.7,
      2000
    );

    // 提取 JSON
    let jsonText = response.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    // 解析 JSON
    const feedback = JSON.parse(jsonText) as AIFeedback;

    // 规范化 strengths 和 weaknesses（可能是字符串或数组）
    if (typeof feedback.strengths === 'string') {
      feedback.strengths = feedback.strengths;
    } else if (Array.isArray(feedback.strengths)) {
      feedback.strengths = feedback.strengths.join('，');
    }

    if (typeof feedback.weaknesses === 'string') {
      feedback.weaknesses = feedback.weaknesses;
    } else if (Array.isArray(feedback.weaknesses)) {
      feedback.weaknesses = feedback.weaknesses.join('，');
    }

    // 计算简化评分（如果没有）
    if (!feedback.score && feedback.overall_score) {
      feedback.score = Math.round((feedback.overall_score / 10) * 10) / 10;
    }

    // 验证必要字段
    if (
      typeof feedback.overall_score !== 'number'
    ) {
      throw new Error('AI 返回的反馈格式不正确');
    }

    console.log(`✅ 反馈生成成功: 综合得分=${feedback.overall_score}, 简化评分=${feedback.score}`);
    return feedback;
  } catch (error: any) {
    console.error('❌ AI 生成反馈失败:', error.message);
    throw new AppError(500, `AI 生成反馈失败: ${error.message}`);
  }
}

/**
 * 生成会话总结
 */
export async function generateSessionSummary(sessionId: number): Promise<any> {
  // 获取会话的所有问答记录
  const qaRecords = await query(
    `SELECT question_text, answer_text, ai_feedback
     FROM qa_records WHERE session_id = ?`,
    [sessionId]
  );

  if (qaRecords.length === 0) {
    throw new AppError(400, '会话没有问答记录');
  }

  // 计算平均分
  let totalScore = 0;
  let count = 0;

  for (const record of qaRecords) {
    if (record.ai_feedback) {
      const feedback =
        typeof record.ai_feedback === 'string' ? JSON.parse(record.ai_feedback) : record.ai_feedback;
      if (feedback.overall_score) {
        totalScore += feedback.overall_score;
        count++;
      }
    }
  }

  const averageScore = count > 0 ? Math.round(totalScore / count) : 0;

  // 构建提示词
  const qaText = qaRecords
    .map(
      (record, index) =>
        `问题${index + 1}：${record.question_text}\n回答：${record.answer_text}\n`
    )
    .join('\n');

  const prompt = `你是一位资深的香港升中面试辅导老师。请根据学生本次练习会话的所有问答记录，生成一个总结报告。

本次会话包含 ${qaRecords.length} 道题目：

${qaText}

平均得分：${averageScore} 分

请以 JSON 格式返回总结：

{
  "total_questions": ${qaRecords.length},
  "average_score": ${averageScore},
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["不足1", "不足2", "不足3"],
  "suggestions": "总体改进建议...",
  "progress_comment": "与之前表现对比..."
}

要求：
1. strengths：列出 2-3 个突出优点
2. weaknesses：列出 2-3 个需要改进的方面
3. suggestions：具体可行的训练建议（150-250字）
4. progress_comment：鼓励性的进步评价（50-100字）

现在请生成总结：`;

  console.log(`🤖 生成会话总结: 会话ID=${sessionId}, 题数=${qaRecords.length}`);

  try {
    const response = await deepseekClient.chat(
      [{ role: 'user', content: prompt }],
      0.7,
      2000
    );

    // 提取 JSON
    let jsonText = response.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const summary = JSON.parse(jsonText);

    console.log(`✅ 会话总结生成成功`);
    return summary;
  } catch (error: any) {
    console.error('❌ AI 生成会话总结失败:', error.message);
    throw new AppError(500, `AI 生成会话总结失败: ${error.message}`);
  }
}

function getCategoryName(category: string): string {
  const map: Record<string, string> = {
    'english-oral': '英文口语',
    'chinese-oral': '中文表达',
    'logic-thinking': '逻辑思维',
    'current-affairs': '时事常识',
    'science-knowledge': '科学常识',
    'personal-growth': '个人成长',
    'group-discussion': '小组讨论',
  };
  return map[category] || category;
}
