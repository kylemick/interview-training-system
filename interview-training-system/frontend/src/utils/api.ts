import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { message } from 'antd'

// API 基础URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 这里可以添加token等认证信息
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
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
    return response
  },
  (error: AxiosError<any>) => {
    // 统一错误处理
    const errorMessage = error.response?.data?.message || error.message || '请求失败'
    
    if (error.response?.status === 401) {
      message.error('未授权，请重新登录')
      // 这里可以跳转到登录页
    } else if (error.response?.status === 404) {
      message.error('资源不存在')
    } else if (error.response?.status >= 500) {
      message.error('服务器错误，请稍后重试')
    } else {
      message.error(errorMessage)
    }
    
    return Promise.reject(error)
  }
)

// API接口定义
export const api = {
  // 学校相关
  schools: {
    list: () => apiClient.get('/schools'),
    get: (id: string) => apiClient.get(`/schools/${id}`),
  },

  // 题库相关
  questions: {
    list: (params?: any) => apiClient.get('/questions', { params }),
    get: (id: string) => apiClient.get(`/questions/${id}`),
    create: (data: any) => apiClient.post('/questions', data),
    update: (id: string, data: any) => apiClient.put(`/questions/${id}`, data),
    delete: (id: string) => apiClient.delete(`/questions/${id}`),
    stats: () => apiClient.get('/questions/stats/summary'),
  },

  // 训练计划相关
  plans: {
    list: (params?: any) => apiClient.get('/plans', { params }),
    get: (id: string) => apiClient.get(`/plans/${id}`),
    create: (data: any) => apiClient.post('/plans', data),
    updateStatus: (id: string, status: string) => 
      apiClient.patch(`/plans/${id}/status`, { status }),
    delete: (id: string) => apiClient.delete(`/plans/${id}`),
    todayTasks: () => apiClient.get('/plans/today/tasks'),
    completeTask: (taskId: string) => 
      apiClient.patch(`/plans/tasks/${taskId}/complete`),
  },

  // 练习会话相关
  sessions: {
    create: (data: any) => apiClient.post('/sessions', data),
    get: (id: string) => apiClient.get(`/sessions/${id}`),
    recent: (limit = 10) => 
      apiClient.get('/sessions/recent/list', { params: { limit } }),
    submitAnswer: (sessionId: string, data: any) => 
      apiClient.post(`/sessions/${sessionId}/answer`, data),
    complete: (sessionId: string) => 
      apiClient.patch(`/sessions/${sessionId}/complete`),
    delete: (sessionId: string) => 
      apiClient.delete(`/sessions/${sessionId}`),
  },

  // 反馈相关
  feedback: {
    generate: (data: any) => apiClient.post('/feedback/generate', data),
    list: (sessionId: string) => 
      apiClient.get(`/feedback/session/${sessionId}`),
    batchGenerate: (sessionId: string) => 
      apiClient.post('/feedback/batch', { session_id: sessionId }),
    deleteRecord: (recordId: string) => 
      apiClient.delete(`/feedback/record/${recordId}`),
    deleteSession: (sessionId: string) => 
      apiClient.delete(`/feedback/session/${sessionId}`),
  },

  // AI服务相关
  ai: {
    generateQuestions: (data: any) => 
      apiClient.post('/ai/generate-questions', data),
    generatePlan: (data: any) => 
      apiClient.post('/ai/generate-plan', data),
  },

  // 数据管理相关
  data: {
    export: (type: string) => 
      apiClient.get('/data/export', { params: { type } }),
    backup: () => apiClient.post('/data/backup'),
    restore: (data: any) => apiClient.post('/data/restore', data),
  },
}

export default apiClient
