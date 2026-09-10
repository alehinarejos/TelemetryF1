import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/f1-signalr': {
        target: 'https://livetiming.formula1.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/f1-signalr/, '/signalrcore'),
        headers: {
          'User-Agent': 'BestHTTP',
        },
      },
      '/f1-static': {
        target: 'https://livetiming.formula1.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/f1-static/, '/static'),
        headers: {
          'User-Agent': 'BestHTTP',
        },
      },
    },
  },
})
