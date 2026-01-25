# 升中面試訓練係統 - 開發者文檔

## 開發指南

### 前置要求

- Node.js >= 18
- npm >= 9

### 环境配置

1. **DeepSeek API**
   - 申请API Key: https://platform.deepseek.com
   - 配置到 `.env` 文件

2. **數據庫**
   - MySQL 8.0+
   - 使用 `setup.sh` 自動安装和配置
   - 或手動參考 `docs/MYSQL_SETUP.md`

### API文檔

#### 基础URL
- 開發：`http://localhost:3001/api`

#### 认证
目前MVP阶段不需要认证，未來版本會添加。

#### 错误响应格式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

### 數據庫Schema

參见 `backend/src/db/schema.sql`

### 代碼規范

- TypeScript嚴格模式
- ESLint + Prettier自動格式化
- 提交前运行lint和测試

### 测試

```bash
# 运行所有测試
npm test

# 运行特定测試
npm test -- questions.test.ts
```

## 贡献指南

1. Fork項目
2. 創建功能分支
3. 提交Pull Request

## 問題反馈

请在GitHub Issues中提出問題或建議。
