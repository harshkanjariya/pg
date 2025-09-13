import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/comfort-stays-pg/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
