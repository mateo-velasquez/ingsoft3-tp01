import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],   // vitest does NOT run the Playwright specs (both live in e2e/)
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
        'src/services/ratingService.js',
      ],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
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
