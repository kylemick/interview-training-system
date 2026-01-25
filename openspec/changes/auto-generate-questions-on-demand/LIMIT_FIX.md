# LIMIT 參數绑定問題修复

## 問題描述

在实现自動生成題目功能時，错误地使用了 `LIMIT ?` 參數绑定，但 MySQL2 驱動不支持在 LIMIT 和 OFFSET 子句中使用參數绑定。

## 修复內容

### 修复的文件

1. **`backend/src/utils/questionHelper.ts`**
   - 修复了 3 处 `LIMIT ?` 的使用
   - 改为直接拼接數字，但確保安全性（使用 `Math.max()` 和 `Math.min()` 限制范围）

2. **`backend/src/routes/learningMaterials.ts`**
   - 修复了 `LIMIT ? OFFSET ?` 的使用
   - 改为直接拼接數字，并限制范围

### 修复方法

**修复前（错误）：**
```typescript
const questions = await query(
  `SELECT * FROM questions WHERE category = ? LIMIT ?`,
  [category, count]
);
```

**修复後（正確）：**
```typescript
const safeCount = Math.max(1, Math.min(parseInt(String(count)) || 1, 1000));
const questions = await query(
  `SELECT * FROM questions WHERE category = ? LIMIT ${safeCount}`,
  [category]
);
```

## 規范更新

已在 `openspec/project.md` 的 MySQL 访問規范中明確添加了 LIMIT/OFFSET 的使用規則，要求：
- 禁止使用參數绑定
- 必须使用安全的數字拼接
- 必须限制范围防止滥用

## 检查清单

在代碼审查時，请检查：
- [ ] 所有 SQL 查询中的 `LIMIT` 和 `OFFSET` 是否直接拼接數字
- [ ] 是否使用了 `Math.max()` 和 `Math.min()` 限制范围
- [ ] 是否禁止了直接拼接用户输入
- [ ] 是否设置了合理的上限
