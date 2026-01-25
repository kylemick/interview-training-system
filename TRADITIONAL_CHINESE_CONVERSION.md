# 繁體中文轉換說明

## 已完成的工作

1. ✅ 創建了 OpenSpec 提案：`openspec/changes/enforce-traditional-chinese/`
2. ✅ 更新了項目文檔，添加了繁體中文規範（第12條）
3. ✅ 創建了批量轉換腳本：`convert_to_traditional.py`

## 轉換腳本使用說明

由於項目文件數量較多，建議使用提供的 Python 腳本進行批量轉換。

### 安裝依賴

```bash
# 方法1：使用 pip（推薦）
pip3 install opencc-python-reimplemented

# 方法2：如果系統限制，使用 --user
pip3 install --user opencc-python-reimplemented

# 方法3：使用虛擬環境
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install opencc-python-reimplemented
```

### 運行轉換腳本

```bash
# 轉換整個項目
python3 convert_to_traditional.py .

# 轉換 openspec 目錄
python3 convert_to_traditional.py openspec/

# 轉換 interview-training-system 目錄
python3 convert_to_traditional.py interview-training-system/
```

### 腳本功能

- 自動識別需要轉換的文件類型（.md, .ts, .tsx, .js, .jsx, .json, .sql, .txt）
- 跳過 node_modules、.git 等不需要轉換的目錄
- 使用香港繁體中文標準（s2hk）進行轉換
- 顯示轉換進度和結果

## 手動轉換清單

如果無法使用腳本，需要手動轉換以下關鍵文件：

### 優先級1：核心文檔
- [ ] `openspec/project.md` - 項目主文檔（部分已轉換）
- [ ] `openspec/AGENTS.md` - AI助手指南
- [ ] `README.md` - 項目說明
- [ ] `openspec/specs/documentation/spec.md` - 文檔規範

### 優先級2：OpenSpec 變更文檔
- [ ] `openspec/changes/` 目錄下所有 .md 文件

### 優先級3：代碼文件
- [ ] `interview-training-system/frontend/src/` 下所有 .tsx, .ts 文件
- [ ] `interview-training-system/backend/src/` 下所有 .ts 文件

### 優先級4：其他文檔
- [ ] `interview-training-system/docs/` 目錄下所有文檔
- [ ] `interview-training-system/` 目錄下的 README 和說明文檔

## 注意事項

1. **英文專項例外**：`english-oral` 類別的 AI 生成內容必須使用英文，不要轉換
2. **代碼標識符**：變量名、函數名、類名等技術標識符保持英文，不轉換
3. **API 路徑**：API 接口路徑和參數名保持英文，不轉換
4. **備份**：轉換前建議先提交當前更改或創建備份

## 驗證轉換結果

轉換完成後，請檢查：

1. 運行 `openspec validate enforce-traditional-chinese --strict --no-interactive` 驗證提案
2. 檢查關鍵文件中的簡體中文是否已全部轉換
3. 確認代碼功能正常（運行測試）
4. 檢查用戶界面顯示是否正常

## 後續工作

轉換完成後，需要：

1. 更新所有新代碼和文檔，確保使用繁體中文
2. 在代碼審查中檢查語言規範
3. 在 CI/CD 流程中添加語言檢查（可選）
