import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el sitio bajo /amigo-secreto/
export default defineConfig({
  plugins: [react()],
  base: '/amigo-secreto/',
})
