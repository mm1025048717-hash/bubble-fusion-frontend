import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0', // 监听所有网络接口，包括 IPv4 和 IPv6
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
