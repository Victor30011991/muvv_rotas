// ─── context/FreightContext.tsx — Estado Global Muvv ─────────────────────────
//
// Fornece dados compartilhados entre todas as views:
//   • perfil ativo (driver / client / dispatcher)
//   • frete atual aceito
//   • taxa EUR em tempo real
//
// USO:
//   const { freight, setFreight, eurRate } = useFreight()

import { createContext, useContext, useState, type ReactNode } from 'react'
import { useCurrencyConvert } from '@/hooks/useCurrencyConvert'
import type { Freight, AppProfile } from '@/types'

interface FreightContextValue {
  // Perfil ativo
  profile: AppProfile
  setProfile: (p: AppProfile) => void

  // Frete aceito (passado de HomeScreen → OrderDetail)
  freight: Freight | null
  setFreight: (f: Freight | null) => void

  // EUR
  eurRate: number
  brlToEur: (brl: number) => number
  eurLoading: boolean
}

const FreightContext = createContext<FreightContextValue | null>(null)

export function FreightProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AppProfile>('hub')
  const [freight, setFreight] = useState<Freight | null>(null)
  const { eurRate, brlToEur, loading } = useCurrencyConvert()

  return (
    <FreightContext.Provider
      value={{ profile, setProfile, freight, setFreight, eurRate, brlToEur, eurLoading: loading }}
    >
      {children}
    </FreightContext.Provider>
  )
}

export function useFreight(): FreightContextValue {
  const ctx = useContext(FreightContext)
  if (!ctx) throw new Error('useFreight must be used inside FreightProvider')
  return ctx
}
