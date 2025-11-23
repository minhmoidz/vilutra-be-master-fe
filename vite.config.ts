import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Khi frontend gọi đường dẫn bắt đầu bằng /proxy-image
      // Vite sẽ chuyển hướng ngầm sang http://10.3.9.18:9001
      '/proxy-image': {
        target: 'http://10.3.9.18:9001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-image/, ''),
        secure: false,
      },
    },
  },
})