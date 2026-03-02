// ─── views/HubView.tsx — Portal de Entrada ───────────────────────────────────
// Tela inicial com seleção de perfil.
// Cada card leva o usuário para a view correspondente.

import { MuvvLogo }  from '@/components/MuvvLogo'
import { useFreight } from '@/context/FreightContext'
import type { AppProfile } from '@/types'

interface ProfileCard {
  id: AppProfile
  emoji: string
  title: string
  subtitle: string
  description: string
  gradient: string
  border: string
  badge?: string
}

const PROFILES: ProfileCard[] = [
  {
    id:          'driver',
    emoji:       '🚛',
    title:       'Motorista',
    subtitle:    'Muvv Go · Pro · Global',
    description: 'Simule rotas, calcule ganhos e aceite fretes em tempo real.',
    gradient:    'linear-gradient(135deg, #57A6C1, #3D6B7D)',
    border:      '#57A6C1',
  },
  {
    id:          'client',
    emoji:       '📦',
    title:       'Cliente',
    subtitle:    'Solicitar frete',
    description: 'Calcule o custo do seu envio e solicite um motorista Muvv.',
    gradient:    'linear-gradient(135deg, #1CC8C8, #57A6C1)',
    border:      '#1CC8C8',
  },
  {
    id:          'dispatcher',
    emoji:       '🗂️',
    title:       'Despachante',
    subtitle:    'Gestão · BI · ZPE',
    description: 'Checklist de segurança, monitoramento e projeção anual de ganhos.',
    gradient:    'linear-gradient(135deg, #DAA520, #C8952A)',
    border:      '#DAA520',
    badge:       'EMPRESARIAL',
  },
]

export function HubView() {
  const { setProfile } = useFreight()

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div
        className="relative px-6 pt-12 pb-16 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(180deg, #1A2B35 0%, #3D6B7D 100%)' }}
      >
        {/* Decoração de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i}
              className="absolute rounded-full opacity-5"
              style={{
                width:  80 + i * 40,
                height: 80 + i * 40,
                border: '1.5px solid #1CC8C8',
                top:    '50%',
                left:   '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>

        <MuvvLogo variant="full" size={44} light className="mb-4 relative z-10" />

        <p className="text-white/70 text-sm relative z-10 max-w-xs leading-relaxed">
          Plataforma de logística inteligente para o Nordeste e ZPE Piauí
        </p>

        {/* Pills de planos */}
        <div className="flex gap-2 mt-4 relative z-10">
          {['🚐 Go', '🚛 Pro', '🌍 Global'].map(p => (
            <span key={p}
              className="text-white/80 text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* ── Seleção de perfil ────────────────────────────────────────── */}
      <div className="flex-1 px-5 py-6 space-y-4" style={{ background: '#EAEFF2' }}>
        <div className="text-center mb-2">
          <p className="text-muvv-muted text-xs uppercase tracking-widest font-semibold">
            Selecione seu perfil
          </p>
        </div>

        {PROFILES.map(card => (
          <button
            key={card.id}
            onClick={() => setProfile(card.id)}
            className="w-full text-left rounded-[20px] p-5 cursor-pointer border-none
                       transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]
                       shadow-card hover:shadow-accent"
            style={{ background: 'white', border: `2px solid ${card.border}18` }}
          >
            <div className="flex items-center gap-4">
              {/* Ícone com gradiente */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md"
                style={{ background: card.gradient }}
              >
                {card.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muvv-dark text-base font-extrabold">{card.title}</span>
                  {card.badge && (
                    <span
                      className="text-white text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#DAA520' }}
                    >
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-muvv-muted text-xs font-medium mt-0.5">{card.subtitle}</p>
                <p className="text-muvv-dark/70 text-xs mt-1 leading-snug">{card.description}</p>
              </div>

              {/* Seta */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={card.border} strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        ))}

        {/* Rodapé */}
        <p className="text-center text-muvv-muted text-[10px] pt-2">
          Muvv Holding · ZPE Piauí · v4.0
        </p>
      </div>
    </div>
  )
}
