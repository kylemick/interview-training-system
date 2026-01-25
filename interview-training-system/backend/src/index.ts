import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './middleware/logger.js'
import { initDatabase, closePool } from './db/index.js'
import schoolRoutes from './routes/schools.js'
import aiRoutes from './routes/ai.js'

// 加载环境变量
dotenv.config()

// 初始化数据库（异步）
initDatabase().catch(console.error)

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())
app.use(logger)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 路由
app.use('/api/schools', schoolRoutes)
app.use('/api/ai', aiRoutes)
import questionRoutes from './routes/questions.js'
app.use('/api/questions', questionRoutes)
import dataRoutes from './routes/data.js'
app.use('/api/data', dataRoutes)
import planRoutes from './routes/plans.js'
app.use('/api/plans', planRoutes)
import sessionRoutes from './routes/sessions.js'
app.use('/api/sessions', sessionRoutes)
import feedbackRoutes from './routes/feedback.js'
app.use('/api/feedback', feedbackRoutes)
import settingsRoutes from './routes/settings.js'
app.use('/api/settings', settingsRoutes)
import weaknessesRoutes from './routes/weaknesses.js'
app.use('/api/weaknesses', weaknessesRoutes)
import learningMaterialsRoutes from './routes/learningMaterials.js'
app.use('/api/learning-materials', learningMaterialsRoutes)
// Progress API: 前端Progress页面直接使用sessions、weaknesses等API获取数据，无需单独的progress路由

// 错误处理
app.use(errorHandler)

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 Health check: http://localhost:${PORT}/health`)
})

// 优雅关闭：确保热加载时正确清理资源
const gracefulShutdown = async (signal: string) => {
  console.log(`\n收到 ${signal} 信号，正在优雅关闭服务器...`)
  
  // 关闭HTTP服务器
  server.close(async () => {
    console.log('✅ HTTP 服务器已关闭')
    
    // 关闭数据库连接池
    try {
      await closePool()
    } catch (error) {
      console.error('关闭数据库连接池时出错:', error)
    }
    
    process.exit(0)
  })
  
  // 如果10秒内没有关闭，强制退出
  setTimeout(() => {
    console.error('⚠️  强制退出（超时）')
    process.exit(1)
  }, 10000)
}

// 监听退出信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason)
  gracefulShutdown('unhandledRejection')
})
