import axios, { AxiosInstance } from 'axios'
import { AppError } from '../middleware/errorHandler.js'

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DeepSeekResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class DeepSeekClient {
  private client: AxiosInstance
  private apiKey: string

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('⚠️  DEEPSEEK_API_KEY not configured')
    }

    const baseURL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1'
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      timeout: 60000, // 60秒超时
    })
  }

  /**
   * 调用DeepSeek Chat API
   */
  async chat(messages: DeepSeekMessage[], options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }): Promise<string> {
    if (!this.apiKey) {
      throw new AppError(500, 'DeepSeek API key not configured', 'API_KEY_MISSING')
    }

    try {
      const response = await this.client.post<DeepSeekResponse>('/chat/completions', {
        model: options?.model || 'deepseek-chat',
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
      })

      const content = response.data.choices[0]?.message?.content

      if (!content) {
        throw new AppError(500, 'No response from DeepSeek API', 'API_NO_RESPONSE')
      }

      console.log(`✅ DeepSeek API call successful (${response.data.usage.total_tokens} tokens)`)

      return content
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500
        const message = error.response?.data?.error?.message || error.message

        throw new AppError(
          status,
          `DeepSeek API error: ${message}`,
          'DEEPSEEK_API_ERROR'
        )
      }

      throw error
    }
  }

  /**
   * 测试API连接
   */
  async test(): Promise<boolean> {
    try {
      await this.chat([
        { role: 'user', content: 'Hello, please respond with "OK"' }
      ])
      return true
    } catch (error) {
      console.error('DeepSeek API test failed:', error)
      return false
    }
  }
}

export const deepseekClient = new DeepSeekClient()
