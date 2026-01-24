# 升中面试训练系统 - 开发者文档

## 开发指南

### 前置要求

- Node.js >= 18
- npm >= 9

### 环境配置

1. **DeepSeek API**
   - 申请API Key: https://platform.deepseek.com
   - 配置到 `.env` 文件

2. **数据库**
   - MySQL 8.0+
   - 使用 `setup.sh` 自动安装和配置
   - 或手动参考 `docs/MYSQL_SETUP.md`

### API文档

#### 基础URL
- 开发：`http://localhost:3001/api`

#### 认证
目前MVP阶段不需要认证，未来版本会添加。

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

### 数据库Schema

参见 `backend/src/db/schema.sql`

### 代码规范

- TypeScript严格模式
- ESLint + Prettier自动格式化
- 提交前运行lint和测试

### 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- questions.test.ts
```

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交Pull Request

## 问题反馈

请在GitHub Issues中提出问题或建议。
