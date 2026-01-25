import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 插件：处理 vosk-browser 可选依赖
const voskBrowserPlugin = (): Plugin => {
  return {
    name: 'vite-plugin-vosk-browser',
    resolveId(id) {
      // 如果导入 vosk-browser，返回一个虚拟模块
      if (id === 'vosk-browser') {
        return '\0vosk-browser-virtual'
      }
      return null
    },
    load(id) {
      // 返回虚拟模块，在运行时动态加载
      if (id === '\0vosk-browser-virtual') {
        return `
          // 虚拟模块：vosk-browser 是可选依赖
          // 在运行时通过动态 import 加载
          export default null;
          export const Model = null;
          export const KaldiRecognizer = null;
        `
      }
      return null
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), voskBrowserPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['vosk-browser'], // 排除 vosk-browser，它是可选依赖
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      external: ['vosk-browser'], // vosk-browser 是可选依赖，标记为外部
      onwarn(warning, warn) {
        // 忽略 vosk-browser 的外部化警告
        if (warning.code === 'EXTERNALIZED_MODULE' && warning.id?.includes('vosk-browser')) {
          return
        }
        warn(warning)
      },
    },
  },
})
