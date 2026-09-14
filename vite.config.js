import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001, // Bạn có thể đổi số 3000 thành 8080 hoặc bất kỳ số nào bạn thích
    strictPort: true,
    proxy: {
      '/api/convert-docx': {
        target: 'https://latex2mathtypeweb.onrender.com',
        changeOrigin: true,
        secure: false,
        timeout: 120000,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1500, // Nâng giới hạn cảnh báo lên 1500 kB (1.5MB)
  }
})