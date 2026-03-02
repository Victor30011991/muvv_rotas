// ─── AnimCounter — Contador animado de número ─────────────────────────────────
// Anima um valor numérico de 0 até `value` em ~1.2s.
// Usado na Carteira e no cabeçalho do Saldo.

import { useState, useEffect } from 'react'

interface AnimCounterProps {
  value: number
  /** Prefixo antes do número — ex: "R$ " ou "€ " */
  prefix?: string
  suffix?: string
  decimals?: number
}

export function AnimCounter({ value, prefix = '', suffix = '', decimals = 2 }: AnimCounterProps) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let current = 0
    const end       = value
    const duration  = 1200  // ms
    const stepMs    = 16    // ~60fps
    const increment = end / (duration / stepMs)

    const timer = setInterval(() => {
      current += increment
      if (current >= end) {
        setDisplay(end)
        clearInterval(timer)
      } else {
        setDisplay(current)
      }
    }, stepMs)

    return () => clearInterval(timer)
  }, [value])

  return (
    <span>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  )
}
