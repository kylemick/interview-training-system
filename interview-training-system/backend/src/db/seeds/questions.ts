/**
 * 題庫種子數據
 */
import { insert } from '../index.js';

interface SeedQuestion {
  category: string;
  question_text: string;
  difficulty: string;
  reference_answer: string;
  tags: string[];
  school_code?: string;
}

const seedQuestionsData: SeedQuestion[] = [
  // 英文口語 (English Oral)
  {
    category: 'english-oral',
    difficulty: 'easy',
    question_text: 'Please introduce yourself in English, including your name, age, and one hobby.',
    reference_answer: '參考要點：1. 清晰的自我介绍結构 2. 使用完整句子 3. 正確的語法和發音 4. 展示个人特點。示例：My name is... I am... years old. My hobby is... because...',
    tags: ['自我介绍', '基础口語'],
  },
  {
    category: 'english-oral',
    difficulty: 'medium',
    question_text: 'Describe your favorite book and explain why you like it.',
    reference_answer: '參考要點：1. 書名和作者 2. 故事概要 3. 喜欢的原因（情节、人物、主題）4. 從中學到的东西 5. 使用丰富的形容詞和连接詞',
    tags: ['阅读', '觀點表達'],
  },
  {
    category: 'english-oral',
    difficulty: 'hard',
    question_text: 'If you could change one thing about your school, what would it be and why?',
    reference_answer: '參考要點：1. 批判性思維 2. 提出具体問題 3. 解释原因和影响 4. 提供改進建議 5. 考虑多方面因素 6. 表達要有邏輯性',
    tags: ['批判性思維', '學校生活'],
    school_code: 'SPCC',
  },

  // 中文表達 (Chinese Oral)
  {
    category: 'chinese-oral',
    difficulty: 'easy',
    question_text: '請用中文介紹你最喜歡的一個節日，並說明原因。',
    reference_answer: '參考要點：1. 節日名稱和時間 2. 節日傳統和習俗 3. 個人經歷和感受 4. 喜歡的具體原因 5. 語言流暢，表達清晰',
    tags: ['文化常識', '個人經歷'],
  },
  {
    category: 'chinese-oral',
    difficulty: 'medium',
    question_text: '你認為什麼是一個好朋友？請舉例說明。',
    reference_answer: '參考要點：1. 定義好朋友的特質（誠實、支持、信任等）2. 結合具體例子 3. 個人經驗 4. 反思友誼的意義 5. 表達要有深度',
    tags: ['人際關係', '價值觀'],
  },
  {
    category: 'chinese-oral',
    difficulty: 'hard',
    question_text: '請朗讀以下段落，並解釋其中的寓意：「塞翁失馬，焉知非福。」',
    reference_answer: '參考要點：1. 正確流暢的朗讀 2. 理解故事背景 3. 解釋寓意（禍福相依）4. 聯繫現實生活例子 5. 表達個人見解',
    tags: ['成語典故', '閱讀理解'],
  },

  // 邏輯思維 (Logic Thinking)
  {
    category: 'logic-thinking',
    difficulty: 'easy',
    question_text: '如果一個蘋果3元，一個橙2元，小明用20元可以買幾種不同的水果組合？',
    reference_answer: '參考要點：1. 係統性思考 2. 列舉所有可能（6蘋果1橙、5蘋果1橙+2元找零等）3. 檢查答案 4. 表達清晰的計算過程',
    tags: ['數學應用', '組合思維'],
  },
  {
    category: 'logic-thinking',
    difficulty: 'medium',
    question_text: '有三個開關，分別控制三盞燈，你在開關所在的房間看不到燈。你只能進入燈所在的房間一次，如何確定哪個開關控制哪盞燈？',
    reference_answer: '參考要點：1. 創新思維（利用燈泡溫度）2. 操作步驟（打開1號一段時間，關閉後打開2號，進入）3. 判斷邏輯（亮=2號，熱=1號，冷=3號）4. 表達清晰',
    tags: ['邏輯推理', '解難題'],
  },
  {
    category: 'logic-thinking',
    difficulty: 'hard',
    question_text: '一個島上住著說真話的人和說假話的人，你遇到兩個島民，需要用一個問題判斷哪條路通往安全地方。你會問什麼？',
    reference_answer: '參考要點：1. 深度邏輯推理 2. 設計問題（問其中一人：另一人會說哪條路安全？）3. 分析兩種情況下的答案 4. 得出結論（走相反方向）5. 清晰表達推理過程',
    tags: ['邏輯推理', '批判性思維'],
    school_code: 'QC',
  },

  // 時事常識 (Current Affairs)
  {
    category: 'current-affairs',
    difficulty: 'easy',
    question_text: '你知道最近香港有什麼重要的新聞嗎？請簡單介紹。',
    reference_answer: '參考要點：1. 關注時事的習慣 2. 新聞的基本事實（人物、時間、地點、事件）3. 個人看法或感受 4. 表達清晰',
    tags: ['香港新聞', '時事關注'],
  },
  {
    category: 'current-affairs',
    difficulty: 'medium',
    question_text: '你如何看待環境保護和經濟發展之間的關係？',
    reference_answer: '參考要點：1. 理解兩者關係（矛盾與平衡）2. 具體例子 3. 多角度思考 4. 提出平衡建議 5. 表達要有深度和邏輯',
    tags: ['環境保護', '社會議題'],
  },
  {
    category: 'current-affairs',
    difficulty: 'hard',
    question_text: '人工智能的發展對未來社會有什麼影響？請談談你的看法。',
    reference_answer: '參考要點：1. 了解AI基本概念 2. 正面影響（效率、創新）3. 負面影響（就業、隱私）4. 平衡觀點 5. 個人思考和建議 6. 邏輯清晰，表達有深度',
    tags: ['科技發展', '未來趨勢'],
    school_code: 'SPCC',
  },

  // 科學常識 (Science Knowledge)
  {
    category: 'science-knowledge',
    difficulty: 'easy',
    question_text: '為什麼天空是藍色的？',
    reference_answer: '參考要點：1. 光的散射原理 2. 藍光波長較短，更容易散射 3. 用簡單語言解釋科學原理 4. 可以聯繫生活觀察（日出日落時天空顏色變化）',
    tags: ['光學', '自然現象'],
  },
  {
    category: 'science-knowledge',
    difficulty: 'medium',
    question_text: '請解釋溫室效應是如何產生的，以及它對地球的影響。',
    reference_answer: '參考要點：1. 溫室氣體的作用 2. 能量吸收和輻射過程 3. 全球變暖的影響 4. 人類活動的關係 5. 減緩措施 6. 表達要科學準確',
    tags: ['環境科學', 'STEM'],
    school_code: 'SPCC',
  },
  {
    category: 'science-knowledge',
    difficulty: 'hard',
    question_text: 'If you were to design a sustainable city, what scientific principles would you apply?',
    reference_answer: '參考要點：1. 可再生能源（太陽能、風能）2. 水循環係統 3. 廢物處理和回收 4. 綠色建築 5. 交通規劃 6. 生態平衡 7. 創新思維和係統性規劃',
    tags: ['可持續發展', 'STEM', '設計思維'],
    school_code: 'SPCC',
  },

  // 個人成長 (Personal Growth)
  {
    category: 'personal-growth',
    difficulty: 'easy',
    question_text: '請分享一次你克服困難的經歷。',
    reference_answer: '參考要點：1. 具體困難情況 2. 遇到的挑戰 3. 採取的行動 4. 結果和感受 5. 從中學到的經驗 6. 表達要真誠',
    tags: ['個人經歷', '成長反思'],
  },
  {
    category: 'personal-growth',
    difficulty: 'medium',
    question_text: '你未來的理想是什麼？你打算如何實現它？',
    reference_answer: '參考要點：1. 明確的目標 2. 目標的原因和意義 3. 具體的行動計劃 4. 需要培養的能力 5. 可能的挑戰和應對 6. 表達要有規劃性',
    tags: ['志向抱負', '職業規劃'],
  },
  {
    category: 'personal-growth',
    difficulty: 'hard',
    question_text: '你認為失敗是什麼？請結合自己的經歷談談對失敗的看法。',
    reference_answer: '參考要點：1. 對失敗的定義和理解 2. 具體失敗經歷 3. 情緒和反應 4. 反思和成長 5. 對失敗的重新認識 6. 成熟的心態和深度思考',
    tags: ['價值觀', '自我認知'],
  },

  // 小組討論 (Group Discussion)
  {
    category: 'group-discussion',
    difficulty: 'easy',
    question_text: '小組討論：學校應該允許學生帶手機嗎？',
    reference_answer: '參考要點：1. 清楚表達觀點 2. 提供理由和例子 3. 傾聽他人意見 4. 尊重不同觀點 5. 參與討論但不主導 6. 尋求共識',
    tags: ['學校政策', '辯論技巧'],
  },
  {
    category: 'group-discussion',
    difficulty: 'medium',
    question_text: '小組任務：策劃一個環保主題的校園活動。',
    reference_answer: '參考要點：1. 主動提出想法 2. 分工合作 3. 時間管理 4. 資源分配 5. 傾聽和整合他人建議 6. 領導或協調能力 7. 最終方案的完整性',
    tags: ['合作能力', '項目規劃'],
    school_code: 'LSC',
  },
  {
    category: 'group-discussion',
    difficulty: 'hard',
    question_text: '小組討論：如果你是校長，你會如何改善學校？（每人提出一個建議，小組需要選出最重要的三個）',
    reference_answer: '參考要點：1. 創新建議 2. 邏輯論證 3. 傾聽和評估他人建議 4. 協商和妥協 5. 尋求共識的能力 6. 最終決策的合理性 7. 領導力和影響力',
    tags: ['領導力', '決策能力'],
    school_code: 'LSC',
  },
];

/**
 * 導入題庫種子數據
 */
export async function seedQuestions(): Promise<void> {
  console.log('🌱 導入題庫種子數據...');

  try {
    // 檢查是否已有種子數據
    const { queryOne } = await import('../index.js');
    const existing = await queryOne('SELECT COUNT(*) as count FROM questions WHERE source = ?', ['seed']);
    
    if (existing && existing.count > 0) {
      console.log(`  ⏭️  已存在 ${existing.count} 條種子數據，跳過導入`);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const q of seedQuestionsData) {
      try {
        await insert(
          `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [q.category, q.question_text, q.difficulty, q.reference_answer, JSON.stringify(q.tags), q.school_code || null, 'seed']
        );
        successCount++;
      } catch (error) {
        console.error(`  ❌ 導入失敗: ${q.question_text.substring(0, 50)}...`, error);
        errorCount++;
      }
    }

    console.log(`✅ 題庫種子數據導入完成：成功 ${successCount} 條，失敗 ${errorCount} 條`);
  } catch (error) {
    console.error('❌ 題庫種子數據導入失敗:', error);
    throw error;
  }
}
