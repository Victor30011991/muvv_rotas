// ─── ZpeMap — Mapa SVG estilizado das rotas ZPE Piauí ───────────────────────
// Representa o Delta do Parnaíba, a BR-343 e o complexo ZPE Piauí.
// As animações de pulso são SVG nativas (sem dependência externa).
// 🔧 ALTERE: Paths das rotas nas constantes ROAD_* abaixo.

interface ZpeMapProps {
  /** Liga/desliga o pulso animado do ponto do veículo */
  pulse?: boolean
}

// ── Pontos de interesse no mapa ──────────────────────────────────────────────
// Cada bloco de cidade [x, y, w, h]
const CITY_BLOCKS: [number, number][] = [
  [60,100],[80,90],[100,85],[75,110],[95,115],
  [115,100],[60,130],[85,135],[105,125],
]

export function ZpeMap({ pulse = true }: ZpeMapProps) {
  return (
    <svg
      viewBox="0 0 400 300"
      className="w-full h-full drop-shadow-teal"
      aria-label="Mapa de rotas ZPE Piauí — Parnaíba"
    >
      <defs>
        {/* Gradiente de fundo — céu/água */}
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#D8E8EF" />
          <stop offset="100%" stopColor="#C5D9E2" />
        </linearGradient>

        {/* Gradiente das trilhas neon Teal → Azure */}
        <linearGradient id="roadGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#1CC8C8" />
          <stop offset="100%" stopColor="#57A6C1" />
        </linearGradient>

        {/* Filtro glow para trilhas e ponto de veículo */}
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Fundo ───────────────────────────────────────────────────── */}
      <rect width="400" height="300" fill="url(#bgGrad)" rx="16" />

      {/* ── Delta / Oceano ──────────────────────────────────────────── */}
      <path
        d="M0,200 Q50,180 100,190 Q150,200 180,185 Q210,170 240,180 Q280,195 320,175 Q360,155 400,165 L400,300 L0,300Z"
        fill="#57A6C1" opacity="0.3"
      />
      <path
        d="M0,220 Q60,205 120,215 Q180,225 220,208 Q270,190 320,200 Q360,210 400,195 L400,300 L0,300Z"
        fill="#57A6C1" opacity="0.2"
      />

      {/* ── Blocos urbanos — Parnaíba ────────────────────────────────── */}
      {CITY_BLOCKS.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={14} height={10} rx="2" fill="#B5CDD8" opacity="0.7" />
      ))}

      {/* ── Complexo ZPE Piauí ──────────────────────────────────────── */}
      {/* 🔧 ALTERE x, y, width, height para reposicionar o complexo */}
      <rect
        x="280" y="80" width="80" height="60" rx="8"
        fill="#DAA520" opacity="0.15"
        stroke="#DAA520" strokeWidth="1.5" strokeDasharray="4 2"
      />
      <text x="320" y="108" textAnchor="middle" fill="#DAA520" fontSize="9" fontWeight="700" fontFamily="sans-serif">ZPE</text>
      <text x="320" y="120" textAnchor="middle" fill="#DAA520" fontSize="7"              fontFamily="sans-serif">PIAUÍ</text>

      {/* ── BR-343 — Rodovia principal ──────────────────────────────── */}
      {/* 🔧 ALTERE o path abaixo para mudar o traçado da rodovia */}
      <path
        d="M20,150 Q80,140 140,145 Q200,150 260,140 Q300,133 340,125"
        stroke="url(#roadGrad)" strokeWidth="4" fill="none"
        strokeLinecap="round" filter="url(#glow)" opacity="0.9"
      />
      <text x="170" y="135" fill="#1CC8C8" fontSize="8" fontWeight="600" fontFamily="sans-serif" opacity="0.8">BR-343</text>

      {/* ── Rota secundária — Porto ──────────────────────────────────── */}
      <path
        d="M140,145 Q150,170 155,190 Q158,210 160,230"
        stroke="#57A6C1" strokeWidth="2.5" fill="none"
        strokeDasharray="6 3" strokeLinecap="round"
      />

      {/* ── Rota de acesso ao porto ──────────────────────────────────── */}
      <path
        d="M200,155 Q230,165 250,175 Q270,185 280,190"
        stroke="#1CC8C8" strokeWidth="3" fill="none"
        strokeLinecap="round" opacity="0.7" filter="url(#glow)"
      />

      {/* ── Conexão ZPE (tracejada Prestige/Gold) ───────────────────── */}
      <path
        d="M340,125 Q345,105 315,90"
        stroke="#DAA520" strokeWidth="2" fill="none"
        strokeDasharray="5 3" strokeLinecap="round" opacity="0.8"
      />

      {/* ── Marcadores de localização ────────────────────────────────── */}
      <circle cx="80"  cy="120" r="5" fill="#FFFFFF" stroke="#57A6C1" strokeWidth="2" />
      <text x="90" y="118" fill="#1A2B35" fontSize="8" fontFamily="sans-serif" fontWeight="600">Parnaíba</text>

      <circle cx="160" cy="230" r="5" fill="#FFFFFF" stroke="#57A6C1" strokeWidth="2" />
      <text x="168" y="228" fill="#1A2B35" fontSize="8" fontFamily="sans-serif">Porto</text>

      <circle cx="280" cy="190" r="4" fill="#57A6C1" />

      {/* ── Ponto do veículo (animado) ───────────────────────────────── */}
      <g filter="url(#glow)">
        <circle cx="200" cy="152" r="8" fill="#1CC8C8" opacity="0.25" />
        <circle cx="200" cy="152" r="5" fill="#1CC8C8" />
        {pulse && (
          <circle cx="200" cy="152" r="5" fill="none" stroke="#1CC8C8" strokeWidth="2">
            <animate attributeName="r"       values="5;14;5"   dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1"    dur="2.5s" repeatCount="indefinite" />
          </circle>
        )}
      </g>

      {/* ── Bússola ─────────────────────────────────────────────────── */}
      <circle cx="370" cy="40" r="16" fill="white" opacity="0.8" />
      <text x="370" y="34" textAnchor="middle" fill="#1A2B35" fontSize="8" fontWeight="700" fontFamily="sans-serif">N</text>
      <line x1="370" y1="37" x2="370" y2="46" stroke="#57A6C1" strokeWidth="1.5" />
      <line x1="366" y1="41" x2="374" y2="41" stroke="#BBBBB0" strokeWidth="1"   />
    </svg>
  )
}
