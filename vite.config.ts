// ─── Vite Configuration ───────────────────────────────────────────────────────
// base: '/muvv_rotas/' garante que os assets funcionem na subpasta do GitHub Pages
// Para rodar LOCAL mude base para '/'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  // 🔧 ALTERE AQUI para '/' se quiser rodar na raiz (desenvolvimento local)
  base: '/muvv_rotas/',

  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 — sem tailwind.config.ts; configurado via src/index.css
  ],

  resolve: {
    alias: {
      // Alias '@/' aponta para 'src/' — use em todos os imports
      '@': path.resolve(__dirname, './src'),
    },
  },
})
