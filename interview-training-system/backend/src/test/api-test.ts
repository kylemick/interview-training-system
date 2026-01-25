import axios from 'axios'

const BASE_URL = 'http://127.0.0.1:3001'

async function testBackend() {
  console.log('🧪 开始测试后端API...\n')

  try {
    // 1. 健康检查
    console.log('1️⃣  测试健康检查...')
    const healthResponse = await axios.get(`${BASE_URL}/health`)
    console.log('✅ 健康检查通过:', healthResponse.data)
    console.log('')

    // 2. 测试各个API端点
    const endpoints = [
      '/api/schools',
      '/api/questions',
      '/api/plans',
      '/api/sessions',
      '/api/feedback',
      '/api/progress',
    ]

    for (const endpoint of endpoints) {
      console.log(`2️⃣  测试端点: ${endpoint}`)
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`)
        console.log(`✅ ${endpoint} 响应:`, response.data)
      } catch (error: any) {
        if (error.response) {
          console.log(`⚠️  ${endpoint} 返回:`, error.response.data)
        } else {
          console.log(`❌ ${endpoint} 错误:`, error.message)
        }
      }
      console.log('')
    }

    console.log('✅ 后端API测试完成！')
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('\n提示: 请确保后端服务已启动 (npm run dev)')
    }
  }
}

// 运行测试
testBackend()
