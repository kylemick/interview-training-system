/**
 * 题目辅助函数
 */
import { query, insert } from '../db/index.js';
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
