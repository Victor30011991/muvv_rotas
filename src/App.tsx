// ─── App.tsx — Componente raiz e controlador de navegação ────────────────────
// Gerencia qual Screen está ativa via useState.
// O BottomNav e o botão de "voltar" são controlados aqui.
//
// Estrutura de navegação:
//   home ──(aceitar frete)──▶ order
//   home | docs | wallet | profile ◀──▶ BottomNav

import { useState } from 'react'

import { BottomNav }          from '@/components/BottomNav'
import { Icon, ICON_PATHS }   from '@/components/Icon'
import { HomeScreen }         from '@/screens/HomeScreen'
import { DocsScreen }         from '@/screens/DocsScreen'
import { WalletScreen }       from '@/screens/WalletScreen'
import { OrderDetailScreen }  from '@/screens/OrderDetailScreen'
import { ProfileScreen }      from '@/screens/ProfileScreen'

import type { Screen, NavTab, Freight } from '@/types'

// Abas que pertencem ao BottomNav (ordem de exibição)
const NAV_TABS: NavTab[] = ['home', 'docs', 'wallet', 'profile']

export default function App() {
  // Tela ativa — muda via BottomNav ou ao aceitar um frete
  const [screen,       setScreen]       = useState<Screen>('home')
  // Frete atual — preenchido quando o motorista aceita um card na HomeScreen
  const [activeFreight, setActiveFreight] = useState<Freight | null>(null)

  // Navega para o detalhe do frete
  const handleOrderDetail = (freight: Freight) => {
    setActiveFreight(freight)
    setScreen('order')
  }

  // Controla qual tab do nav fica ativa (order não é uma aba do nav)
  const activeTab: NavTab = NAV_TABS.includes(screen as NavTab)
    ? (screen as NavTab)
    : 'home'

  return (
    // Container do app — max-width 420px centralizado para simular mobile
    <div className="w-screen h-screen flex flex-col bg-muvv-primary max-w-[420px] mx-auto relative overflow-hidden">

      {/* ── Botão de voltar — visível apenas na tela de detalhe ────── */}
      {screen === 'order' && (
        <div className="absolute top-4 left-5 z-10">
          <button
            onClick={() => setScreen('home')}
            aria-label="Voltar ao mapa"
            className="w-10 h-10 rounded-full flex items-center justify-center border-none cursor-pointer backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <Icon path={ICON_PATHS.arrowLeft} size={18} color="white" strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* ── Área de conteúdo — ocupa todo o espaço disponível ─────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {screen === 'home'    && <HomeScreen onOrderDetail={handleOrderDetail} />}
        {screen === 'docs'    && <DocsScreen />}
        {screen === 'wallet'  && <WalletScreen />}
        {screen === 'order'   && <OrderDetailScreen freight={activeFreight} />}
        {screen === 'profile' && <ProfileScreen />}
      </div>

      {/* ── BottomNav — oculto na tela de detalhe do frete ─────────── */}
      {screen !== 'order' && (
        <BottomNav
          active={activeTab}
          onChange={(tab: NavTab) => setScreen(tab)}
        />
      )}
    </div>
  )
}
