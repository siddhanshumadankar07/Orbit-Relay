import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': 'http://127.0.0.1:8001',
      '/schedule-mission': 'http://127.0.0.1:8001',
      '/analyze-report': 'http://127.0.0.1:8001',
      '/missions': 'http://127.0.0.1:8001',
      '/disasters': 'http://127.0.0.1:8001',
      '/iss-position': 'http://127.0.0.1:8001',
      '/ai-analysis': 'http://127.0.0.1:8001',
    },
  },
})
