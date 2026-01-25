import { deepseekClient, DeepSeekMessage } from './deepseek.js'

/**
 * AI服務 - 封装各種AI功能
 */

// ... (保留原有的其他 AI 服務函數)

/**
 * 生成學校檔案
 */
export async function generateSchoolProfile(schoolName: string): Promise<{
  code: string;
  name: string;
  name_zh: string;
  focus_areas: string[];
  interview_style: string;
  notes: string;
}> {
  const systemPrompt = `⚠️ 重要：你必須使用繁體中文回應。所有中文內容必須使用繁體中文。

你是一位資深的香港教育諮詢專家，對香港中學的面試特點非常了解。
請嚴格按照JSON格式返回數據，不要包含任何其他文字。`;

  const userPrompt = `請根據以下學校名稱，生成詳細的學校檔案信息：
學校名稱：${schoolName}

請提供以下信息（JSON格式）：
1. code: 學校簡稱代碼（大寫字母，如 SPCC, QC, LSC）
2. name: 學校英文全名
3. name_zh: 學校中文全名（必須使用繁體中文）
4. focus_areas: 面試重點領域數組，從以下選擇3-5項：
   - "english-oral" (英文口語)
   - "chinese-expression" (中文表達)
   - "logical-thinking" (邏輯思維)
   - "current-affairs" (時事常識)
   - "science-knowledge" (科學常識)
   - "personal-growth" (個人成長)
   - "group-discussion" (小組討論)
5. interview_style: 面試風格，簡短描述（如：academic-rigorous, balanced, holistic, interactive）
6. notes: 學校面試特點和重點的詳細說明（100-200字，必須使用繁體中文）`;

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await deepseekClient.chat(messages, 0.7, 800);

  try {
    // 提取 JSON 內容（可能包含在 markdown 代碼块中）
    let content = response;
    
    // 尝試提取 JSON（可能在 ```json ``` 中）
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    // 尝試提取 JSON 對象
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) {
      content = objMatch[0];
    }

    const schoolProfile = JSON.parse(content.trim());

    // 验证必要字段
    if (!schoolProfile.code || !schoolProfile.name || !schoolProfile.name_zh || 
        !schoolProfile.focus_areas || !schoolProfile.interview_style) {
      throw new Error('AI 返回的數據格式不完整');
    }

    return schoolProfile;
  } catch (error) {
    console.error('解析 AI 返回的學校檔案失敗:', error);
    console.error('AI 原始返回:', response);
    throw new Error('AI 返回的數據格式无效');
  }
}
