/**
 * 题目辅助函数
 */
import { query, insert, queryOne } from '../db/index.js';
import { generateQuestions } from '../ai/questionGenerator.js';

/**
 * 确保指定类别有足够数量的可用题目，如果不足则自动生成
 * @param category 题目类别
 * @param count 需要的题目数量
 * @param schoolCode 目标学校代码（可选）
 * @param difficulty 难度（可选，默认medium）
 * @returns 题目数组
 */
export async function ensureQuestionsAvailable(
  category: string,
  count: number,
  schoolCode?: string,
  difficulty: string = 'medium'
): Promise<any[]> {
  console.log(`🔍 检查题目可用性: 类别=${category}, 需要数量=${count}, 学校=${schoolCode || '无'}, 难度=${difficulty}`);
  
  // 查询现有题目
  // 注意：LIMIT 不能使用参数绑定，必须直接拼接，但需要确保 count 是安全的数字
  const safeCount = Math.max(1, Math.min(parseInt(String(count)) || 1, 1000)); // 限制在1-1000之间
  const existingQuestions = await query(
    `SELECT id, question_text, category, difficulty, reference_answer
     FROM questions
     WHERE category = ?
     ORDER BY RAND()
     LIMIT ${safeCount}`,
    [category]
  );
  
  console.log(`📚 现有题目数量: ${existingQuestions.length}`);
  
  // 如果已有足够题目，直接返回
  if (existingQuestions.length >= count) {
    console.log(`✅ 题目充足，无需生成`);
    return existingQuestions;
  }
  
  // 计算需要生成的数量：至少生成所需数量+2题作为缓冲，但不超过10题
  const needCount = Math.max(count - existingQuestions.length, 3);
  const generateCount = Math.min(needCount + 2, 10);
  
  console.log(`🤖 题目不足，开始自动生成: 需要${needCount}题，将生成${generateCount}题`);
  
  try {
    // 第一层：尝试使用完整参数生成
    const generatedQuestions = await generateQuestions({
      category,
      difficulty,
      count: generateCount,
      school_code: schoolCode,
    });
    
    // 保存生成的题目到数据库
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
        console.warn(`⚠️ 保存题目失败: ${saveError.message}`);
        // 继续处理其他题目
      }
    }
    
    console.log(`✅ 成功生成并保存 ${savedIds.length} 道题目`);
    
    // 重新查询所有题目（包括新生成的）
    // 注意：LIMIT 不能使用参数绑定，必须直接拼接
    const allQuestions = await query(
      `SELECT id, question_text, category, difficulty, reference_answer
       FROM questions
       WHERE category = ?
       ORDER BY RAND()
       LIMIT ${safeCount}`,
      [category]
    );
    
    if (allQuestions.length >= count) {
      console.log(`✅ 生成后题目充足: ${allQuestions.length}题`);
      return allQuestions;
    } else {
      console.warn(`⚠️ 生成后题目仍不足: 需要${count}题，现有${allQuestions.length}题`);
      return allQuestions; // 返回现有题目，至少比没有好
    }
  } catch (error: any) {
    console.error(`❌ AI生成题目失败（第一层）: ${error.message}`);
    
    // 第二层：尝试使用简化参数重新生成
    if (schoolCode) {
      try {
        console.log(`🔄 尝试降级生成（不指定学校）...`);
        const simplifiedQuestions = await generateQuestions({
          category,
          difficulty,
          count: Math.min(generateCount, 5), // 减少数量
        });
        
        // 保存生成的题目
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
                null, // 不指定学校
                'ai_generated'
              ]
            );
            savedIds.push(id);
          } catch (saveError: any) {
            console.warn(`⚠️ 保存题目失败: ${saveError.message}`);
          }
        }
        
        console.log(`✅ 降级生成成功，保存了 ${savedIds.length} 道题目`);
        
        // 重新查询
        // 注意：LIMIT 不能使用参数绑定，必须直接拼接
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
        console.error(`❌ 降级生成也失败: ${retryError.message}`);
      }
    }
    
    // 第三层：如果所有生成都失败，返回现有题目（如果有）或空数组
    console.warn(`⚠️ 所有生成尝试都失败，返回现有题目: ${existingQuestions.length}题`);
    return existingQuestions;
  }
}

/**
 * 搜索基于学校和轮次的历史题目和面试回忆
 * @param schoolCode 学校代码
 * @param interviewRound 面试轮次（可选）
 * @returns 包含历史题目和面试回忆的对象
 */
export async function searchSchoolRoundData(
  schoolCode: string,
  interviewRound?: string
): Promise<{
  questions: any[];
  memories: any[];
  schoolProfile: any;
}> {
  console.log(`🔍 搜索学校和轮次数据: 学校=${schoolCode}, 轮次=${interviewRound || '未指定'}`);
  
  // 获取学校档案
  const schoolProfile = await queryOne(
    `SELECT code, name, name_zh, focus_areas, interview_style, notes 
     FROM school_profiles 
     WHERE code = ?`,
    [schoolCode]
  );

  // 搜索历史题目（优先匹配轮次）
  let questions: any[] = [];
  if (interviewRound) {
    // 先尝试从面试回忆中提取的题目（这些题目通常有轮次信息）
    // 注意：questions表的source字段为'interview_memory'的题目可能来自该轮次
    questions = await query(
      `SELECT q.id, q.question_text, q.category, q.difficulty, q.reference_answer, q.school_code, q.source
       FROM questions q
       WHERE q.school_code = ? AND q.source = 'interview_memory'
       ORDER BY RAND()
       LIMIT 50`,
      [schoolCode]
    );
  } else {
    // 如果没有指定轮次，搜索该学校的所有题目
    questions = await query(
      `SELECT q.id, q.question_text, q.category, q.difficulty, q.reference_answer, q.school_code, q.source
       FROM questions q
       WHERE q.school_code = ?
       ORDER BY RAND()
       LIMIT 50`,
      [schoolCode]
    );
  }

  // 搜索面试回忆
  let memories: any[] = [];
  if (interviewRound) {
    // 检查interview_round字段是否存在
    let hasRoundField = false;
    try {
      const columns = await query(`SHOW COLUMNS FROM interview_memories`);
      const columnNames = columns.map((col: any) => col.Field);
      hasRoundField = columnNames.includes('interview_round');
    } catch (e) {
      console.warn('无法检查表结构:', e);
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
      // 如果字段不存在，只按学校搜索
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
    // 如果没有指定轮次，搜索该学校的所有面试回忆
    memories = await query(
      `SELECT id, memory_text, extracted_questions, school_code
       FROM interview_memories
       WHERE school_code = ?
       ORDER BY interview_date DESC, created_at DESC
       LIMIT 10`,
      [schoolCode]
    );
  }

  console.log(`✅ 找到 ${questions.length} 道历史题目，${memories.length} 条面试回忆`);

  return {
    questions,
    memories,
    schoolProfile: schoolProfile || null,
  };
}

/**
 * 使用AI搜索外部信息，获取学校历史面试题目
 * @param schoolCode 学校代码
 * @param interviewRound 面试轮次（可选）
 * @param schoolProfile 学校档案信息
 * @returns 搜索到的历史题目信息（文本格式）
 */
async function searchExternalSchoolInterviewQuestions(
  schoolCode: string,
  interviewRound: string | undefined,
  schoolProfile: any
): Promise<string> {
  console.log(`🔍 使用AI搜索外部信息: 学校=${schoolCode}, 轮次=${interviewRound || '未指定'}`);
  
  const { deepseekClient } = await import('../ai/deepseek.js');
  
  const schoolName = schoolProfile?.name_zh || schoolCode;
  const roundText = interviewRound 
    ? (interviewRound === 'first-round' ? '第一轮' : interviewRound === 'second-round' ? '第二轮' : '最终轮')
    : '';
  
  const searchPrompt = `你是一个香港升中面试信息专家。请基于你的知识库，搜索并整理以下信息：

目标学校：${schoolName} (${schoolCode})
${interviewRound ? `面试轮次：${roundText}` : ''}

请搜索并整理：
1. 该学校历史上真实考过的面试题目（尽可能多，包括不同类别）
2. 该学校面试的特点和风格
3. 该学校不同轮次（如果有）的考查重点差异
4. 该学校常见的题目类型和话题

请以结构化的方式返回信息，包括：
- 真实的历史题目列表（尽可能多）
- 题目类别分布
- 题目难度特点
- 面试风格描述

如果搜索不到足够的信息，请基于该学校的特征和香港升中面试的一般规律，提供合理的推测。

请用中文回答，格式清晰易读。`;

  try {
    const response = await deepseekClient.chat([
      { role: 'user', content: searchPrompt }
    ], 0.8, 4000);
    
    console.log(`✅ AI搜索完成，获得 ${response.length} 字符的外部信息`);
    return response.trim();
  } catch (error: any) {
    console.error(`❌ AI搜索失败: ${error.message}`);
    return ''; // 如果搜索失败，返回空字符串，后续会降级处理
  }
}

/**
 * 基于学校和轮次生成模拟面试题目（使用外部信息搜索）
 * @param schoolCode 学校代码
 * @param interviewRound 面试轮次（可选）
 * @param count 需要的题目数量
 * @returns 题目数组
 */
export async function generateSchoolRoundQuestions(
  schoolCode: string,
  interviewRound: string | undefined,
  count: number
): Promise<any[]> {
  console.log(`🤖 生成学校-轮次模拟题目: 学校=${schoolCode}, 轮次=${interviewRound || '未指定'}, 数量=${count}`);
  
  // 获取学校档案
  const schoolProfile = await queryOne(
    `SELECT code, name, name_zh, focus_areas, interview_style, notes 
     FROM school_profiles 
     WHERE code = ?`,
    [schoolCode]
  );

  if (!schoolProfile) {
    throw new Error(`学校 ${schoolCode} 不存在`);
  }

  // 使用AI搜索外部信息，获取该学校历史考过的题目
  const externalInfo = await searchExternalSchoolInterviewQuestions(
    schoolCode,
    interviewRound,
    schoolProfile
  );

  // 构建参考上下文（优先使用外部搜索信息）
  let contextPrompt = '';
  
  // 学校基本信息
  const focusAreas = typeof schoolProfile.focus_areas === 'string'
    ? JSON.parse(schoolProfile.focus_areas)
    : schoolProfile.focus_areas;
  contextPrompt += `目标学校：${schoolProfile.name_zh} (${schoolCode})
学校特点：${schoolProfile.notes || ''}
面试重点：${Array.isArray(focusAreas) ? focusAreas.join('、') : focusAreas}
面试风格：${schoolProfile.interview_style || ''}`;

  if (interviewRound) {
    const roundNames: Record<string, string> = {
      'first-round': '第一轮',
      'second-round': '第二轮',
      'final-round': '最终轮',
    };
    contextPrompt += `\n面试轮次：${roundNames[interviewRound] || interviewRound}`;
  }

  // 优先使用外部搜索到的历史题目信息
  if (externalInfo && externalInfo.trim().length > 0) {
    contextPrompt += `\n\n=== 该学校历史真实面试题目信息（来自外部搜索）===
${externalInfo}

请严格基于以上真实历史题目信息，生成类似风格的模拟题目。确保题目风格、难度和内容与参考信息中的历史真实题目保持一致。`;
  } else {
    // 如果外部搜索失败，降级使用数据库中的历史数据
    console.log(`⚠️ 外部搜索未返回信息，降级使用数据库中的历史数据`);
    const { questions: historyQuestions, memories } = await searchSchoolRoundData(
      schoolCode,
      interviewRound
    );
    
    if (historyQuestions.length > 0) {
      contextPrompt += `\n\n参考数据库中的历史题目（请保持类似风格）：`;
      historyQuestions.slice(0, 5).forEach((q: any, i: number) => {
        contextPrompt += `\n${i + 1}. ${q.question_text}`;
      });
    }

    if (memories.length > 0) {
      contextPrompt += `\n\n参考面试回忆（共${memories.length}条）：`;
      memories.slice(0, 2).forEach((m: any, i: number) => {
        const memoryPreview = m.memory_text.substring(0, 200);
        contextPrompt += `\n回忆${i + 1}：${memoryPreview}...`;
      });
    }
    
    if (historyQuestions.length === 0 && memories.length === 0) {
      contextPrompt += `\n\n注意：未找到该学校的历史题目数据，将基于学校特征生成题目。`;
    }
  }

  // 根据学校重点领域生成题目（覆盖多个类别）
  const focusAreasList = Array.isArray(focusAreas) ? focusAreas : ['english-oral', 'chinese-oral', 'logic-thinking'];

  // 平均分配题目到各个重点领域
  const questionsPerCategory = Math.ceil(count / focusAreasList.length);
  const allGeneratedQuestions: any[] = [];

  for (const category of focusAreasList) {
    if (allGeneratedQuestions.length >= count) break;

    const categoryCount = Math.min(questionsPerCategory, count - allGeneratedQuestions.length);
    
    try {
      // 将外部搜索信息和上下文作为topic传递给generateQuestions
      // 注意：generateQuestions的topic参数会被包含在提示词中
      const generated = await generateQuestions({
        category,
        difficulty: 'medium',
        count: categoryCount,
        school_code: schoolCode,
        topic: contextPrompt, // 将完整的上下文信息作为topic传递
      });

      // 保存生成的题目
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
          console.warn(`⚠️ 保存题目失败: ${saveError.message}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ 生成${category}类别题目失败: ${error.message}`);
    }
  }

  // 返回生成的题目（全部基于外部搜索信息生成）
  console.log(`✅ 最终生成 ${allGeneratedQuestions.length} 道题目（基于外部搜索信息）`);
  
  return allGeneratedQuestions.slice(0, count);
}
