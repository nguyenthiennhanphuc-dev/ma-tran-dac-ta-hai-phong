import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: true,
    proxy: {
      '/api/health': {
        target: 'https://latex2mathtypeweb.onrender.com',
        rewrite: () => '/',
        changeOrigin: true,
        secure: false,
      },
      '/api/convert-docx': {
        target: 'https://latex2mathtypeweb.onrender.com',
        changeOrigin: true,
        secure: false,
        timeout: 120000,
      },
      '/api/convert-text': {
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