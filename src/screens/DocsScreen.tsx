// ─── DocsScreen — Onboarding de Documentos ───────────────────────────────────
// Captura de CNH, ANTT, CRLV e Apólice de Seguro.
// Cards modulares com estado de upload simulado (toggle ao clicar).
// Em produção, substituir o toggle por upload real via API.

import { useState } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'
import type { DocItem }      from '@/types'

// ── Documentos obrigatórios e opcionais ─────────────────────────────────────
// 🔧 ALTERE AQUI para adicionar/remover documentos do onboarding
const DOCS: DocItem[] = [
  {
    id:       'cnh',
    label:    'CNH',
    subtitle: 'Carteira Nacional de Habilitação',
    iconPath: ICON_PATHS.docs,
    required: true,
  },
  {
    id:       'antt',
    label:    'ANTT',
    subtitle: 'Registro Nacional de Transportadores',
    iconPath: ICON_PATHS.truck,
    required: true,
  },
  {
    id:       'crlv',
    label:    'CRLV',
    subtitle: 'Certificado de Licenciamento do Veículo',
    iconPath: ICON_PATHS.check,
    required: true,
  },
  {
    id:       'seguro',
    label:    'Apólice de Seguro',
    subtitle: 'Cobertura obrigatória ZPE Premium',
    iconPath: ICON_PATHS.shield,
    required: false,
    isGold:   true,
  },
]

const TOTAL_DOCS = DOCS.length

export function DocsScreen() {
  // Simula estado de upload — em produção, substituir por estado real
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({})

  const toggleDoc   = (id: string) => setUploaded(prev => ({ ...prev, [id]: !prev[id] }))
  const uploadCount = Object.values(uploaded).filter(Boolean).length
  const progressPct = (uploadCount / TOTAL_DOCS) * 100
  const isComplete  = uploadCount >= TOTAL_DOCS - 1 // 3 de 4 = habilitado

  return (
    <div className="flex-1 overflow-y-auto p-5">

      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-muvv-dark text-2xl font-extrabold mb-1">Seus Documentos</h1>
        <p className="text-muvv-muted text-sm">Upload seguro e criptografado</p>
      </div>

      {/* ── Barra de progresso ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 mb-5 shadow-card">
        <div className="flex justify-between mb-2">
          <span className="text-muvv-dark text-sm font-semibold">Progresso</span>
          <span className="text-muvv-accent text-sm font-bold">{uploadCount}/{TOTAL_DOCS}</span>
        </div>
        <div className="h-2 bg-muvv-primary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-road rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Cards de documento ────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {DOCS.map(doc => {
          const isDone   = !!uploaded[doc.id]
          const isGold   = !!doc.isGold
          const accentColor = isGold ? 'muvv-prestige' : 'muvv-accent';
            console.log(accentColor);

          return (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              aria-pressed={isDone}
              onClick={() => toggleDoc(doc.id)}
              onKeyDown={e => e.key === 'Enter' && toggleDoc(doc.id)}
              className={`bg-white rounded-2xl p-4 cursor-pointer transition-all duration-300 border-2 ${
                isDone
                  ? isGold
                    ? 'border-muvv-prestige shadow-prestige'
                    : 'border-muvv-accent shadow-accent'
                  : 'border-muvv-border shadow-card-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Ícone do documento */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                    isDone
                      ? isGold ? 'bg-muvv-prestige-light' : 'bg-muvv-accent-light'
                      : 'bg-muvv-primary'
                  }`}
                >
                  <Icon
                    path={doc.iconPath}
                    size={22}
                    color={isDone ? (isGold ? '#DAA520' : '#1CC8C8') : '#8AAEBB'}
                  />
                </div>

                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muvv-dark text-[15px] font-bold">{doc.label}</span>
                    {isGold && (
                      <span className="bg-muvv-prestige text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        PREMIUM
                      </span>
                    )}
                    {!doc.required && !isGold && (
                      <span className="text-muvv-muted text-[10px]">opcional</span>
                    )}
                  </div>
                  <p className="text-muvv-muted text-xs mt-0.5">{doc.subtitle}</p>
                </div>

                {/* Botão de ação */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isDone
                      ? isGold ? 'bg-muvv-prestige shadow-prestige' : 'bg-muvv-accent shadow-accent'
                      : 'bg-muvv-primary'
                  }`}
                >
                  <Icon
                    path={isDone ? ICON_PATHS.check : ICON_PATHS.camera}
                    size={16}
                    color={isDone ? 'white' : '#8AAEBB'}
                    strokeWidth={isDone ? 2.5 : 1.8}
                  />
                </div>
              </div>

              {/* ── Selo ZPE Gold — aparece quando seguro é verificado ── */}
              {isGold && isDone && (
                <div className="mt-3 p-3 bg-gradient-prestige rounded-xl border border-muvv-prestige/20 flex items-center gap-3">
                  <Icon path={ICON_PATHS.shield} size={18} color="#DAA520" />
                  <div>
                    <p className="text-muvv-prestige text-[11px] font-bold">Selo ZPE Gold Ativo</p>
                    <p className="text-amber-600 text-[10px]">Cobertura R$ 500.000 · válido 12 meses</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Banner de conclusão ───────────────────────────────────── */}
      {isComplete && (
        <div className="mt-5 p-4 bg-gradient-cta rounded-2xl text-center shadow-accent">
          <p className="text-white font-bold text-base">✓ Documentação Completa!</p>
          <p className="text-white/85 text-sm mt-1">Você está habilitado para fretes ZPE</p>
        </div>
      )}
    </div>
  )
}
