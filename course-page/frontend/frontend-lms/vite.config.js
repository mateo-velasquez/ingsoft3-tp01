import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: 'v8',
      // Only the services with logic count: components are presentation, and
      // categoryService/userService are one-line wrappers around apiRequest.
      include: [
        'src/services/api.js',
        'src/services/authService.js',
        'src/services/courseService.js',
        'src/services/subscriptionService.js',
        'src/services/fileService.js',
      ],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
