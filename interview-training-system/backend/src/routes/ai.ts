/**
 * AI 生成工具路由
 */
import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { generateSchoolProfile } from '../ai/schoolProfile.js';
import { generateQuestions } from '../ai/questionGenerator.js';
import { insert, query, queryOne } from '../db/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

const router = Router();

/**
 * 從设置文件读取學生信息
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
      // 文件不存在，返回默认值
      return { student_name: '學生' };
    }
    console.error('讀取設置失敗:', error);
    return { student_name: '學生' };
  }
}

/**
 * AI 生成學校檔案
 * POST /api/ai/generate-school
 * Body: { schoolName: string }
 */
router.post('/generate-school', async (req: Request, res: Response) => {
  try {
    const { schoolName } = req.body;

    if (!schoolName || !schoolName.trim()) {
      throw new AppError(400, '请提供學校名称');
    }

    console.log(`🤖 AI 生成學校檔案: ${schoolName}`);

    // 調用 AI 服務生成學校檔案
    const schoolProfile = await generateSchoolProfile(schoolName.trim());

    res.json({
      success: true,
      data: schoolProfile,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('AI 生成學校檔案失敗:', error);
    throw new AppError(500, 'AI 生成失敗，請重試');
  }
});

/**
 * AI 生成題目
 * POST /api/ai/generate-questions
 * Body: { category, difficulty, count?, school_code?, topic?, save? }
 */
router.post('/generate-questions', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, count = 5, school_code, topic, save = false } = req.body;

    // 验证必填字段
    if (!category || !difficulty) {
      throw new AppError(400, '缺少必填字段：category, difficulty');
    }

    // 验证數量
    const questionCount = parseInt(count);
    if (isNaN(questionCount) || questionCount < 1 || questionCount > 20) {
      throw new AppError(400, '題目數量必须在 1-20 之間');
    }

    console.log(`🤖 AI 生成題目: ${category} (${difficulty}) x ${questionCount}`);
    const questions = await generateQuestions({
      category,
      difficulty,
      count: questionCount,
      school_code,
      topic,
    });

    // 如果需要保存到數據庫
    if (save) {
      console.log(`💾 保存 ${questions.length} 道題目到數據庫...`);
      const savedIds: number[] = [];

      for (const q of questions) {
        const id = await insert(
          `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [category, q.question_text, difficulty, q.reference_answer, JSON.stringify(q.tags), school_code || null, 'ai_generated']
        );
        savedIds.push(id);
      }

      console.log(`✅ 已保存 ${savedIds.length} 道題目`);

      res.json({
        success: true,
        message: `成功生成並保存 ${questions.length} 道題目`,
        data: questions.map((q, i) => ({ ...q, id: savedIds[i] })),
      });
    } else {
      res.json({
        success: true,
        message: `成功生成 ${questions.length} 道題目（未保存）`,
        data: questions,
      });
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('AI 生成題目失敗:', error);
    throw new AppError(500, 'AI 生成失敗，請重試');
  }
});

/**
 * AI 分析面試回憶文本并提取問答對
 * POST /api/ai/extract-interview-memory
 * Body: { text, category?, school_code?, interview_round? }
 */
router.post('/extract-interview-memory', async (req: Request, res: Response) => {
  try {
    const { text, category, school_code, interview_round } = req.body;

    if (!text || !text.trim()) {
      throw new AppError(400, '请提供面試回憶文本');
    }

    console.log(`🤖 AI 分析面試回憶文本 (${text.length} 字)...`);

    // 調用 DeepSeek API 分析文本
    const { deepseekClient } = await import('../ai/deepseek.js');
    
    // 构建輪次相關的提示
    let roundContext = '';
    if (interview_round) {
      roundContext = `\n面試輪次：${interview_round}（用户已指定）`;
    } else {
      roundContext = `\n請嘗試從文本中識別面試輪次信息（如"第一輪"、"第二輪"、"最終輪"等），如果無法識別則返回null。`;
    }
    
    const prompt = `⚠️ 重要：你必須使用繁體中文回應。所有分析結果必須使用繁體中文（除英文專項的原始問題外）。

你是一個面試題目提取和弱點分析專家。請從以下香港升中面試回憶文本中：
1. 提取所有的面試問題
2. 分析學生的表現弱點
3. 對每個問題的分類進行置信度評估
4. 識別面試輪次信息（如果文本中包含）${roundContext}

面試回憶文本：
"""
${text.trim()}
"""

專項類別定義（七大類別）：
- english-oral: 英文口語（自我介紹、日常對話、看圖說話、即興演講）
- chinese-oral: 中文表達（朗讀、時事討論、閱讀理解、觀點闡述）
- logic-thinking: 邏輯思維（數學應用題、推理題、解難題、腦筋急轉彎）
- current-affairs: 時事常識（新聞熱點、社會議題、香港本地事務、國際事件）
- science-knowledge: 科學常識（科學原理、生活中的科學、環境保護、科技發展、STEM相關話題）
- personal-growth: 個人成長（興趣愛好、學習經歷、志向抱負、自我認知）
- group-discussion: 小組討論（合作技巧、表達觀點、傾聽回應、領導協調）

分類示例（正確分類）：
- "Tell me about your favorite book." → english-oral (置信度: 0.95)
- "你覺得什麼是領導力？" → chinese-oral (置信度: 0.90)
- "如果1+1=2，那麼2+2等於多少？" → logic-thinking (置信度: 0.98)
- "你對香港最近的新聞有什麼看法？" → current-affairs (置信度: 0.85)
- "為什麼天空是藍色的？" → science-knowledge (置信度: 0.92)
- "你平時有什麼興趣愛好？" → personal-growth (置信度: 0.88)
- "在小組討論中，你如何表達不同意見？" → group-discussion (置信度: 0.90)

常見誤分類模式（避免）：
- 不要將英文問題誤分類為 chinese-oral
- 不要將邏輯題誤分類為 science-knowledge
- 不要將個人成長問題誤分類為 group-discussion
- 注意區分 current-affairs 和 chinese-oral（時事討論類）

請按照以下JSON格式返回分析結果：
{
  "questions": [
    {
      "question_text": "面試官問的問題（英文專項保持英文，其他使用繁體中文）",
      "category": "專項類別（必須從七大類別中選擇一個）",
      "classification_confidence": 0.85,
      "difficulty": "難度（easy/medium/hard）",
      "reference_answer": "建議答案要點（必須使用繁體中文，英文專項除外）",
      "tags": ["標籤1", "標籤2"],
      "notes": "從文本中提取的原始回答或備註（必須使用繁體中文，英文專項除外）"
    }
  ],
  "weaknesses": [
    {
      "category": "專項類別",
      "weakness_type": "弱點類型（vocabulary/grammar/logic/knowledge_gap/confidence/expression）",
      "description": "弱點描述（具體說明問題所在，必須使用繁體中文）",
      "example_text": "體現弱點的原文片段",
      "severity": "嚴重程度（low/medium/high）",
      "improvement_suggestions": "具體的改進建議（必須使用繁體中文）",
      "related_topics": ["相關話題1", "相關話題2"]
    }
  ],
  "summary": "對這次面試的整體分析和特點總結（必須使用繁體中文）",
  "interview_round": "面試輪次（如：first-round, second-round, final-round，如果無法識別則返回null）"
}

注意：
1. 問題提取：只提取明確的問題，不要臆造
2. 分類要求：
   - 必須從七大類別中選擇一個最合適的類別
   - 每個分類必須提供置信度分數（0-1之間的小數）
   - 置信度低於0.7的分類應標記為"待確認"
   - 如果問題涉及多個類別，選擇最主要的類別
3. 弱點分析：基於學生的實際回答進行分析
4. 弱點類型說明：
   - vocabulary: 詞彙量不足
   - grammar: 語法錯誤
   - logic: 邏輯不清晰
   - knowledge_gap: 知識盲區
   - confidence: 信心不足、表達猶豫
   - expression: 表達能力弱
5. 嚴重程度評估要客觀合理
6. 改進建議要具體可操作
7. 所有中文內容必須使用繁體中文（除英文專項的原始問題外）`;

    const response = await deepseekClient.chat([
      { role: 'user', content: prompt }
    ]);
    
    // 解析返回的JSON（使用更健壮的解析邏輯）
    let extractedData;
    
    /**
     * 智能提取JSON對象（使用括號匹配找到完整的JSON）
     */
    function extractCompleteJSON(text: string): string | null {
      // 1. 尝試提取markdown代碼块中的JSON
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
      }
      
      // 2. 找到第一个 { 的位置
      const firstBrace = text.indexOf('{');
      if (firstBrace === -1) return null;
      
      // 3. 使用括號匹配找到完整的JSON對象
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      let jsonEnd = -1;
      
      for (let i = firstBrace; i < text.length; i++) {
        const char = text[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
      }
      
      if (jsonEnd > firstBrace) {
        return text.substring(firstBrace, jsonEnd);
      }
      
      return null;
    }
    
    /**
     * 尝試修复常见的JSON格式错误
     */
    function fixJSONFormat(jsonText: string): string {
      // 移除注释
      jsonText = jsonText.replace(/\/\/.*$/gm, '');
      jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // 移除尾随逗號（在 } 或 ] 之前）
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
      
      // 修复未完成的键值對（如 "key": 後面没有值）
      jsonText = jsonText.replace(/("[\w_]+")\s*:\s*([^,}\]]*?)(?=\s*[,}\]])/g, (match, key, value) => {
        const trimmedValue = value.trim();
        if (!trimmedValue || trimmedValue === '') {
          // 如果值缺失，删除整个键值對
          return '';
        }
        // 如果值不是有效的JSON值（不是字符串、數字、布尔、null、對象、數組），尝試修复
        if (!trimmedValue.match(/^(".*"|[\d.]+|true|false|null|\{.*\}|\[.*\])$/)) {
          // 尝試将其作为字符串
          return `${key}: ${JSON.stringify(trimmedValue)}`;
        }
        return match;
      });
      
      // 清理多余的逗號
      jsonText = jsonText.replace(/,+/g, ',');
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
      
      return jsonText;
    }
    
    try {
      let jsonText = response.trim();
      
      // 1. 提取完整的JSON對象
      const completeJSON = extractCompleteJSON(jsonText);
      if (!completeJSON) {
        throw new Error('無法從AI響應中提取完整的JSON對象');
      }
      
      // 2. 修复JSON格式
      jsonText = fixJSONFormat(completeJSON);
      
      // 3. 尝試解析JSON
      extractedData = JSON.parse(jsonText);
      
      // 4. 验证必要字段
      if (!extractedData.questions || !Array.isArray(extractedData.questions)) {
        extractedData.questions = [];
      }
      if (!extractedData.weaknesses || !Array.isArray(extractedData.weaknesses)) {
        extractedData.weaknesses = [];
      }
      if (!extractedData.summary) {
        extractedData.summary = '';
      }
      
    } catch (parseError: any) {
      console.error('解析AI響應失敗:', parseError);
      console.error('AI原始響應（前1000字符）:', response.substring(0, 1000));
      console.error('JSON解析錯誤詳情:', parseError.message);
      
      // 尝試部分提取：即使JSON不完整，也尝試提取能解析的部分
      try {
        let questions: any[] = [];
        let weaknesses: any[] = [];
        let summary = 'AI返回格式錯誤，無法解析完整數據。請檢查輸入文本或稍後重試。';
        
        // 尝試提取questions數組（使用括號匹配找到完整的數組）
        const questionsStart = response.indexOf('"questions"');
        if (questionsStart !== -1) {
          const arrayStart = response.indexOf('[', questionsStart);
          if (arrayStart !== -1) {
            let bracketCount = 0;
            let inString = false;
            let escapeNext = false;
            let arrayEnd = -1;
            
            for (let i = arrayStart; i < response.length; i++) {
              const char = response[i];
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }
              if (!inString) {
                if (char === '[') bracketCount++;
                else if (char === ']') {
                  bracketCount--;
                  if (bracketCount === 0) {
                    arrayEnd = i + 1;
                    break;
                  }
                }
              }
            }
            
            if (arrayEnd > arrayStart) {
              try {
                const questionsText = response.substring(arrayStart, arrayEnd);
                questions = JSON.parse(questionsText);
              } catch (e) {
                console.warn('無法解析questions數組:', e);
              }
            }
          }
        }
        
        // 尝試提取weaknesses數組（同樣的方法）
        const weaknessesStart = response.indexOf('"weaknesses"');
        if (weaknessesStart !== -1) {
          const arrayStart = response.indexOf('[', weaknessesStart);
          if (arrayStart !== -1) {
            let bracketCount = 0;
            let inString = false;
            let escapeNext = false;
            let arrayEnd = -1;
            
            for (let i = arrayStart; i < response.length; i++) {
              const char = response[i];
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }
              if (!inString) {
                if (char === '[') bracketCount++;
                else if (char === ']') {
                  bracketCount--;
                  if (bracketCount === 0) {
                    arrayEnd = i + 1;
                    break;
                  }
                }
              }
            }
            
            if (arrayEnd > arrayStart) {
              try {
                const weaknessesText = response.substring(arrayStart, arrayEnd);
                weaknesses = JSON.parse(weaknessesText);
              } catch (e) {
                console.warn('無法解析weaknesses數組:', e);
              }
            }
          }
        }
        
        // 尝試提取summary（简单字符串匹配）
        const summaryMatch = response.match(/"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (summaryMatch) {
          try {
            summary = JSON.parse('"' + summaryMatch[1] + '"');
          } catch (e) {
            summary = summaryMatch[1];
          }
        }
        
        extractedData = {
          questions: Array.isArray(questions) ? questions : [],
          weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
          summary: summary || 'AI返回格式錯誤，無法解析完整數據。'
        };
        
        console.warn(`⚠️  使用部分提取的數據：${extractedData.questions.length}个問題，${extractedData.weaknesses.length}个弱點`);
        
      } catch (fallbackError: any) {
        // 如果连部分提取都失敗，返回空結构
        extractedData = {
          questions: [],
          weaknesses: [],
          summary: 'AI返回格式錯誤，無法解析數據。請檢查輸入文本或稍後重試。'
        };
        console.warn('⚠️  使用空數據結构作为最终後備方案');
      }
    }
    
    // 確保extractedData已定义
    if (!extractedData) {
      extractedData = {
        questions: [],
        weaknesses: [],
        summary: '無法解析AI響應'
      };
    }

    // 如果用户指定了類別或學校，覆盖AI的判断
    if (category || school_code) {
      extractedData.questions = extractedData.questions.map((q: any) => ({
        ...q,
        ...(category && { category }),
        ...(school_code && { school_code }),
      }));
    }

    // 处理輪次信息：優先使用用户指定的，否則使用AI識別的
    if (interview_round) {
      extractedData.interview_round = interview_round;
    } else if (extractedData.interview_round) {
      // AI識別的輪次，转换为標準格式
      const round = extractedData.interview_round.toLowerCase();
      if (round.includes('第一輪') || round.includes('1') || round.includes('first')) {
        extractedData.interview_round = 'first-round';
      } else if (round.includes('第二輪') || round.includes('2') || round.includes('second')) {
        extractedData.interview_round = 'second-round';
      } else if (round.includes('最终') || round.includes('final') || round.includes('最後')) {
        extractedData.interview_round = 'final-round';
      }
    }

    // 確保每个問題都有分類置信度，如果没有則设置为默认值
    extractedData.questions = extractedData.questions.map((q: any) => ({
      ...q,
      classification_confidence: q.classification_confidence ?? 0.8,
      classification_source: 'auto',
    }));

    console.log(`✅ 成功提取 ${extractedData.questions.length} 個問題${extractedData.interview_round ? `，輪次：${extractedData.interview_round}` : ''}`);

    res.json({
      success: true,
      message: `成功提取 ${extractedData.questions.length} 個問題`,
      data: extractedData,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('AI 分析面試回憶失敗:', error);
    throw new AppError(500, 'AI 分析失敗，請重試');
  }
});

/**
 * 保存學生弱點分析
 * POST /api/ai/save-weaknesses
 * Body: { weaknesses: Array<Weakness>, source_text? }
 * 注意：student_name 統一從设置获取，不再從请求參數获取
 */
router.post('/save-weaknesses', async (req: Request, res: Response) => {
  try {
    const { weaknesses, source_text } = req.body;

    if (!weaknesses || !Array.isArray(weaknesses) || weaknesses.length === 0) {
      throw new AppError(400, '请提供要保存的弱點分析列表');
    }

    // 從设置获取學生信息
    const settings = await getStudentInfoFromSettings();
    const student_name = settings.student_name;

    console.log(`💾 保存 ${weaknesses.length} 条弱點分析... (學生: ${student_name || '未设置'})`);
    const savedIds: number[] = [];

    for (const w of weaknesses) {
      const id = await insert(
        `INSERT INTO student_weaknesses 
        (student_name, category, weakness_type, description, example_text, severity, improvement_suggestions, related_topics, source_text, identified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student_name || null,
          w.category,
          w.weakness_type,
          w.description,
          w.example_text || null,
          w.severity || 'medium',
          w.improvement_suggestions || '',
          JSON.stringify(w.related_topics || []),
          source_text || null,
          'ai',
        ]
      );
      savedIds.push(id);
    }

    console.log(`✅ 已保存 ${savedIds.length} 条弱點分析`);

    res.json({
      success: true,
      message: `成功保存 ${savedIds.length} 條弱點分析`,
      data: { savedIds },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('保存弱點分析失敗:', error);
    throw new AppError(500, '保存失敗，請重試');
  }
});

/**
 * 保存面試回憶提取的問題到題庫
 * POST /api/ai/save-interview-questions
 * Body: { questions: Array<Question>, source_text?: string }
 */
router.post('/save-interview-questions', async (req: Request, res: Response) => {
  try {
    const { questions, source_text } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new AppError(400, '请提供要保存的問題列表');
    }

    console.log(`💾 保存 ${questions.length} 道面試回憶題目...`);
    const savedIds: number[] = [];

    // 检查新字段是否存在（只检查一次）
    let hasNotes = false;
    let hasClassificationFields = false;
    try {
      const columns = await query(`SHOW COLUMNS FROM questions`);
      const columnNames = columns.map((col: any) => col.Field);
      hasNotes = columnNames.includes('notes');
      hasClassificationFields = columnNames.includes('classification_confidence');
    } catch (e) {
      console.warn('無法檢查表結構，使用基礎字段:', e);
    }

    for (const q of questions) {
      let sql = `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source`;
      let values: any[] = [
        q.category,
        q.question_text,
        q.difficulty || 'medium',
        q.reference_answer || '',
        JSON.stringify(q.tags || []),
        q.school_code || null,
        'interview_memory',
      ];

      if (hasNotes) {
        sql += `, notes`;
        values.push(q.notes || source_text || null);
      }

      if (hasClassificationFields) {
        sql += `, classification_confidence, classification_source, last_classified_at`;
        values.push(q.classification_confidence ?? 0.8);
        values.push(q.classification_source || 'auto');
        values.push(new Date());
      }

      sql += `) VALUES (${values.map(() => '?').join(', ')})`;

      const id = await insert(sql, values);
      savedIds.push(id);
    }

    console.log(`✅ 已保存 ${savedIds.length} 道題目到題庫`);

    res.json({
      success: true,
      message: `成功保存 ${savedIds.length} 道題目到題庫`,
      data: { savedIds },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('保存面試回憶題目失敗:', error);
    throw new AppError(500, '保存失敗，請重試');
  }
});

/**
 * 保存完整的面試回憶到interview_memories表
 * POST /api/ai/save-interview-memory
 * Body: { memory_text, school_code?, interview_date?, interview_round?, extracted_questions?, feedback?, tags? }
 */
router.post('/save-interview-memory', async (req: Request, res: Response) => {
  try {
    const { memory_text, school_code, interview_date, interview_round, extracted_questions, feedback, tags } = req.body;

    if (!memory_text || !memory_text.trim()) {
      throw new AppError(400, '请提供面試回憶文本');
    }

    console.log(`💾 保存面試回憶到數據庫... (學校: ${school_code || '未指定'}, 輪次: ${interview_round || '未指定'})`);

    const { insert } = await import('../db/index.js');

    // 检查interview_round字段是否存在
    let hasRoundField = false;
    try {
      const columns = await query(`SHOW COLUMNS FROM interview_memories`);
      const columnNames = columns.map((col: any) => col.Field);
      hasRoundField = columnNames.includes('interview_round');
    } catch (e) {
      console.warn('无法检查表結构，假设字段不存在:', e);
    }

    let sql = `INSERT INTO interview_memories (memory_text, school_code, interview_date`;
    let values: any[] = [memory_text.trim(), school_code || null, interview_date || null];

    if (hasRoundField) {
      sql += `, interview_round`;
      values.push(interview_round || null);
    }

    if (extracted_questions) {
      sql += `, extracted_questions`;
      values.push(JSON.stringify(extracted_questions));
    }

    if (feedback) {
      sql += `, feedback`;
      values.push(JSON.stringify(feedback));
    }

    if (tags) {
      sql += `, tags`;
      values.push(JSON.stringify(tags));
    }

    sql += `) VALUES (${values.map(() => '?').join(', ')})`;

    const memoryId = await insert(sql, values);

    console.log(`✅ 已保存面試回憶，ID: ${memoryId}`);

    res.json({
      success: true,
      message: '成功保存面試回憶',
      data: { id: memoryId },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('保存面試回憶失敗:', error);
    throw new AppError(500, '保存失敗，请重試');
  }
});

/**
 * 根據學生弱點生成針對性題目
 * POST /api/ai/generate-questions-from-weaknesses
 * Body: { weakness_ids?: number[], category?, count? }
 */
router.post('/generate-questions-from-weaknesses', async (req: Request, res: Response) => {
  try {
    const { weakness_ids, category, count = 5 } = req.body;

    // 获取弱點信息
    let weaknesses: any[] = [];
    const { query } = await import('../db/index.js');

    if (weakness_ids && weakness_ids.length > 0) {
      // 根據ID获取指定弱點
      const placeholders = weakness_ids.map(() => '?').join(',');
      weaknesses = await query(
        `SELECT * FROM student_weaknesses WHERE id IN (${placeholders}) AND status = 'active'`,
        weakness_ids
      );
    } else if (category) {
      // 获取该類別的所有活跃弱點
      weaknesses = await query(
        `SELECT * FROM student_weaknesses WHERE category = ? AND status = 'active' ORDER BY severity DESC, created_at DESC LIMIT 5`,
        [category]
      );
    } else {
      throw new AppError(400, '请提供 weakness_ids 或 category');
    }

    if (weaknesses.length === 0) {
      throw new AppError(404, '未找到相關弱點記錄');
    }

    console.log(`🤖 根據 ${weaknesses.length} 个弱點生成針對性題目...`);

    // 构建AI提示詞
    const weaknessDescriptions = weaknesses.map((w: any) => 
      `- ${w.description} (類型: ${w.weakness_type}, 嚴重程度: ${w.severity})`
    ).join('\n');

    const { deepseekClient } = await import('../ai/deepseek.js');
    
    const prompt = `⚠️ 重要：你必須使用繁體中文回應。所有題目內容必須使用繁體中文（除英文專項外）。

你是一個香港升中面試題目生成專家。請根據以下學生的弱點，生成 ${count} 道針對性的練習題目。

學生弱點分析：
${weaknessDescriptions}

要求：
1. 題目要針對上述弱點進行強化訓練
2. 難度要適中，既能挑戰學生又不會過難
3. 題目要實用，貼近真實面試場景
4. 每道題目要有清晰的訓練目標
5. 所有內容必須使用繁體中文（除英文專項外）

請按照以下JSON格式返回：
{
  "questions": [
    {
      "question_text": "題目內容（必須使用繁體中文，英文專項除外）",
      "category": "專項類別",
      "difficulty": "medium",
      "reference_answer": "參考答案要點（必須使用繁體中文，英文專項除外）",
      "tags": ["標籤1", "標籤2"],
      "target_weakness": "針對的弱點類型",
      "training_focus": "訓練重點說明（必須使用繁體中文）"
    }
  ]
}`;

    const response = await deepseekClient.chat([
      { role: 'user', content: prompt }
    ]);

    // 解析返回的JSON
    let generatedData;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('無法從AI響應中提取JSON');
      }
    } catch (parseError) {
      console.error('解析AI響應失敗:', parseError);
      throw new AppError(500, 'AI返回格式錯誤，請重試');
    }

    // 保存生成的題目到數據庫
    const savedIds: number[] = [];
    for (const q of generatedData.questions) {
      const id = await insert(
        `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, source, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          q.category,
          q.question_text,
          q.difficulty || 'medium',
          q.reference_answer || '',
          JSON.stringify(q.tags || []),
          'ai_generated_targeted',
          `針對弱點: ${q.target_weakness}. ${q.training_focus || ''}`,
        ]
      );
      savedIds.push(id);
    }

    // 更新弱點的練習次數
    for (const weakness of weaknesses) {
      await query(
        `UPDATE student_weaknesses SET practice_count = practice_count + 1, updated_at = NOW() WHERE id = ?`,
        [weakness.id]
      );
    }

    console.log(`✅ 已生成并保存 ${savedIds.length} 道針對性題目`);

    res.json({
      success: true,
      message: `成功生成 ${savedIds.length} 道針對性題目`,
      data: {
        questions: generatedData.questions.map((q: any, i: number) => ({
          ...q,
          id: savedIds[i],
        })),
        targeted_weaknesses: weaknesses.map((w: any) => ({
          id: w.id,
          description: w.description,
          weakness_type: w.weakness_type,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('生成針對性題目失敗:', error);
    throw new AppError(500, '生成失敗，请重試');
  }
});

/**
 * 测試 API 连接
 * POST /api/ai/test-connection
 * Body: { api_key?: string }
 */
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { api_key } = req.body;
    
    // 临時设置API Key（如果提供）
    const originalKey = process.env.DEEPSEEK_API_KEY;
    if (api_key) {
      process.env.DEEPSEEK_API_KEY = api_key;
    }

    console.log('🔍 测試 DeepSeek API 连接...');

    const { deepseekClient } = await import('../ai/deepseek.js');
    const response = await deepseekClient.chat([
      { role: 'user', content: '请回复"连接成功"' }
    ]);

    // 恢复原始API Key
    if (api_key && originalKey) {
      process.env.DEEPSEEK_API_KEY = originalKey;
    }

    console.log('✅ API 连接测試成功');

    res.json({
      success: true,
      message: 'API Key 验证成功',
      data: { response: response.substring(0, 100) },
    });
  } catch (error: any) {
    console.error('API 连接测試失敗:', error);
    
    // 根據错误類型返回不同消息
    let message = 'API Key 验证失敗';
    if (error.message?.includes('401')) {
      message = 'API Key 无效或已過期';
    } else if (error.message?.includes('429')) {
      message = 'API 調用频率超限，请稍後重試';
    } else if (error.message?.includes('network') || error.code === 'ECONNREFUSED') {
      message = '网络连接失敗，请检查网络设置';
    }
    
    throw new AppError(400, message);
  }
});

/**
 * AI生成學習素材
 * POST /api/ai/generate-learning-material
 * Body: { weakness_id, material_type? }
 */
router.post('/generate-learning-material', async (req: Request, res: Response) => {
  try {
    const { weakness_id, material_type = 'text' } = req.body;

    if (!weakness_id) {
      throw new AppError(400, '请提供弱點ID');
    }

    // 获取弱點信息
    const weakness = await queryOne(
      'SELECT * FROM student_weaknesses WHERE id = ?',
      [weakness_id]
    );

    if (!weakness) {
      throw new AppError(404, '弱點記錄不存在');
    }

    console.log(`🤖 生成學習素材: 弱點ID=${weakness_id}, 類型=${material_type}`);

    // 調用AI生成學習素材
    const { generateLearningMaterial } = await import('../ai/materialGenerator.js');
    const generatedMaterial = await generateLearningMaterial({
      weakness_id,
      material_type,
      weakness,
    });

    // 保存素材到數據庫
    const materialId = await insert(
      `INSERT INTO learning_materials 
       (weakness_id, category, weakness_type, title, content, material_type, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        weakness_id,
        weakness.category,
        weakness.weakness_type,
        generatedMaterial.title,
        generatedMaterial.content,
        generatedMaterial.material_type,
        JSON.stringify(generatedMaterial.tags || []),
        'ai',
      ]
    );

    // 获取保存的素材
    const savedMaterial = await queryOne(
      'SELECT * FROM learning_materials WHERE id = ?',
      [materialId]
    );

    console.log(`✅ 學習素材已生成并保存: ID=${materialId}`);

    res.json({
      success: true,
      message: '學習素材生成成功',
      data: {
        ...savedMaterial,
        tags: savedMaterial.tags ? (typeof savedMaterial.tags === 'string' ? JSON.parse(savedMaterial.tags) : savedMaterial.tags) : [],
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('生成學習素材失敗:', error);
    throw new AppError(500, '生成學習素材失敗，请重試');
  }
});

export default router;
