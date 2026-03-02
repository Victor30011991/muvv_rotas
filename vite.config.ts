// ─── Vite Configuration ───────────────────────────────────────────────────────
// base: '/muvv_rotas/' garante que os assets funcionem na subpasta do GitHub Pages
// Para rodar LOCAL o Vite entende automaticamente, mas no Deploy o GitHub precisa da base.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

// Configuração para garantir que o alias '@' funcione em qualquer sistema (Windows/Linux/Mac)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  // 🔧 Mantenha '/muvv_rotas/' para o site funcionar no GitHub Pages
  base: '/muvv_rotas/',

  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 — configurado via src/index.css
  ],

  resolve: {
    alias: {
      // O alias '@/' aponta para a pasta 'src/'
      '@': path.resolve(__dirname, './src'),
    },
  },
})