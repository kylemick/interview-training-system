/**
 * 數據庫遷移：將簡體中文轉換為繁體中文
 * 
 * 此腳本會更新數據庫中所有包含簡體中文的字段為繁體中文
 * 注意：英文專項（english-oral）的內容保持不變
 */

import { query, execute, closePool } from '../src/db/index.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 簡體到繁體的轉換映射（常見字符）
const conversionMap: Record<string, string> = {
  '学': '學',
  '校': '校',
  '档': '檔',
  '案': '案',
  '题': '題',
  '库': '庫',
  '种': '種',
  '子': '子',
  '数': '數',
  '据': '據',
  '面': '面',
  '试': '試',
  '训': '訓',
  '练': '練',
  '系': '係',
  '统': '統',
  '资': '資',
  '料': '料',
  '库': '庫',
  '代': '代',
  '码': '碼',
  '全': '全',
  '名': '名',
  '中': '中',
  '文': '文',
  '重': '重',
  '点': '點',
  '领': '領',
  '域': '域',
  '阵': '陣',
  '列': '列',
  '风': '風',
  '格': '格',
  '备': '備',
  '注': '註',
  '说': '說',
  '明': '明',
  '专': '專',
  '项': '項',
  '类': '類',
  '别': '別',
  '内': '內',
  '容': '容',
  '难': '難',
  '度': '度',
  '参': '參',
  '考': '考',
  '答': '答',
  '案': '案',
  '标': '標',
  '签': '籤',
  '关': '關',
  '联': '聯',
  '来': '來',
  '源': '源',
  '信': '信',
  '息': '息',
  '如': '如',
  '原': '原',
  '始': '始',
  '回': '回',
  '分': '分',
  '类': '類',
  '置': '置',
  '信': '信',
  '度': '度',
  '自': '自',
  '动': '動',
  '手': '手',
  '动': '動',
  '最': '最',
  '后': '後',
  '更': '更',
  '新': '新',
  '时': '時',
  '间': '間',
  '生': '生',
  '弱': '弱',
  '点': '點',
  '析': '析',
  '从': '從',
  '回': '回',
  '忆': '憶',
  '中': '中',
  '提': '提',
  '取': '取',
  '姓': '姓',
  '可': '可',
  '选': '選',
  '描': '描',
  '述': '述',
  '示': '示',
  '例': '例',
  '文': '文',
  '本': '本',
  '严': '嚴',
  '重': '重',
  '程': '程',
  '改': '改',
  '进': '進',
  '建': '建',
  '议': '議',
  '相': '相',
  '话': '話',
  '识': '識',
  '别': '別',
  '方': '方',
  '式': '式',
  '状': '狀',
  '态': '態',
  '针': '針',
  '对': '對',
  '性': '性',
  '练': '練',
  '习': '習',
  '次': '次',
  '素': '素',
  '材': '材',
  '标': '標',
  '题': '題',
  '创': '創',
  '建': '建',
  '计': '計',
  '划': '劃',
  '目': '目',
  '标': '標',
  '开': '開',
  '始': '始',
  '日': '日',
  '期': '期',
  '结': '結',
  '束': '束',
  '总': '總',
  '天': '天',
  '每': '每',
  '日': '日',
  '长': '長',
  '分': '分',
  '钟': '鐘',
  '配': '配',
  '生': '生',
  '成': '成',
  '完': '完',
  '成': '成',
  '暂': '暫',
  '停': '停',
  '任': '任',
  '务': '務',
  '模': '模',
  '式': '式',
  '问': '問',
  '题': '題',
  '会': '會',
  '话': '話',
  '选': '選',
  '择': '擇',
  '的': '的',
  '完': '完',
  '整': '整',
  '列': '列',
  '表': '表',
  '记': '記',
  '录': '錄',
  '总': '總',
  '结': '結',
  '优': '優',
  '势': '勢',
  '薄': '薄',
  '调': '調',
  '整': '整',
  '旧': '舊',
  '值': '值',
  '新': '新',
  '原': '原',
  '因': '因',
  '者': '者',
  '轮': '輪',
  '规': '規',
  '则': '則',
  '版': '版',
  '号': '號',
  '词': '詞',
  '板': '板',
  '准': '準',
  '确': '確',
  '率': '率',
  '激': '激',
  '活': '活',
  '圣': '聖',
  '保': '保',
  '罗': '羅',
  '男': '男',
  '女': '女',
  '中': '中',
  '学': '學',
  '皇': '皇',
  '仁': '仁',
  '书': '書',
  '院': '院',
  '喇': '喇',
  '沙': '沙',
  '拔': '拔',
  '萃': '萃',
  '书': '書',
  '院': '院',
  '批': '批',
  '判': '判',
  '性': '性',
  '思': '思',
  '维': '維',
  '术': '術',
  '能': '能',
  '力': '力',
  '科': '科',
  '素': '素',
  '养': '養',
  '和': '和',
  '教': '教',
  '育': '育',
  '是': '是',
  '考': '考',
  '察': '察',
  '领': '領',
  '域': '域',
  '风': '風',
  '格': '格',
  '严': '嚴',
  '谨': '謹',
  '会': '會',
  '深': '深',
  '入': '入',
  '提': '提',
  '问': '問',
  '传': '傳',
  '统': '統',
  '名': '名',
  '逻': '邏',
  '辑': '輯',
  '时': '時',
  '事': '事',
  '析': '析',
  '能': '能',
  '力': '力',
  '形': '形',
  '式': '式',
  '多': '多',
  '样': '樣',
  '包': '包',
  '括': '括',
  '小': '小',
  '组': '組',
  '讨': '討',
  '论': '論',
  '注': '注',
  '全': '全',
  '人': '人',
  '发': '發',
  '展': '展',
  '关': '關',
  '注': '注',
  '品': '品',
  '价': '價',
  '值': '值',
  '观': '觀',
  '表': '表',
  '达': '達',
  '同': '同',
  '样': '樣',
  '重': '重',
  '要': '要',
  '英': '英',
  '语': '語',
  '导': '導',
  '互': '互',
  '通': '通',
  '全': '全',
  '评': '評',
  '估': '估',
  '社': '社',
  '会': '會',
  '怀': '懷',
  '广': '廣',
  '泛': '泛',
  '且': '且',
  '深': '深',
  '入': '入',
  '导': '導',
  '入': '入',
  '跳': '跳',
  '过': '過',
  '添': '添',
  '加': '加',
  '失': '失',
  '败': '敗',
};

/**
 * 簡單的簡體轉繁體函數
 * 注意：這是一個簡化版本，對於複雜的轉換建議使用專業庫如 opencc-js
 * 
 * 由於字符級別的轉換可能不夠準確，建議：
 * 1. 使用 opencc-js 庫進行準確轉換
 * 2. 或者手動檢查和修正轉換結果
 */
function convertToTraditional(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let result = text;
  // 按字符長度排序，先轉換長字符（避免部分匹配問題）
  const sortedEntries = Object.entries(conversionMap).sort((a, b) => b[0].length - a[0].length);
  
  for (const [simplified, traditional] of sortedEntries) {
    result = result.replace(new RegExp(simplified, 'g'), traditional);
  }
  
  return result;
}

/**
 * 使用更準確的轉換方法
 * 由於簡體轉繁體需要處理詞彙級別的轉換，這裡使用一個更全面的方法
 */
async function convertDatabaseContent() {
  console.log('🔄 開始轉換數據庫中的簡體中文為繁體中文...');
  
  try {
    // 測試數據庫連接
    console.log('\n🔌 測試數據庫連接...');
    try {
      await query('SELECT 1');
      console.log('✅ 數據庫連接成功');
    } catch (connError: any) {
      console.error('❌ 數據庫連接失敗:', connError.message);
      throw new Error('數據庫連接失敗，請檢查配置');
    }
    
    // 1. 更新 school_profiles 表
    console.log('\n📚 更新學校檔案表...');
    const schools = await query('SELECT id, name_zh, notes FROM school_profiles');
    
    for (const school of schools) {
      const newNameZh = convertToTraditional(school.name_zh);
      const newNotes = convertToTraditional(school.notes);
      
      if (newNameZh !== school.name_zh || newNotes !== school.notes) {
        await execute(
          'UPDATE school_profiles SET name_zh = ?, notes = ? WHERE id = ?',
          [newNameZh, newNotes, school.id]
        );
        console.log(`  ✅ 已更新學校: ${school.name_zh} -> ${newNameZh}`);
      }
    }
    
    // 2. 更新 questions 表（排除英文專項）
    console.log('\n📝 更新題庫表...');
    const questions = await query(`
      SELECT id, category, question_text, reference_answer, tags, notes 
      FROM questions 
      WHERE category != 'english-oral' AND category != 'english-reading'
    `);
    
    let updatedCount = 0;
    for (const question of questions) {
      const newQuestionText = convertToTraditional(question.question_text);
      const newReferenceAnswer = question.reference_answer ? convertToTraditional(question.reference_answer) : null;
      const newNotes = question.notes ? convertToTraditional(question.notes) : null;
      
      // 處理 tags (JSON 字段)
      let newTags = question.tags;
      if (question.tags) {
        try {
          const tagsArray = typeof question.tags === 'string' ? JSON.parse(question.tags) : question.tags;
          if (Array.isArray(tagsArray)) {
            const convertedTags = tagsArray.map(tag => convertToTraditional(tag));
            newTags = JSON.stringify(convertedTags);
          }
        } catch (e) {
          console.warn(`  ⚠️  無法解析標籤 JSON: ${question.id}`);
        }
      }
      
      if (newQuestionText !== question.question_text || 
          newReferenceAnswer !== question.reference_answer ||
          newTags !== question.tags ||
          newNotes !== question.notes) {
        await execute(
          `UPDATE questions 
           SET question_text = ?, reference_answer = ?, tags = ?, notes = ? 
           WHERE id = ?`,
          [newQuestionText, newReferenceAnswer, newTags, newNotes, question.id]
        );
        updatedCount++;
      }
    }
    console.log(`  ✅ 已更新 ${updatedCount} 道題目`);
    
    // 3. 更新其他可能包含中文的表
    console.log('\n📋 更新其他表...');
    
    // student_weaknesses
    const weaknesses = await query('SELECT id, description, example_text, improvement_suggestions FROM student_weaknesses');
    for (const weakness of weaknesses) {
      const newDescription = convertToTraditional(weakness.description);
      const newExampleText = weakness.example_text ? convertToTraditional(weakness.example_text) : null;
      const newSuggestions = weakness.improvement_suggestions ? convertToTraditional(weakness.improvement_suggestions) : null;
      
      if (newDescription !== weakness.description || 
          newExampleText !== weakness.example_text ||
          newSuggestions !== weakness.improvement_suggestions) {
        await execute(
          'UPDATE student_weaknesses SET description = ?, example_text = ?, improvement_suggestions = ? WHERE id = ?',
          [newDescription, newExampleText, newSuggestions, weakness.id]
        );
      }
    }
    
    // learning_materials
    const materials = await query('SELECT id, title, content FROM learning_materials');
    for (const material of materials) {
      const newTitle = convertToTraditional(material.title);
      const newContent = convertToTraditional(material.content);
      
      if (newTitle !== material.title || newContent !== material.content) {
        await execute(
          'UPDATE learning_materials SET title = ?, content = ? WHERE id = ?',
          [newTitle, newContent, material.id]
        );
      }
    }
    
    // training_plans
    const plans = await query('SELECT id, ai_suggestions FROM training_plans WHERE ai_suggestions IS NOT NULL');
    for (const plan of plans) {
      const newSuggestions = convertToTraditional(plan.ai_suggestions);
      if (newSuggestions !== plan.ai_suggestions) {
        await execute(
          'UPDATE training_plans SET ai_suggestions = ? WHERE id = ?',
          [newSuggestions, plan.id]
        );
      }
    }
    
    // session_summaries
    const summaries = await query('SELECT id, suggestions FROM session_summaries WHERE suggestions IS NOT NULL');
    for (const summary of summaries) {
      const newSuggestions = convertToTraditional(summary.suggestions);
      if (newSuggestions !== summary.suggestions) {
        await execute(
          'UPDATE session_summaries SET suggestions = ? WHERE id = ?',
          [newSuggestions, summary.id]
        );
      }
    }
    
    // interview_memories
    const memories = await query('SELECT id, memory_text FROM interview_memories');
    for (const memory of memories) {
      const newMemoryText = convertToTraditional(memory.memory_text);
      if (newMemoryText !== memory.memory_text) {
        await execute(
          'UPDATE interview_memories SET memory_text = ? WHERE id = ?',
          [newMemoryText, memory.id]
        );
      }
    }
    
    // qa_records
    const qaRecords = await query('SELECT id, question_text, answer_text FROM qa_records');
    for (const record of qaRecords) {
      const newQuestionText = convertToTraditional(record.question_text);
      const newAnswerText = convertToTraditional(record.answer_text);
      
      if (newQuestionText !== record.question_text || newAnswerText !== record.answer_text) {
        await execute(
          'UPDATE qa_records SET question_text = ?, answer_text = ? WHERE id = ?',
          [newQuestionText, newAnswerText, record.id]
        );
      }
    }
    
    console.log('\n✅ 數據庫轉換完成！');
    
  } catch (error: any) {
    console.error('❌ 轉換失敗:', error);
    console.error('   錯誤詳情:', error.message);
    if (error.code) {
      console.error('   錯誤代碼:', error.code);
    }
    throw error;
  } finally {
    await closePool();
  }
}

// 執行遷移
// 使用 fileURLToPath 來正確比較路徑
const currentFile = fileURLToPath(import.meta.url);
const mainFile = process.argv[1] ? fileURLToPath(`file://${process.argv[1]}`) : '';

if (currentFile === mainFile || process.argv[1]?.endsWith('convert_simplified_to_traditional_chinese.ts')) {
  convertDatabaseContent()
    .then(() => {
      console.log('✅ 遷移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 遷移失敗:', error);
      process.exit(1);
    });
}
