// ─── BottomNav — Navegação inferior fixa ─────────────────────────────────────
// Controla qual Screen é exibida via prop onChange.
// A tela 'order' não aparece aqui pois é acessada via card de frete.

import { Icon, ICON_PATHS } from '@/components/Icon'
import type { NavTab } from '@/types'

interface BottomNavProps {
  active: NavTab
  onChange: (tab: NavTab) => void
}

// ── Definição das abas — adicione/remova tabs aqui ──────────────────────────
const TABS: { id: NavTab; label: string; iconPath: string }[] = [
  { id: 'home',    label: 'Início',     iconPath: ICON_PATHS.home   },
  { id: 'docs',    label: 'Documentos', iconPath: ICON_PATHS.docs   },
  { id: 'wallet',  label: 'Carteira',   iconPath: ICON_PATHS.wallet },
  { id: 'profile', label: 'Perfil',     iconPath: ICON_PATHS.user   },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="h-[72px] bg-white border-t border-muvv-border flex items-center shadow-nav flex-shrink-0"
    >
      {TABS.map(tab => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center gap-1 py-2 transition-all duration-200 cursor-pointer border-none bg-transparent"
          >
            <div
              className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
                isActive ? 'bg-muvv-accent/10' : 'bg-transparent'
              }`}
            >
              <Icon
                path={tab.iconPath}
                size={22}
                color={isActive ? '#1CC8C8' : '#8AAEBB'}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
            </div>
            <span
              className={`text-[10px] transition-all duration-200 ${
                isActive ? 'text-muvv-accent font-bold' : 'text-muvv-muted font-normal'
              }`}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
