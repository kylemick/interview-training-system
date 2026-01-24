import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './middleware/logger.js'
import { initDatabase } from './db/index.js'
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
app.use('/api/questions', (req, res) => res.json({ message: 'Questions API - TODO' }))
app.use('/api/plans', (req, res) => res.json({ message: 'Plans API - TODO' }))
app.use('/api/sessions', (req, res) => res.json({ message: 'Sessions API - TODO' }))
app.use('/api/feedback', (req, res) => res.json({ message: 'Feedback API - TODO' }))
app.use('/api/progress', (req, res) => res.json({ message: 'Progress API - TODO' }))

// 错误处理
app.use(errorHandler)

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📝 Health check: http://localhost:${PORT}/health`)
})
