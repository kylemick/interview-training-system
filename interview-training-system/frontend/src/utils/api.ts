import axios, { AxiosError, AxiosRequestConfig, CancelTokenSource } from 'axios'
import { message } from 'antd'

// API 基础URL
// 在開發环境中，使用相對路径通過Vite代理访問後端
// 在生产环境中，可以设置 VITE_API_URL 环境变量
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 創建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 優化：從30秒降低到10秒
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求缓存：简单的內存缓存，5分鐘TTL
interface CacheEntry {
  data: any
  timestamp: number
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5分鐘

// 请求去重：相同请求在pending時不重复發送
const pendingRequests = new Map<string, Promise<any>>()

// 请求取消：存储每个请求的取消token
const cancelTokens = new Map<string, CancelTokenSource>()

/**
 * 生成请求的唯一key
 */
function getRequestKey(config: AxiosRequestConfig): string {
  const { method, url, params, data } = config
  const paramsStr = params ? JSON.stringify(params) : ''
  const dataStr = data ? JSON.stringify(data) : ''
  return `${method}:${url}:${paramsStr}:${dataStr}`
}

/**
 * 清除缓存（用于數據变更操作後）
 */
export function clearCache(pattern?: string) {
  if (!pattern) {
    cache.clear()
    return
  }
  // 清除匹配模式的缓存
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 这里可以添加token等认证信息
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    
    // 为每个请求創建取消token
    const source = axios.CancelToken.source()
    config.cancelToken = source.token
    const requestKey = getRequestKey(config)
    cancelTokens.set(requestKey, source)
    
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 缓存GET请求的响应（5分鐘TTL）
    const config = response.config
    if (config.method?.toLowerCase() === 'get') {
      const requestKey = getRequestKey(config)
      // 缓存整个响应數據對象
      cache.set(requestKey, {
        data: response.data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL,
      })
    }
    
    // 清除pending请求
    const requestKey = getRequestKey(config)
    pendingRequests.delete(requestKey)
    cancelTokens.delete(requestKey)
    
    return response
  },
  (error: AxiosError<any>) => {
    // 如果是取消请求，不显示错误
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }
    
    // 清除pending请求
    if (error.config) {
      const requestKey = getRequestKey(error.config)
      pendingRequests.delete(requestKey)
      cancelTokens.delete(requestKey)
    }
    
    // 統一错误处理
    const errorMessage = error.response?.data?.message || error.message || '请求失敗'
    
    if (error.response?.status === 401) {
      message.error('未授权，请重新登錄')
      // 这里可以跳转到登錄页
    } else if (error.response?.status === 404) {
      message.error('資源不存在')
    } else if (error.response?.status && error.response.status >= 500) {
      message.error('服務器错误，请稍後重試')
    } else {
      message.error(errorMessage)
    }
    
    return Promise.reject(error)
  }
)

/**
 * 增强的请求函數：支持缓存、去重、取消和重試
 * 
 * 返回格式：{ success: true, data: ... } 或 { success: false, message: ... }
 * 
 * @param config 请求配置
 * @param retries 重試次數（默认 1 次）
 */
async function enhancedRequest<T = any>(
  config: AxiosRequestConfig, 
  retries = 1
): Promise<{ success: boolean; data: T; [key: string]: any }> {
  const requestKey = getRequestKey(config)
  
  // 1. 检查缓存（仅GET请求）
  if (config.method?.toLowerCase() === 'get') {
    const cached = cache.get(requestKey)
    if (cached && cached.expiresAt > Date.now()) {
      // 缓存中存储的是 response.data，即 { success: true, data: ... }
      return cached.data
    }
  }
  
  // 2. 检查是否有pending的相同请求
  const pending = pendingRequests.get(requestKey)
  if (pending) {
    return pending as Promise<{ success: boolean; data: T; [key: string]: any }>
  }
  
  // 3. 創建新请求（带重試机制）
  const requestPromise = (async () => {
    let lastError: any
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await apiClient.request(config)
        // response.data 已经是 { success: true, data: ... } 格式
        return response.data
      } catch (error: any) {
        lastError = error
        
        // 如果是取消请求，直接抛出
        if (axios.isCancel(error)) {
          throw error
        }
        
        // 如果是客户端错误（4xx），不重試
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error
        }
        
        // 如果是最後一次尝試，抛出错误
        if (attempt === retries) {
          break
        }
        
        // 等待一段時間後重試（指數退避）
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    // 所有重試都失敗，抛出最後一个错误
    pendingRequests.delete(requestKey)
    throw lastError
  })()
  
  pendingRequests.set(requestKey, requestPromise)
  return requestPromise
}

/**
 * 取消所有pending请求（用于組件卸载時）
 */
export function cancelAllPendingRequests() {
  for (const [key, source] of cancelTokens.entries()) {
    source.cancel('組件卸载，取消请求')
    cancelTokens.delete(key)
    pendingRequests.delete(key)
  }
}

// API接口定义
export const api = {
  // 學校相關
  schools: {
    list: () => enhancedRequest({ method: 'get', url: '/schools' }),
    get: (id: string) => enhancedRequest({ method: 'get', url: `/schools/${id}` }),
    create: (data: any) => {
      clearCache('schools')
      return apiClient.post('/schools', data).then(res => res.data)
    },
    update: (code: string, data: any) => {
      clearCache('schools')
      return apiClient.put(`/schools/${code}`, data).then(res => res.data)
    },
    delete: (code: string) => {
      clearCache('schools')
      return apiClient.delete(`/schools/${code}`).then(res => res.data)
    },
  },

  // 題庫相關
  questions: {
    list: (params?: any) => enhancedRequest({ method: 'get', url: '/questions', params }),
    get: (id: string) => enhancedRequest({ method: 'get', url: `/questions/${id}` }),
    create: (data: any) => {
      clearCache('questions') // 清除相關缓存
      return apiClient.post('/questions', data).then(res => res.data)
    },
    update: (id: string, data: any) => {
      clearCache('questions') // 清除相關缓存
      return apiClient.put(`/questions/${id}`, data).then(res => res.data)
    },
    delete: (id: string) => {
      clearCache('questions') // 清除相關缓存
      return apiClient.delete(`/questions/${id}`).then(res => res.data)
    },
    stats: () => enhancedRequest({ method: 'get', url: '/questions/stats/summary' }),
  },

  // 訓練計劃相關
  plans: {
    list: (params?: any) => enhancedRequest({ method: 'get', url: '/plans', params }),
    get: (id: string) => enhancedRequest({ method: 'get', url: `/plans/${id}` }),
    create: (data: any) => {
      clearCache('plans')
      // 創建訓練計劃會調用AI生成，不设置超時
      return apiClient.post('/plans', data, { timeout: 0 }).then(res => res.data)
    },
    updateStatus: (id: string, status: string) => {
      clearCache('plans')
      return apiClient.patch(`/plans/${id}/status`, { status }).then(res => res.data)
    },
    delete: (id: string) => {
      clearCache('plans')
      return apiClient.delete(`/plans/${id}`).then(res => res.data)
    },
    todayTasks: () => enhancedRequest({ method: 'get', url: '/plans/today/tasks' }),
    pendingTasks: (params?: { date?: string; status?: string }) => 
      enhancedRequest({ method: 'get', url: '/plans/pending-tasks', params }),
    // 啟動任務練習可能會觸發 AI 生成題目，不設置超時
    startTaskPractice: (taskId: string, data?: any) => 
      apiClient.post(`/plans/tasks/${taskId}/start-practice`, data, { timeout: 0 }).then(res => res.data),
    completeTask: (taskId: string) => 
      apiClient.patch(`/plans/tasks/${taskId}/complete`).then(res => res.data),
    skipTask: (taskId: string) => 
      apiClient.patch(`/plans/tasks/${taskId}/skip`).then(res => res.data),
    createFromWeakness: (data: any) => {
      clearCache('plans')
      return apiClient.post('/plans/from-weakness', data, { timeout: 0 }).then(res => res.data)
    },
  },

  // 練習會話相關
  sessions: {
    // 創建會話可能會觸發 AI 生成題目，不設置超時
    create: (data: any) => apiClient.post('/sessions', data, { timeout: 0 }).then(res => res.data),
    createSchoolRoundMock: (data: any) => 
      apiClient.post('/sessions/school-round-mock', data, { timeout: 0 }).then(res => res.data),
    get: (id: string) => enhancedRequest({ method: 'get', url: `/sessions/${id}` }),
    recent: (limit = 10) => 
      enhancedRequest({ method: 'get', url: '/sessions/recent/list', params: { limit } }),
    submitAnswer: (sessionId: string, data: any) => 
      apiClient.post(`/sessions/${sessionId}/answer`, data).then(res => res.data),
    complete: (sessionId: string) => {
      clearCache('sessions')
      return apiClient.patch(`/sessions/${sessionId}/complete`).then(res => res.data)
    },
    delete: (sessionId: string) => {
      clearCache('sessions')
      return apiClient.delete(`/sessions/${sessionId}`).then(res => res.data)
    },
  },

  // 反馈相關
  feedback: {
    generate: (data: any) => apiClient.post('/feedback/generate', data, { timeout: 0 }).then(res => res.data),
    list: (sessionId: string) => 
      enhancedRequest({ method: 'get', url: `/feedback/session/${sessionId}` }),
    batchGenerate: (sessionId: string) => 
      apiClient.post('/feedback/batch', { session_id: sessionId }, { timeout: 0 }).then(res => res.data),
    deleteRecord: (recordId: string) => {
      clearCache('feedback')
      return apiClient.delete(`/feedback/record/${recordId}`).then(res => res.data)
    },
    deleteSession: (sessionId: string) => {
      clearCache('feedback')
      return apiClient.delete(`/feedback/session/${sessionId}`).then(res => res.data)
    },
  },

  // AI服務相關（不设置超時，允许長時間处理）
  ai: {
    generateQuestions: (data: any) => {
      clearCache('questions')
      return apiClient.post('/ai/generate-questions', data, { timeout: 0 }).then(res => res.data)
    },
    generatePlan: (data: any) => {
      clearCache('plans')
      return apiClient.post('/ai/generate-plan', data, { timeout: 0 }).then(res => res.data)
    },
    generateSchool: (data: any) => {
      clearCache('schools')
      return apiClient.post('/ai/generate-school', data, { timeout: 0 }).then(res => res.data)
    },
    extractInterviewMemory: (data: any) => {
      return apiClient.post('/ai/extract-interview-memory', data, { timeout: 0 }).then(res => res.data)
    },
    saveInterviewQuestions: (data: any) => {
      clearCache('questions')
      return apiClient.post('/ai/save-interview-questions', data, { timeout: 0 }).then(res => res.data)
    },
    saveWeaknesses: (data: any) => {
      clearCache('weaknesses')
      return apiClient.post('/ai/save-weaknesses', data, { timeout: 0 }).then(res => res.data)
    },
    testConnection: (data: any) => {
      return apiClient.post('/ai/test-connection', data, { timeout: 0 }).then(res => res.data)
    },
    generateLearningMaterial: (data: { weakness_id: number; material_type?: string }) => {
      clearCache('learning-materials')
      return apiClient.post('/ai/generate-learning-material', data, { timeout: 0 }).then(res => res.data)
    },
  },

  // 數據管理相關
  data: {
    stats: () => enhancedRequest({ method: 'get', url: '/data/stats' }),
    export: (type: string) => 
      enhancedRequest({ method: 'get', url: '/data/export', params: { type } }),
    backup: () => apiClient.post('/data/backup').then(res => res.data),
    restore: (data: any) => apiClient.post('/data/restore', data).then(res => res.data),
    import: (data: any) => {
      clearCache() // 清除所有缓存
      return apiClient.post('/data/import', data).then(res => res.data)
    },
    clear: () => {
      clearCache() // 清除所有缓存
      return apiClient.delete('/data/clear').then(res => res.data)
    },
    cleanup: () => {
      clearCache() // 清除所有缓存
      return apiClient.post('/data/cleanup').then(res => res.data)
    },
    seedSchools: () => {
      clearCache('schools')
      return apiClient.post('/data/seed-schools').then(res => res.data)
    },
    seedQuestions: () => {
      clearCache('questions')
      return apiClient.post('/data/seed-questions').then(res => res.data)
    },
    seedAll: () => {
      clearCache() // 清除所有缓存
      return apiClient.post('/data/seed-all').then(res => res.data)
    },
  },

  // 弱點管理相關
  weaknesses: {
    list: (params?: any) => enhancedRequest({ method: 'get', url: '/weaknesses', params }),
    get: (id: string) => enhancedRequest({ method: 'get', url: `/weaknesses/${id}` }),
    updateStatus: (id: string, status: string) => {
      clearCache('weaknesses')
      return apiClient.patch(`/weaknesses/${id}/status`, { status }).then(res => res.data)
    },
    delete: (id: string) => {
      clearCache('weaknesses')
      return apiClient.delete(`/weaknesses/${id}`).then(res => res.data)
    },
    stats: () => enhancedRequest({ method: 'get', url: '/weaknesses/stats/summary' }),
    trends: (params?: { student_name?: string; days?: number }) => 
      enhancedRequest({ method: 'get', url: '/weaknesses/stats/trends', params }),
    generateQuestions: (data: any) => {
      clearCache('questions')
      return apiClient.post('/ai/generate-questions-from-weaknesses', data, { timeout: 0 }).then(res => res.data)
    },
  },

  // 设置相關
  settings: {
    get: () => enhancedRequest({ method: 'get', url: '/settings' }),
    update: (data: any) => {
      clearCache('settings')
      return apiClient.post('/settings', data).then(res => res.data)
    },
  },

  // 學習素材相關
  learningMaterials: {
    list: (params?: {
      weakness_id?: number;
      category?: string;
      weakness_type?: string;
      material_type?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }) => enhancedRequest({ method: 'get', url: '/learning-materials', params }),
    get: (id: string | number) => enhancedRequest({ method: 'get', url: `/learning-materials/${id}` }),
    create: (data: any) => {
      clearCache('learning-materials')
      return apiClient.post('/learning-materials', data).then(res => res.data)
    },
    update: (id: string | number, data: any) => {
      clearCache('learning-materials')
      return apiClient.put(`/learning-materials/${id}`, data).then(res => res.data)
    },
    delete: (id: string | number) => {
      clearCache('learning-materials')
      return apiClient.delete(`/learning-materials/${id}`).then(res => res.data)
    },
    getByWeakness: (weaknessId: string | number) => 
      enhancedRequest({ method: 'get', url: `/learning-materials/by-weakness/${weaknessId}` }),
    incrementUsage: (id: string | number) => 
      apiClient.post(`/learning-materials/${id}/increment-usage`).then(res => res.data),
  },

}

export default apiClient
