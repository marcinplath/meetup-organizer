import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  define: {
    'process.env.VITE_REDIRECT_URL': JSON.stringify('http://192.168.0.127:3000')
  }
})
