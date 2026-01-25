# 测试规范文档

## 概述

本文档定义了项目的测试规范，确保代码质量和功能正确性。

## 测试要求

### 测试覆盖率要求

**所有功能变更必须包含测试。**

- **最低覆盖率**：60%
- **关键功能**：80% 以上
  - API 端点
  - 数据库操作
  - 核心业务逻辑

### 测试类型

1. **单元测试**
   - 测试单个函数或组件
   - 覆盖边界情况和错误处理

2. **集成测试**
   - 测试多个模块的协作
   - 测试 API 端点的完整流程

3. **E2E 测试**
   - 测试完整用户流程
   - 测试关键业务流程

4. **性能测试**
   - 测试 API 响应时间
   - 测试页面加载时间

## 测试检查清单

在提交代码前，请检查以下清单：

### 功能测试

- [ ] 新功能是否正常工作？
- [ ] 边界情况是否处理？
- [ ] 错误情况是否处理？
- [ ] 用户交互是否流畅？

### 回归测试

- [ ] 现有功能是否仍然正常工作？
- [ ] 是否有破坏性变更？
- [ ] 是否影响其他模块？

### 性能测试

- [ ] API 响应时间是否符合要求？
- [ ] 页面加载时间是否符合要求？
- [ ] 是否有性能回归？

## 测试工具

### 前端测试

- **单元测试**：Jest + React Testing Library
- **E2E 测试**：Playwright 或 Cypress

### 后端测试

- **单元测试**：Jest
- **API 测试**：Supertest
- **数据库测试**：使用测试数据库

## 测试示例

### 前端组件测试

```typescript
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

describe('Dashboard', () => {
  it('应该显示加载状态', () => {
    render(<Dashboard />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('应该显示任务列表', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('今日任务')).toBeInTheDocument();
    });
  });
});
```

### 后端 API 测试

```typescript
import request from 'supertest';
import app from '../app';

describe('GET /api/schools', () => {
  it('应该返回学校列表', async () => {
    const response = await request(app)
      .get('/api/schools')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

## 性能测试

### API 性能测试

```typescript
describe('API 性能', () => {
  it('学校列表 API 应该在 500ms 内响应', async () => {
    const startTime = Date.now();
    await request(app).get('/api/schools');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(500);
  });
});
```

### 前端性能测试

```typescript
describe('页面加载性能', () => {
  it('Dashboard 页面应该在 1 秒内加载', async () => {
    const startTime = performance.now();
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('仪表盘')).toBeInTheDocument();
    });
    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(1000);
  });
});
```

## 测试最佳实践

1. **测试命名**
   - 使用描述性的测试名称
   - 使用 "应该" 或 "should" 描述预期行为

2. **测试组织**
   - 按功能模块组织测试
   - 使用 describe 块组织相关测试

3. **测试数据**
   - 使用测试数据库
   - 使用 mock 数据避免依赖外部服务

4. **测试清理**
   - 每个测试后清理测试数据
   - 避免测试之间的依赖

## 持续集成

### CI/CD 流程

1. **代码提交**：触发 CI 流程
2. **运行测试**：执行所有测试
3. **检查覆盖率**：确保覆盖率达标
4. **性能测试**：执行性能测试
5. **部署**：测试通过后部署

### 测试报告

- 测试结果：显示通过/失败的测试
- 覆盖率报告：显示代码覆盖率
- 性能报告：显示性能测试结果

## 参考资源

- [Jest 文档](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Playwright 文档](https://playwright.dev/)
