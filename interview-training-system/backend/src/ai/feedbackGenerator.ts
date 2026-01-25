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
      if (category === 'english-oral') {
        schoolContext = `\nTarget School: ${school.name_zh} (${target_school})
Interview Style: ${school.interview_style}
School Characteristics: ${school.notes}`;
      } else {
        schoolContext = `\n目标学校：${school.name_zh} (${target_school})
面试风格：${school.interview_style}
学校特点：${school.notes}`;
      }
    }
  }

  let prompt: string;

  // 英文口语类别使用全英文提示词
  if (category === 'english-oral') {
    prompt = `IMPORTANT: You MUST respond in English ONLY. All feedback content must be in English.

You are an experienced Hong Kong secondary school interview tutor.
Please analyze the student's English oral response and provide detailed feedback in English.

Question Information:
Category: English Oral
Question: ${question_text}${schoolContext}

Student's Answer:
${answer_text}
${reference_answer ? `\nReference Answer:\n${reference_answer}` : ''}

Return in JSON format with ALL FIELDS IN ENGLISH:
{
  "score": 7.5,
  "strengths": "Good grammar, fluent expression",
  "weaknesses": "Limited vocabulary, lack of specific examples",
  "suggestions": "Consider adding specific examples to support your points. You could use more sophisticated vocabulary to make your response more impressive. Try to elaborate more on your reasons with concrete details...",
  "reference_thinking": "To answer this question: First, introduce yourself clearly with your name and basic information. Second, explain your hobbies with specific details and why you enjoy them. Finally, connect your interests with the school's values and explain why you're a good fit.",
  "reference_answer": "An excellent response would be: Hello, my name is... I am passionate about... because it helps me... I would like to join your school because I've learned that your school emphasizes... which aligns perfectly with my interests and goals...",
  "language_score": 85,
  "content_score": 78,
  "overall_score": 82
}

Scoring Criteria:
- score (simplified): 0-10 scale (decimal), easy for students to understand
- language_score: 0-100, assess grammar, vocabulary, fluency
- content_score: 0-100, assess relevance, completeness, depth of insight
- overall_score: 0-100

Requirements:
1. score is simplified version (0-10), 6-8 is reasonable for primary students
2. strengths: briefly list 2-3 strong points in English, separated by commas
3. weaknesses: briefly list 2-3 areas for improvement in English, separated by commas
4. suggestions: specific actionable improvement suggestions in English (80-150 words)
5. reference_thinking: MUST provide clear answer structure in English (3-5 key points)
6. reference_answer: MUST provide an excellent sample answer in English (150-250 words)

Now analyze and return the feedback:`;
  } else {
    // 其他類別使用繁體中文提示詞
    prompt = `⚠️ 重要：你必須使用繁體中文回應。所有反饋內容必須使用繁體中文。

你是一位資深的香港升中面試輔導老師。請分析學生的回答並給出詳細反饋。

題目信息：
類別：${getCategoryName(category)}
問題：${question_text}${schoolContext}

學生回答：
${answer_text}
${reference_answer ? `\n題目參考答案：\n${reference_answer}` : ''}

請以 JSON 格式返回詳細反饋：

{
  "score": 7.5,
  "strengths": "語法正確，表達流暢",
  "weaknesses": "詞彙較簡單，缺少具體例子",
  "suggestions": "建議增加具體例子來支持觀點，可以使用更豐富的詞彙...",
  "reference_thinking": "回答這道題的思路：首先..., 其次..., 最後...",
  "reference_answer": "優秀回答示例：...",
  "language_score": 85,
  "content_score": 78,
  "overall_score": 82
}

評分標準：
- score（簡化評分）：0-10分（小數），便於學生理解
- language_score（語言質量）：0-100分，評估語法、詞彙、表達流暢度
- content_score（內容深度）：0-100分，評估相關性、完整性、見解深度
- overall_score（綜合得分）：0-100分

要求：
1. score 是簡化版評分（0-10），小學生水平 6-8 分是合理的
2. strengths 簡潔地指出 2-3 個優點，用逗號分隔（必須使用繁體中文）
3. weaknesses 簡潔地指出 2-3 個不足，用逗號分隔（必須使用繁體中文）
4. suggestions 具體可行的改進建議（80-150字，必須使用繁體中文）
5. reference_thinking **必須提供**：清晰的答題思路（3-5個要點，必須使用繁體中文）
6. reference_answer **必須提供**：一個優秀的參考答案（150-250字，必須使用繁體中文）
7. 所有文字內容必須使用繁體中文

現在請分析並返回反饋：`;
  }

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

  const prompt = `⚠️ 重要：你必須使用繁體中文回應。所有內容必須使用繁體中文。

你是一位資深的香港升中面試輔導老師。請根據學生本次練習會話的所有問答記錄，生成一個總結報告。

本次會話包含 ${qaRecords.length} 道題目：

${qaText}

平均得分：${averageScore} 分

請以 JSON 格式返回總結：

{
  "total_questions": ${qaRecords.length},
  "average_score": ${averageScore},
  "strengths": ["優點1", "優點2"],
  "weaknesses": ["不足1", "不足2", "不足3"],
  "suggestions": "總體改進建議...（必須使用繁體中文）",
  "progress_comment": "與之前表現對比...（必須使用繁體中文）"
}

要求：
1. strengths：列出 2-3 個突出優點（必須使用繁體中文）
2. weaknesses：列出 2-3 個需要改進的方面（必須使用繁體中文）
3. suggestions：具體可行的訓練建議（150-250字，必須使用繁體中文）
4. progress_comment：鼓勵性的進步評價（50-100字，必須使用繁體中文）

現在請生成總結：`;

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
