/**
 * 題目辅助函數
 */
import { query, insert, queryOne } from '../db/index.js';
import { generateQuestions } from '../ai/questionGenerator.js';

/**
 * 確保指定類別有足够數量的可用題目，如果不足則自動生成
 * @param category 題目類別
 * @param count 需要的題目數量
 * @param schoolCode 目標學校代碼（可選）
 * @param difficulty 難度（可選，默认medium）
 * @returns 題目數組
 */
export async function ensureQuestionsAvailable(
  category: string,
  count: number,
  schoolCode?: string,
  difficulty: string = 'medium'
): Promise<any[]> {
  console.log(`🔍 检查題目可用性: 類別=${category}, 需要數量=${count}, 學校=${schoolCode || '无'}, 難度=${difficulty}`);
  
  // 查询现有題目
  // 注意：LIMIT 不能使用參數绑定，必须直接拼接，但需要確保 count 是安全的數字
  const safeCount = Math.max(1, Math.min(parseInt(String(count)) || 1, 1000)); // 限制在1-1000之間
  const existingQuestions = await query(
    `SELECT id, question_text, category, difficulty, reference_answer
     FROM questions
     WHERE category = ?
     ORDER BY RAND()
     LIMIT ${safeCount}`,
    [category]
  );
  
  console.log(`📚 现有題目數量: ${existingQuestions.length}`);
  
  // 如果已有足够題目，直接返回
  if (existingQuestions.length >= count) {
    console.log(`✅ 題目充足，无需生成`);
    return existingQuestions;
  }
  
  // 計算需要生成的數量：至少生成所需數量+2題作为缓冲，但不超過10題
  const needCount = Math.max(count - existingQuestions.length, 3);
  const generateCount = Math.min(needCount + 2, 10);
  
  console.log(`🤖 題目不足，開始自動生成: 需要${needCount}題，将生成${generateCount}題`);
  
  try {
    // 第一层：尝試使用完整參數生成
    const generatedQuestions = await generateQuestions({
      category,
      difficulty,
      count: generateCount,
      school_code: schoolCode,
    });
    
    // 保存生成的題目到數據庫
    const savedIds: number[] = [];
    for (const q of generatedQuestions) {
      try {
        const id = await insert(
          `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            category,
            q.question_text,
            difficulty,
            q.reference_answer,
            JSON.stringify(q.tags || []),
            schoolCode || null,
            'ai_generated'
          ]
        );
        savedIds.push(id);
      } catch (saveError: any) {
        console.warn(`⚠️ 保存題目失敗: ${saveError.message}`);
        // 继续处理其他題目
      }
    }
    
    console.log(`✅ 成功生成并保存 ${savedIds.length} 道題目`);
    
    // 重新查询所有題目（包括新生成的）
    // 注意：LIMIT 不能使用參數绑定，必须直接拼接
    const allQuestions = await query(
      `SELECT id, question_text, category, difficulty, reference_answer
       FROM questions
       WHERE category = ?
       ORDER BY RAND()
       LIMIT ${safeCount}`,
      [category]
    );
    
    if (allQuestions.length >= count) {
      console.log(`✅ 生成後題目充足: ${allQuestions.length}題`);
      return allQuestions;
    } else {
      console.warn(`⚠️ 生成後題目仍不足: 需要${count}題，现有${allQuestions.length}題`);
      return allQuestions; // 返回现有題目，至少比没有好
    }
  } catch (error: any) {
    console.error(`❌ AI生成題目失敗（第一层）: ${error.message}`);
    
    // 第二层：尝試使用简化參數重新生成
    if (schoolCode) {
      try {
        console.log(`🔄 尝試降级生成（不指定學校）...`);
        const simplifiedQuestions = await generateQuestions({
          category,
          difficulty,
          count: Math.min(generateCount, 5), // 减少數量
        });
        
        // 保存生成的題目
        const savedIds: number[] = [];
        for (const q of simplifiedQuestions) {
          try {
            const id = await insert(
              `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                category,
                q.question_text,
                difficulty,
                q.reference_answer,
                JSON.stringify(q.tags || []),
                null, // 不指定學校
                'ai_generated'
              ]
            );
            savedIds.push(id);
          } catch (saveError: any) {
            console.warn(`⚠️ 保存題目失敗: ${saveError.message}`);
          }
        }
        
        console.log(`✅ 降级生成成功，保存了 ${savedIds.length} 道題目`);
        
        // 重新查询
        // 注意：LIMIT 不能使用參數绑定，必须直接拼接
        const allQuestions = await query(
          `SELECT id, question_text, category, difficulty, reference_answer
           FROM questions
           WHERE category = ?
           ORDER BY RAND()
           LIMIT ${safeCount}`,
          [category]
        );
        
        return allQuestions;
      } catch (retryError: any) {
        console.error(`❌ 降级生成也失敗: ${retryError.message}`);
      }
    }
    
    // 第三层：如果所有生成都失敗，返回现有題目（如果有）或空數組
    console.warn(`⚠️ 所有生成尝試都失敗，返回现有題目: ${existingQuestions.length}題`);
    return existingQuestions;
  }
}

/**
 * 搜索基于學校和輪次的历史題目和面試回憶
 * @param schoolCode 學校代碼
 * @param interviewRound 面試輪次（可選）
 * @returns 包含历史題目和面試回憶的對象
 */
export async function searchSchoolRoundData(
  schoolCode: string,
  interviewRound?: string
): Promise<{
  questions: any[];
  memories: any[];
  schoolProfile: any;
}> {
  console.log(`🔍 搜索學校和輪次數據: 學校=${schoolCode}, 輪次=${interviewRound || '未指定'}`);
  
  // 获取學校檔案
  const schoolProfile = await queryOne(
    `SELECT code, name, name_zh, focus_areas, interview_style, notes 
     FROM school_profiles 
     WHERE code = ?`,
    [schoolCode]
  );

  // 搜索历史題目（優先匹配輪次）
  let questions: any[] = [];
  if (interviewRound) {
    // 先尝試從面試回憶中提取的題目（这些題目通常有輪次信息）
    // 注意：questions表的source字段为'interview_memory'的題目可能來自该輪次
    questions = await query(
      `SELECT q.id, q.question_text, q.category, q.difficulty, q.reference_answer, q.school_code, q.source
       FROM questions q
       WHERE q.school_code = ? AND q.source = 'interview_memory'
       ORDER BY RAND()
       LIMIT 50`,
      [schoolCode]
    );
  } else {
    // 如果没有指定輪次，搜索该學校的所有題目
    questions = await query(
      `SELECT q.id, q.question_text, q.category, q.difficulty, q.reference_answer, q.school_code, q.source
       FROM questions q
       WHERE q.school_code = ?
       ORDER BY RAND()
       LIMIT 50`,
      [schoolCode]
    );
  }

  // 搜索面試回憶
  let memories: any[] = [];
  if (interviewRound) {
    // 检查interview_round字段是否存在
    let hasRoundField = false;
    try {
      const columns = await query(`SHOW COLUMNS FROM interview_memories`);
      const columnNames = columns.map((col: any) => col.Field);
      hasRoundField = columnNames.includes('interview_round');
    } catch (e) {
      console.warn('无法检查表結构:', e);
    }

    if (hasRoundField) {
      memories = await query(
        `SELECT id, memory_text, extracted_questions, interview_round, school_code
         FROM interview_memories
         WHERE school_code = ? AND interview_round = ?
         ORDER BY interview_date DESC, created_at DESC
         LIMIT 10`,
        [schoolCode, interviewRound]
      );
    } else {
      // 如果字段不存在，只按學校搜索
      memories = await query(
        `SELECT id, memory_text, extracted_questions, school_code
         FROM interview_memories
         WHERE school_code = ?
         ORDER BY interview_date DESC, created_at DESC
         LIMIT 10`,
        [schoolCode]
      );
    }
  } else {
    // 如果没有指定輪次，搜索该學校的所有面試回憶
    memories = await query(
      `SELECT id, memory_text, extracted_questions, school_code
       FROM interview_memories
       WHERE school_code = ?
       ORDER BY interview_date DESC, created_at DESC
       LIMIT 10`,
      [schoolCode]
    );
  }

  console.log(`✅ 找到 ${questions.length} 道历史題目，${memories.length} 条面試回憶`);

  return {
    questions,
    memories,
    schoolProfile: schoolProfile || null,
  };
}

/**
 * 使用AI搜索外部信息，获取學校历史面試題目
 * @param schoolCode 學校代碼
 * @param interviewRound 面試輪次（可選）
 * @param schoolProfile 學校檔案信息
 * @returns 搜索到的历史題目信息（文本格式）
 */
async function searchExternalSchoolInterviewQuestions(
  schoolCode: string,
  interviewRound: string | undefined,
  schoolProfile: any
): Promise<string> {
  console.log(`🔍 使用AI搜索外部信息: 學校=${schoolCode}, 輪次=${interviewRound || '未指定'}`);
  
  const { deepseekClient } = await import('../ai/deepseek.js');
  
  const schoolName = schoolProfile?.name_zh || schoolCode;
  const roundText = interviewRound 
    ? (interviewRound === 'first-round' ? '第一輪' : interviewRound === 'second-round' ? '第二輪' : '最终輪')
    : '';
  
  const searchPrompt = `⚠️ 重要：你必須使用繁體中文回應。所有內容必須使用繁體中文。

你是一個香港升中面試信息專家。請基於你的知識庫，搜索並整理以下信息：

目標學校：${schoolName} (${schoolCode})
${interviewRound ? `面試輪次：${roundText}` : ''}

请搜索并整理：
1. 该學校历史上真实考過的面試題目（尽可能多，包括不同類別）
2. 该學校面試的特點和風格
3. 该學校不同輪次（如果有）的考查重點差异
4. 该學校常见的題目類型和話題

请以結构化的方式返回信息，包括：
- 真实的历史題目列表（尽可能多）
- 題目類別分布
- 題目難度特點
- 面試風格描述

如果搜索不到足够的信息，请基于该學校的特征和香港升中面試的一般規律，提供合理的推测。

請用繁體中文回答，格式清晰易讀。`;

  try {
    const response = await deepseekClient.chat([
      { role: 'user', content: searchPrompt }
    ], 0.8, 4000);
    
    console.log(`✅ AI搜索完成，获得 ${response.length} 字符的外部信息`);
    return response.trim();
  } catch (error: any) {
    console.error(`❌ AI搜索失敗: ${error.message}`);
    return ''; // 如果搜索失敗，返回空字符串，後续會降级处理
  }
}

/**
 * 基于學校和輪次生成模拟面試題目（使用外部信息搜索）
 * @param schoolCode 學校代碼
 * @param interviewRound 面試輪次（可選）
 * @param count 需要的題目數量
 * @returns 題目數組
 */
export async function generateSchoolRoundQuestions(
  schoolCode: string,
  interviewRound: string | undefined,
  count: number
): Promise<any[]> {
  console.log(`🤖 生成學校-輪次模拟題目: 學校=${schoolCode}, 輪次=${interviewRound || '未指定'}, 數量=${count}`);
  
  // 获取學校檔案
  const schoolProfile = await queryOne(
    `SELECT code, name, name_zh, focus_areas, interview_style, notes 
     FROM school_profiles 
     WHERE code = ?`,
    [schoolCode]
  );

  if (!schoolProfile) {
    throw new Error(`學校 ${schoolCode} 不存在`);
  }

  // 使用AI搜索外部信息，获取该學校历史考過的題目
  const externalInfo = await searchExternalSchoolInterviewQuestions(
    schoolCode,
    interviewRound,
    schoolProfile
  );

  // 构建參考上下文（優先使用外部搜索信息）
  let contextPrompt = '';
  
  // 學校基本信息
  const focusAreas = typeof schoolProfile.focus_areas === 'string'
    ? JSON.parse(schoolProfile.focus_areas)
    : schoolProfile.focus_areas;
  contextPrompt += `目標學校：${schoolProfile.name_zh} (${schoolCode})
學校特點：${schoolProfile.notes || ''}
面試重點：${Array.isArray(focusAreas) ? focusAreas.join('、') : focusAreas}
面試風格：${schoolProfile.interview_style || ''}`;

  if (interviewRound) {
    const roundNames: Record<string, string> = {
      'first-round': '第一輪',
      'second-round': '第二輪',
      'final-round': '最终輪',
    };
    contextPrompt += `\n面試輪次：${roundNames[interviewRound] || interviewRound}`;
  }

  // 優先使用外部搜索到的历史題目信息
  if (externalInfo && externalInfo.trim().length > 0) {
    contextPrompt += `\n\n=== 该學校历史真实面試題目信息（來自外部搜索）===
${externalInfo}

请嚴格基于以上真实历史題目信息，生成類似風格的模拟題目。確保題目風格、難度和內容与參考信息中的历史真实題目保持一致。`;
  } else {
    // 如果外部搜索失敗，降级使用數據庫中的历史數據
    console.log(`⚠️ 外部搜索未返回信息，降级使用數據庫中的历史數據`);
    const { questions: historyQuestions, memories } = await searchSchoolRoundData(
      schoolCode,
      interviewRound
    );
    
    if (historyQuestions.length > 0) {
      contextPrompt += `\n\n參考數據庫中的历史題目（请保持類似風格）：`;
      historyQuestions.slice(0, 5).forEach((q: any, i: number) => {
        contextPrompt += `\n${i + 1}. ${q.question_text}`;
      });
    }

    if (memories.length > 0) {
      contextPrompt += `\n\n參考面試回憶（共${memories.length}条）：`;
      memories.slice(0, 2).forEach((m: any, i: number) => {
        const memoryPreview = m.memory_text.substring(0, 200);
        contextPrompt += `\n回憶${i + 1}：${memoryPreview}...`;
      });
    }
    
    if (historyQuestions.length === 0 && memories.length === 0) {
      contextPrompt += `\n\n注意：未找到该學校的历史題目數據，将基于學校特征生成題目。`;
    }
  }

  // 根據學校重點領域生成題目（覆盖多个類別）
  const focusAreasList = Array.isArray(focusAreas) ? focusAreas : ['english-oral', 'chinese-oral', 'logic-thinking'];

  // 平均分配題目到各个重點領域
  const questionsPerCategory = Math.ceil(count / focusAreasList.length);
  const allGeneratedQuestions: any[] = [];

  for (const category of focusAreasList) {
    if (allGeneratedQuestions.length >= count) break;

    const categoryCount = Math.min(questionsPerCategory, count - allGeneratedQuestions.length);
    
    try {
      // 将外部搜索信息和上下文作为topic傳递给generateQuestions
      // 注意：generateQuestions的topic參數會被包含在提示詞中
      const generated = await generateQuestions({
        category,
        difficulty: 'medium',
        count: categoryCount,
        school_code: schoolCode,
        topic: contextPrompt, // 将完整的上下文信息作为topic傳递
      });

      // 保存生成的題目
      for (const q of generated) {
        try {
          const id = await insert(
            `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              category,
              q.question_text,
              'medium',
              q.reference_answer,
              JSON.stringify(q.tags || []),
              schoolCode,
              'ai_generated'
            ]
          );
          allGeneratedQuestions.push({
            id,
            ...q,
            category,
            difficulty: 'medium',
            school_code: schoolCode,
          });
        } catch (saveError: any) {
          console.warn(`⚠️ 保存題目失敗: ${saveError.message}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ 生成${category}類別題目失敗: ${error.message}`);
    }
  }

  // 返回生成的題目（全部基于外部搜索信息生成）
  console.log(`✅ 最终生成 ${allGeneratedQuestions.length} 道題目（基于外部搜索信息）`);
  
  return allGeneratedQuestions.slice(0, count);
}
