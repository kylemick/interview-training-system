import { deepseekClient, DeepSeekMessage } from './deepseek.js'

/**
 * AI服务 - 封装各种AI功能
 */

// ... (保留原有的其他 AI 服务函数)

/**
 * 生成学校档案
 */
export async function generateSchoolProfile(schoolName: string): Promise<{
  code: string;
  name: string;
  name_zh: string;
  focus_areas: string[];
  interview_style: string;
  notes: string;
}> {
  const systemPrompt = `你是一位资深的香港教育咨询专家，对香港中学的面试特点非常了解。
请严格按照JSON格式返回数据，不要包含任何其他文字。`;

  const userPrompt = `请根据以下学校名称，生成详细的学校档案信息：
学校名称：${schoolName}

请提供以下信息（JSON格式）：
1. code: 学校简称代码（大写字母，如 SPCC, QC, LSC）
2. name: 学校英文全名
3. name_zh: 学校中文全名
4. focus_areas: 面试重点领域数组，从以下选择3-5项：
   - "english-oral" (英文口语)
   - "chinese-expression" (中文表达)
   - "logical-thinking" (逻辑思维)
   - "current-affairs" (时事常识)
   - "science-knowledge" (科学常识)
   - "personal-growth" (个人成长)
   - "group-discussion" (小组讨论)
5. interview_style: 面试风格，简短描述（如：academic-rigorous, balanced, holistic, interactive）
6. notes: 学校面试特点和重点的详细说明（100-200字）`;

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await deepseekClient.chat(messages, 0.7, 800);

  try {
    // 提取 JSON 内容（可能包含在 markdown 代码块中）
    let content = response;
    
    // 尝试提取 JSON（可能在 ```json ``` 中）
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    // 尝试提取 JSON 对象
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) {
      content = objMatch[0];
    }

    const schoolProfile = JSON.parse(content.trim());

    // 验证必要字段
    if (!schoolProfile.code || !schoolProfile.name || !schoolProfile.name_zh || 
        !schoolProfile.focus_areas || !schoolProfile.interview_style) {
      throw new Error('AI 返回的数据格式不完整');
    }

    return schoolProfile;
  } catch (error) {
    console.error('解析 AI 返回的学校档案失败:', error);
    console.error('AI 原始返回:', response);
    throw new Error('AI 返回的数据格式无效');
  }
}
