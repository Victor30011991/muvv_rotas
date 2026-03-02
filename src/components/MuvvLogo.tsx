// ─── MuvvLogo — Logotipo SVG da plataforma ───────────────────────────────────
// Logotipo vetorial construído com as cores do Design System.
// Variantes: 'full' (ícone + texto), 'icon' (só ícone), 'text' (só texto)
// 🔧 Troque por <img src="/logo.png" /> se tiver o arquivo real.

interface MuvvLogoProps {
  variant?: 'full' | 'icon' | 'text'
  size?: number
  /** Força cor clara (para fundos escuros) */
  light?: boolean
  className?: string
}

export function MuvvLogo({ variant = 'full', size = 32, light = false, className }: MuvvLogoProps) {
  const textColor = light ? '#FFFFFF' : '#1A2B35'
  const accent    = '#1CC8C8'
  const azure     = '#57A6C1'

  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-label="Muvv ícone"
    >
      {/* Fundo arredondado */}
      <rect width="40" height="40" rx="10" fill={azure} />
      {/* Seta / rota estilizada — representa movimento e logística */}
      <path
        d="M8 24 L20 12 L32 24"
        stroke={accent}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ponto de destino pulsante */}
      <circle cx="20" cy="29" r="3.5" fill={accent} />
      <circle cx="20" cy="29" r="5.5" fill={accent} opacity="0.25" />
      {/* Linha de rota */}
      <line x1="20" y1="12" x2="20" y2="25" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  )

  const text = (
    <div className="flex flex-col leading-none" style={{ color: textColor }}>
      <span style={{
        fontFamily: "'Rubik', sans-serif",
        fontWeight: 900,
        fontSize: size * 0.65,
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        muvv
      </span>
      <span style={{
        fontFamily: "'Rubik', sans-serif",
        fontWeight: 500,
        fontSize: size * 0.28,
        letterSpacing: '0.15em',
        color: light ? 'rgba(255,255,255,0.7)' : azure,
        textTransform: 'uppercase',
      }}>
        rotas
      </span>
    </div>
  )

  if (variant === 'icon') return <div className={className}>{icon}</div>
  if (variant === 'text') return <div className={className}>{text}</div>

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      {icon}
      {text}
    </div>
  )
}
