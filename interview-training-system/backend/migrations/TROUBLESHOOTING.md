# 數據庫遷移故障排除指南

## 問題：EPERM 錯誤

如果遇到 `EPERM` 錯誤，可能是以下原因：

### 1. MySQL Socket 文件權限問題

在 macOS 上，MySQL socket 文件可能位於：
- `/tmp/mysql.sock`
- `/var/mysql/mysql.sock`
- `~/mysql.sock`

**解決方法：**
```bash
# 檢查 socket 文件位置
mysql_config --socket

# 如果使用 Homebrew MySQL
ls -la /tmp/mysql.sock

# 確保有讀寫權限
chmod 666 /tmp/mysql.sock  # 如果文件存在
```

### 2. 使用 TCP 連接替代 Socket

在 `.env` 文件中明確指定使用 TCP 連接：
```env
DB_HOST=127.0.0.1  # 使用 IP 而不是 localhost
DB_PORT=3306
```

### 3. 檢查 MySQL 服務狀態

```bash
# Homebrew MySQL
brew services list | grep mysql
brew services restart mysql

# 或手動啟動
mysql.server start
```

### 4. 測試數據庫連接

使用 MySQL 命令行工具測試：
```bash
mysql -h localhost -u root -p interview_training
```

### 5. 檢查防火牆設置

確保沒有防火牆阻止 MySQL 連接。

### 6. 替代方案：使用 SQL 腳本

如果 Node.js 連接有問題，可以：
1. 導出數據庫內容
2. 使用文本編輯器批量替換簡體中文為繁體中文
3. 重新導入數據庫

### 7. 手動執行遷移

如果自動遷移失敗，可以手動執行 SQL：

```sql
-- 更新 school_profiles 表
UPDATE school_profiles 
SET name_zh = REPLACE(REPLACE(name_zh, '学', '學'), '校', '校'),
    notes = REPLACE(REPLACE(notes, '学', '學'), '校', '校');

-- 更新 questions 表（排除英文專項）
UPDATE questions 
SET question_text = REPLACE(question_text, '学', '學'),
    reference_answer = REPLACE(reference_answer, '学', '學')
WHERE category != 'english-oral' AND category != 'english-reading';
```

**注意：** 手動 SQL 只能處理簡單的字符替換，複雜的轉換建議使用專業工具。

## 聯繫支持

如果問題持續，請提供：
1. 錯誤完整日誌
2. MySQL 版本：`mysql --version`
3. Node.js 版本：`node --version`
4. 操作系統版本
