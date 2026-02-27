export const MUVV_RATES = {
  heavy: 0.12,    // Carga Pesada: 12%
  light: 0.08,    // Carga Leve: 8%
  zpe: 0.15,      // ZPE/Exportação: 15%
}

export const calcNet = (gross: number, category: string) => {
  const rate = MUVV_RATES[category as keyof typeof MUVV_RATES] || 0.10
  const fee = gross * rate
  return { 
    gross, 
    fee, 
    net: gross - fee, 
    rate: (rate * 100).toFixed(0) 
  }
}