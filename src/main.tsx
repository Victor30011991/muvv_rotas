// ─── main.tsx — Entry point ───────────────────────────────────────────────────
// Monta o React no DOM e envolve a árvore com FreightProvider
// (contexto global de perfil, frete e câmbio EUR).

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App              from '@/App'
import { FreightProvider } from '@/context/FreightContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FreightProvider>
      <App />
    </FreightProvider>
  </StrictMode>
)
