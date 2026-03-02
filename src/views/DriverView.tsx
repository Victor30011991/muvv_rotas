// ─── views/DriverView.tsx — Painel do Motorista ───────────────────────────────
// Container das sub-telas do motorista. Gerencia navegação interna:
//   home (mapa) ↔ docs ↔ wallet ↔ profile ↔ order (sem nav)

import { useState }           from 'react'
import { useFreight }         from '@/context/FreightContext'
import { BottomNav }          from '@/components/BottomNav'
import { Icon, ICON_PATHS }   from '@/components/Icon'
import { MuvvLogo }           from '@/components/MuvvLogo'
import { DriverMapScreen }    from '@/views/driver/DriverMapScreen'
import { DocsScreen }         from '@/screens/DocsScreen'
import { WalletScreen }       from '@/screens/WalletScreen'
import { OrderDetailScreen }  from '@/screens/OrderDetailScreen'
import { ProfileScreen }      from '@/screens/ProfileScreen'
import type { DriverScreen, DriverNavTab, Freight } from '@/types'

const NAV_TABS: DriverNavTab[] = ['home', 'docs', 'wallet', 'profile']

export function DriverView() {
  const { setProfile, setFreight, freight } = useFreight()
  const [screen, setScreen] = useState<DriverScreen>('home')

  const handleAccept = (f: Freight) => {
    setFreight(f)
    setScreen('order')
  }

  const activeTab: DriverNavTab = NAV_TABS.includes(screen as DriverNavTab)
    ? (screen as DriverNavTab)
    : 'home'

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">

      {/* ── Header fixo (exceto na tela de mapa e order que têm overlay) ── */}
      {screen !== 'home' && screen !== 'order' && (
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #57A6C1, #3D6B7D)' }}
        >
          <MuvvLogo variant="full" size={28} light />
          <button
            onClick={() => setProfile('hub')}
            className="text-white/70 text-xs border border-white/20 rounded-full px-3 py-1 cursor-pointer bg-transparent hover:bg-white/10 transition-colors"
          >
            ← Hub
          </button>
        </div>
      )}

      {/* ── Botão voltar (order detail) ──────────────────────────────── */}
      {screen === 'order' && (
        <div className="absolute top-4 left-5 z-20">
          <button
            onClick={() => setScreen('home')}
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-none"
            style={{ background: 'rgba(26,43,53,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <Icon path={ICON_PATHS.arrowLeft} size={18} color="white" strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* ── Conteúdo ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {screen === 'home'    && <DriverMapScreen onAccept={handleAccept} />}
        {screen === 'docs'    && <DocsScreen />}
        {screen === 'wallet'  && <WalletScreen />}
        {screen === 'order'   && <OrderDetailScreen freight={freight} />}
        {screen === 'profile' && <ProfileScreen />}
      </div>

      {/* ── Bottom Nav ───────────────────────────────────────────────── */}
      {screen !== 'order' && (
        <BottomNav active={activeTab} onChange={tab => setScreen(tab as DriverScreen)} />
      )}
    </div>
  )
}
