# 测試規范文檔

## 概述

本文檔定义了項目的测試規范，確保代碼质量和功能正確性。

## 测試要求

### 测試覆盖率要求

**所有功能变更必须包含测試。**

- **最低覆盖率**：60%
- **關键功能**：80% 以上
  - API 端點
  - 數據庫操作
  - 核心业務邏輯

### 测試類型

1. **单元测試**
   - 测試单个函數或組件
   - 覆盖边界情况和错误处理

2. **集成测試**
   - 测試多个模块的协作
   - 测試 API 端點的完整流程

3. **E2E 测試**
   - 测試完整用户流程
   - 测試關键业務流程

4. **性能测試**
   - 测試 API 响应時間
   - 测試页面加载時間

## 测試检查清单

在提交代碼前，请检查以下清单：

### 功能测試

- [ ] 新功能是否正常工作？
- [ ] 边界情况是否处理？
- [ ] 错误情况是否处理？
- [ ] 用户交互是否流畅？

### 回归测試

- [ ] 现有功能是否仍然正常工作？
- [ ] 是否有破坏性变更？
- [ ] 是否影响其他模块？

### 性能测試

- [ ] API 响应時間是否符合要求？
- [ ] 页面加载時間是否符合要求？
- [ ] 是否有性能回归？

## 测試工具

### 前端测試

- **单元测試**：Jest + React Testing Library
- **E2E 测試**：Playwright 或 Cypress

### 後端测試

- **单元测試**：Jest
- **API 测試**：Supertest
- **數據庫测試**：使用测試數據庫

## 测試示例

### 前端組件测試

```typescript
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

describe('Dashboard', () => {
  it('应该显示加载狀態', () => {
    render(<Dashboard />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('应该显示任務列表', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('今日任務')).toBeInTheDocument();
    });
  });
});
```

### 後端 API 测試

```typescript
import request from 'supertest';
import app from '../app';

describe('GET /api/schools', () => {
  it('应该返回學校列表', async () => {
    const response = await request(app)
      .get('/api/schools')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

## 性能测試

### API 性能测試

```typescript
describe('API 性能', () => {
  it('學校列表 API 应该在 500ms 內响应', async () => {
    const startTime = Date.now();
    await request(app).get('/api/schools');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(500);
  });
});
```

### 前端性能测試

```typescript
describe('页面加载性能', () => {
  it('Dashboard 页面应该在 1 秒內加载', async () => {
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

## 测試最佳实践

1. **测試命名**
   - 使用描述性的测試名称
   - 使用 "应该" 或 "should" 描述预期行为

2. **测試組织**
   - 按功能模块組织测試
   - 使用 describe 块組织相關测試

3. **测試數據**
   - 使用测試數據庫
   - 使用 mock 數據避免依赖外部服務

4. **测試清理**
   - 每个测試後清理测試數據
   - 避免测試之間的依赖

## 持续集成

### CI/CD 流程

1. **代碼提交**：触發 CI 流程
2. **运行测試**：执行所有测試
3. **检查覆盖率**：確保覆盖率達標
4. **性能测試**：执行性能测試
5. **部署**：测試通過後部署

### 测試报告

- 测試結果：显示通過/失敗的测試
- 覆盖率报告：显示代碼覆盖率
- 性能报告：显示性能测試結果

## 參考資源

- [Jest 文檔](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Playwright 文檔](https://playwright.dev/)
