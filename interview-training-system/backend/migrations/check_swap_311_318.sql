-- 检查 311 和 318 的数据是否弄反了
-- 查看 session 16 中这两个题目的记录

-- 1. 查看 session 16 的所有记录
SELECT 
  qr.id,
  qr.session_id,
  qr.question_id,
  LEFT(qr.question_text, 100) as question_text,
  LEFT(qr.answer_text, 50) as answer_text,
  qr.created_at
FROM qa_records qr
WHERE qr.session_id = 16
ORDER BY qr.question_id, qr.created_at;

-- 2. 查看题目 311 的实际内容
SELECT 
  id,
  LEFT(question_text, 100) as question_text
FROM questions
WHERE id = 311;

-- 3. 查看题目 318 的实际内容
SELECT 
  id,
  LEFT(question_text, 100) as question_text
FROM questions
WHERE id = 318;

-- 4. 检查是否有 question_id 和 question_text 不匹配的情况
SELECT 
  qr.id,
  qr.question_id,
  LEFT(qr.question_text, 80) as qa_record_question_text,
  q.id as question_table_id,
  LEFT(q.question_text, 80) as question_table_text,
  CASE 
    WHEN qr.question_text LIKE CONCAT('%', LEFT(q.question_text, 20), '%') THEN '匹配'
    ELSE '不匹配'
  END as text_match
FROM qa_records qr
LEFT JOIN questions q ON qr.question_id = q.id
WHERE qr.session_id = 16 
  AND qr.question_id IN (311, 318)
ORDER BY qr.question_id;
