/**
 * AI 题目生成服务
 */
import { deepseekClient } from './deepseek.js';
import { AppError } from '../middleware/errorHandler.js';

// 类别中文名称映射
const CATEGORY_NAMES: Record<string, string> = {
  'english-oral': '英文口语',
  'chinese-oral': '中文表达',
  'logic-thinking': '逻辑思维',
  'current-affairs': '时事常识',
  'science-knowledge': '科学常识',
  'personal-growth': '个人成长',
  'group-discussion': '小组讨论',
  'chinese-reading': '中文阅读理解',
  'english-reading': '英文阅读理解',
  'mathematics': '数学基础',
  'science-practice': '科学实践',
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

  let prompt: string;

  // 英文口语和英文阅读理解类别使用全英文提示词
  if (category === 'english-oral' || category === 'english-reading') {
    if (category === 'english-oral') {
      prompt = `IMPORTANT: You MUST respond in English ONLY. All content must be in English.

You are an experienced Hong Kong secondary school interview tutor.
Please generate ${count} interview questions for the English Oral category.

Requirements:
- ALL content MUST be in English (question text, reference answer, tags)
- Difficulty: ${difficultyName}
- Suitable for P5-P6 students (10-12 years old)
- Focus on: self-introduction, daily conversation, picture description, impromptu speech
- Assess: grammar, vocabulary, fluency, expression ability`;
    } else if (category === 'english-reading') {
      prompt = `IMPORTANT: You MUST respond in English ONLY. All content must be in English.

You are an experienced Hong Kong secondary school interview tutor.
Please generate ${count} English reading comprehension exercises for P5-P6 students (10-12 years old).

Requirements:
- ALL content MUST be in English (article, questions, reference answers, tags)
- Difficulty: ${difficultyName}
- Each exercise should include:
  1. A reading passage (150-400 words, age-appropriate)
  2. 3-5 comprehension questions covering:
     - Main idea and key information
     - Detail understanding
     - Vocabulary in context
     - Opinion and inference
  3. Reference answers explaining the correct responses
- Topics should be interesting and relevant to Hong Kong students
- Assess: reading comprehension, vocabulary, critical thinking, opinion analysis`;
    }

    if (school_code) {
      prompt += `\n- Target school: ${school_code}`;
    }

    if (topic) {
      // 如果topic包含外部搜索信息，则作为重要参考信息
      if (topic.includes('===') || topic.includes('历史真实') || topic.includes('外部搜索') || topic.includes('历史真实面试题目')) {
        prompt += `\n\n=== IMPORTANT REFERENCE INFORMATION ===
${topic}

Please strictly base your questions on the above reference information, ensuring the question style and content are consistent with the real historical interview questions mentioned.`;
      } else {
        prompt += `\n- Topic: ${topic}`;
      }
    }

    if (category === 'english-oral') {
      prompt += `

Return in JSON array format with ALL fields in English:
[
  {
    "question_text": "Please introduce yourself in English, including your name, hobbies, and why you want to join our school.",
    "reference_answer": "Key points: 1. Clear self-introduction structure (name-hobbies-reason) 2. Use complete sentences and correct grammar 3. Show understanding and aspiration for the school 4. Demonstrate personal characteristics and strengths",
    "tags": ["self-introduction", "English oral", "school awareness"]
  }
]

Now generate ${count} questions:`;
    } else if (category === 'english-reading') {
      prompt += `

Return in JSON array format with ALL fields in English. Each item should include the full reading passage and questions:
[
  {
    "question_text": "Reading Passage:\n\n[Full passage text, 150-400 words]\n\nQuestions:\n1. What is the main idea of this passage?\n2. According to the passage, what is...?\n3. What does the word '...' mean in this context?\n4. What is the author's opinion about...?\n5. What can you infer from the passage?",
    "reference_answer": "Main idea: [summary]\n\nQuestion 1: [answer with explanation]\nQuestion 2: [answer with explanation]\nQuestion 3: [word meaning and context]\nQuestion 4: [author's opinion analysis]\nQuestion 5: [inference explanation]",
    "tags": ["reading comprehension", "vocabulary", "critical thinking"]
  }
]

Now generate ${count} reading comprehension exercises:`;
    }
  } else {
    // 其他类别使用繁體中文提示詞
    prompt = `⚠️ 重要：你必須使用繁體中文回應。所有內容必須使用繁體中文。

你是一位資深的香港升中面試輔導老師。請生成 ${count} 道 ${categoryName} 類別的面試題目。

要求：
- 難度：${difficultyName}
- 適合香港小學五六年級學生（10-12歲）
- 題目要具體、清晰、有針對性
- 所有內容（題目、參考答案、標籤）必須使用繁體中文`;

    if (school_code) {
      prompt += `\n- 針對目標學校：${school_code}`;
    }

    if (topic) {
      // 如果topic包含外部搜索信息（以"==="開頭），則作為重要參考信息
      if (topic.includes('===') || topic.includes('歷史真實') || topic.includes('外部搜索')) {
        prompt += `\n\n=== 重要參考信息 ===
${topic}

請嚴格基於以上參考信息生成題目，確保題目風格和內容與參考信息中的歷史真實題目保持一致。`;
      } else {
        prompt += `\n- 圍繞主題：${topic}`;
      }
    }

    // 根據類別添加特定要求
    switch (category) {
      case 'chinese-oral':
        prompt += `\n- 題目用繁體中文表達
- 涵蓋朗讀、時事討論、閱讀理解、觀點闡述等
- 評估語言表達、邏輯思維、文化素養`;
        break;
      case 'chinese-reading':
        prompt += `\n- 生成繁體中文閱讀理解練習，包含完整的閱讀文章和相關問題
- 每道題目應包含：
  1. 閱讀文章（200-500字，適合小學五六年級）
  2. 3-5個閱讀理解問題，包括：
     - 文章主旨和關鍵信息
     - 細節理解
     - 字詞解釋
     - 觀點提煉和分析
- 參考答案應包含文章主旨、關鍵信息、字詞解釋、觀點分析
- 考查閱讀理解、字詞理解、觀點提煉等能力`;
        break;
      case 'logic-thinking':
        prompt += `\n- 涵蓋數學應用題、推理題、解難題
- 考查邏輯推理、批判性思維、解決問題的能力`;
        break;
      case 'mathematics':
        prompt += `\n- 生成數學基礎題目，適合小學五六年級水平
- 題目類型包括：
  1. 計算題（四則運算、分數小數）
  2. 概念理解題（幾何圖形、數學概念）
  3. 應用題（實際問題的數學解決）
  4. 邏輯推理題（數學推理）
- 參考答案應包含解題步驟、計算方法、答案驗證
- 考查計算能力、數學概念理解、基礎數學知識應用`;
        break;
      case 'current-affairs':
        prompt += `\n- 基於近期（2024-2026年）的熱點新聞和時事
- 涵蓋香港本地、國際事件、社會議題
- 考查時事關注、分析能力、觀點表達`;
        break;
      case 'science-knowledge':
        prompt += `\n- 涵蓋科學原理、生活中的科學、環境保護、科技發展
- STEM 相關話題（尤其是 SPCC 重視）
- 考查科學素養、探究精神、邏輯思維`;
        break;
      case 'science-practice':
        prompt += `\n- 生成科學實踐題目，結合生活實際
- 題目類型包括：
  1. 科學現象說明題（解釋自然現象）
  2. 科學推理題（基於科學原理的推理）
  3. 科學行為題（環保行為、科學應用）
- 參考答案應包含科學原理解釋、推理過程、實際應用
- 考查科學現象說明、科學推理、科學行為等能力`;
        break;
      case 'personal-growth':
        prompt += `\n- 涵蓋興趣愛好、學習經歷、志向抱負、自我認知
- 考查自我了解、成長反思、價值觀`;
        break;
      case 'group-discussion':
        prompt += `\n- 適合小組討論的開放性話題
- 考查合作技巧、表達觀點、傾聽回應、領導協調`;
        break;
    }

    prompt += `

請以 JSON 數組格式返回，每個題目包含：
- question_text: 題目內容（字符串，必須使用繁體中文）
- reference_answer: 參考答案要點（字符串，150-300字，必須使用繁體中文）
- tags: 標籤數組（如 ["自我介紹", "中文表達"]，必須使用繁體中文）

示例格式：
[
  {
    "question_text": "請用繁體中文介紹你最喜歡的一個節日，並說明原因。",
    "reference_answer": "參考要點：1. 節日名稱和時間 2. 節日傳統和習俗 3. 個人經歷和感受 4. 喜歡的具體原因 5. 語言流暢，表達清晰",
    "tags": ["文化常識", "個人經歷"]
  }
]

現在請生成 ${count} 道題目（所有內容必須使用繁體中文）：`;
  }

  console.log(`🤖 生成题目: ${categoryName} (${difficultyName}) x ${count}`);

  try {
    const response = await deepseekClient.chat(
      [{ role: 'user', content: prompt }],
      0.8,
      4000
    );

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

    // 语言验证（仅对 english-oral 和 english-reading）
    if (category === 'english-oral' || category === 'english-reading') {
      for (const q of questions) {
        const chineseChars = q.question_text.match(/[\u4e00-\u9fa5]/g) || [];
        const totalChars = q.question_text.replace(/\s/g, '').length;
        const chineseRatio = totalChars > 0 ? chineseChars.length / totalChars : 0;
        
        if (chineseRatio > 0.3) {
          console.warn(`⚠️ 题目语言不符合预期（中文占比${(chineseRatio * 100).toFixed(1)}%）: ${q.question_text.substring(0, 50)}...`);
        }
      }
    }

    // 验证阅读理解题目的格式（中文和英文阅读理解）
    if (category === 'chinese-reading' || category === 'english-reading') {
      for (const q of questions) {
        // 检查是否包含文章和问题
        if (!q.question_text.includes('阅读') && !q.question_text.includes('Reading') && 
            !q.question_text.includes('文章') && !q.question_text.includes('passage')) {
          console.warn(`⚠️ 阅读理解题目可能缺少文章内容: ${q.question_text.substring(0, 50)}...`);
        }
      }
    }

    console.log(`✅ 成功生成 ${questions.length} 道题目`);
    return questions;
  } catch (error: any) {
    console.error('❌ AI 生成题目失败:', error.message);
    throw new AppError(500, `AI 生成题目失败: ${error.message}`);
  }
}
