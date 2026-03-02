// ─── hooks/useCurrencyConvert.ts — Conversão EUR em tempo real ───────────────
//
// Tenta buscar a cotação EUR/BRL da API ExchangeRate-API (free tier).
// Fallback: EUR_BRL_FALLBACK = R$ 6,00.
// Atualiza automaticamente a cada 5 minutos.
//
// USO:
//   const { eurRate, brlToEur, loading } = useCurrencyConvert()

import { useState, useEffect, useCallback } from 'react'
import { EUR_BRL_FALLBACK } from '@/services/calculations'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

export function useCurrencyConvert() {
  const [eurRate, setEurRate] = useState<number>(EUR_BRL_FALLBACK)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchRate = useCallback(async () => {
    setLoading(true)
    try {
      // ExchangeRate-API free tier — sem chave para BRL/EUR
      const res  = await fetch('https://api.exchangerate-api.com/v4/latest/EUR', {
        signal: AbortSignal.timeout(4000),
      })
      const data = await res.json()
      const rate = data?.rates?.BRL as number | undefined
      if (rate && rate > 0) {
        setEurRate(rate)
        setLastUpdated(new Date())
      }
    } catch {
      // Offline / sem acesso — mantém fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRate()
    const interval = setInterval(fetchRate, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchRate])

  const brlToEur = useCallback(
    (brl: number) => brl / eurRate,
    [eurRate]
  )

  const eurToBrl = useCallback(
    (eur: number) => eur * eurRate,
    [eurRate]
  )

  return { eurRate, brlToEur, eurToBrl, loading, lastUpdated }
}
