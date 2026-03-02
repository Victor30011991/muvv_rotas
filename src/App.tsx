// ════════════════════════════════════════════════════════════════════════════
// APP.TSX — Muvv Rotas v4  ·  Arquitetura Clean + Portal de Perfis
// ════════════════════════════════════════════════════════════════════════════
//
// FLUXOGRAMA DE NAVEGAÇÃO
// ──────────────────────────────────────────────────────────────────────────
//
//  ┌──────────────────────────────────────────────────────────────────────┐
//  │                        main.tsx                                      │
//  │              <FreightProvider>  (contexto global EUR + frete)        │
//  │                    └── <App />                                       │
//  └──────────────────────────────────────────────────────────────────────┘
//
//  App (profile state)
//   │
//   ├─── profile = 'hub'
//   │         └── <HubView />  ←── 3 cards de seleção de perfil
//   │
//   ├─── profile = 'driver'
//   │         └── <DriverView />
//   │                  ├── screen = 'home'    → <DriverMapScreen />
//   │                  │       ├── Barra de busca Nominatim (origem/destino)
//   │                  │       ├── Seletor de plano (Go / Pro / Global)
//   │                  │       ├── <ZpeMap /> (CartoDB Positron)
//   │                  │       └── <SlideToAccept /> → screen = 'order'
//   │                  ├── screen = 'docs'    → <DocsScreen />
//   │                  ├── screen = 'wallet'  → <WalletScreen />
//   │                  ├── screen = 'profile' → <ProfileScreen />
//   │                  └── screen = 'order'   → <OrderDetailScreen />
//   │
//   ├─── profile = 'client'
//   │         └── <ClientView />
//   │                  └── Cotação com busca de endereço + cálculo em tempo real
//   │
//   └─── profile = 'dispatcher'
//             └── <DispatcherView />
//                      ├── tab = 'checklist' → 5 itens de segurança ZPE
//                      └── tab = 'bi'        → Simulador de projeção anual 12 meses
//
// ──────────────────────────────────────────────────────────────────────────
//
// CAMADAS (Clean Architecture)
//
//  ┌─ views/ ──────────────────────┐   Orquestração de UI por perfil
//  │  HubView · DriverView         │
//  │  ClientView · DispatcherView  │
//  └───────────────────────────────┘
//         │ usa
//  ┌─ context/ ────────────────────┐   Estado global compartilhado
//  │  FreightContext               │   freight, profile, eurRate, brlToEur
//  └───────────────────────────────┘
//         │ usa
//  ┌─ hooks/ ──────────────────────┐   Lógica assíncrona encapsulada
//  │  useCurrencyConvert           │   Busca EUR/BRL em tempo real
//  └───────────────────────────────┘
//         │ usa
//  ┌─ services/ ───────────────────┐   Regras de negócio puras (sem React)
//  │  calculations.ts              │   calcGross, calcNet, projectBi
//  │  geocoding.ts                 │   searchAddress, roadKm, STATIC_POINTS
//  └───────────────────────────────┘
//
//  ┌─ components/ ─────────────────┐   UI atômica reutilizável
//  │  MuvvLogo · ZpeMap            │
//  │  BottomNav · Icon · etc.      │
//  └───────────────────────────────┘
//
// ════════════════════════════════════════════════════════════════════════════

import { useFreight }        from '@/context/FreightContext'
import { HubView }           from '@/views/HubView'
import { DriverView }        from '@/views/DriverView'
import { ClientView }        from '@/views/ClientView'
import { DispatcherView }    from '@/views/DispatcherView'

// Animação de fade entre telas
const FADE_IN = 'animate-fadeIn'

export default function App() {
  const { profile } = useFreight()

  return (
    // Container mobile — max 420px centralizado, 100vh
    <div className="w-screen h-screen flex flex-col bg-muvv-primary max-w-[420px] mx-auto relative overflow-hidden">
      <div key={profile} className={`flex-1 flex flex-col overflow-hidden min-h-0 ${FADE_IN}`}>
        {profile === 'hub'        && <HubView />}
        {profile === 'driver'     && <DriverView />}
        {profile === 'client'     && <ClientView />}
        {profile === 'dispatcher' && <DispatcherView />}
      </div>
    </div>
  )
}
