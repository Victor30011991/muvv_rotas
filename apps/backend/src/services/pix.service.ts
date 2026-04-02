// ================================================
// MUVV ROTAS — Serviço PIX (Efí Bank)
// Gera cobrança PIX e confirma pagamento
// Em sandbox por padrão — sem custo para testar
// ================================================

import axios from 'axios'

const EFI_BASE = process.env.EFI_SANDBOX === 'true'
  ? 'https://pix-h.api.efipay.com.br'
  : 'https://pix.api.efipay.com.br'

// Obtém token de acesso da Efí
async function getEfiToken(): Promise<string | null> {
  if (!process.env.EFI_CLIENT_ID || !process.env.EFI_CLIENT_SECRET) {
    return null // PIX não configurado — modo simulado
  }

  try {
    const credentials = Buffer.from(
      `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`
    ).toString('base64')

    const { data } = await axios.post(
      `${EFI_BASE}/oauth/token`,
      { grant_type: 'client_credentials' },
      { headers: { Authorization: `Basic ${credentials}` } }
    )

    return data.access_token
  } catch {
    return null
  }
}

interface PixChargeInput {
  value:     number   // em reais
  driverId:  string
  freteId:   string
  pixKey:    string   // chave pix do motorista
}

interface PixChargeResult {
  txId:    string
  qrCode?: string
  copyPaste?: string
  simulated: boolean
}

// Gera cobrança PIX para o motorista
export async function generatePixCharge(
  input: PixChargeInput
): Promise<PixChargeResult> {
  const token = await getEfiToken()

  // Modo simulado (MVP sem PIX configurado)
  if (!token) {
    return {
      txId:      `SIM-${input.freteId.slice(0, 8).toUpperCase()}`,
      qrCode:    'QR-CODE-SIMULADO',
      copyPaste: `PIX SIMULADO - R$ ${input.value.toFixed(2)} para ${input.pixKey}`,
      simulated: true
    }
  }

  // Modo real — integração Efí
  try {
    const { data } = await axios.post(
      `${EFI_BASE}/v2/cob`,
      {
        calendario: { expiracao: 3600 },
        valor:      { original: input.value.toFixed(2) },
        chave:      input.pixKey,
        solicitacaoPagador: `Frete Muvv Rotas #${input.freteId.slice(0, 8)}`
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    return {
      txId:      data.txid,
      qrCode:    data.pixCopiaECola,
      copyPaste: data.pixCopiaECola,
      simulated: false
    }
  } catch {
    // Fallback para simulado se Efí falhar
    return {
      txId:      `ERR-${Date.now()}`,
      simulated: true
    }
  }
}

// Confirma pagamento via webhook da Efí
export async function confirmPixPayment(txId: string): Promise<boolean> {
  const token = await getEfiToken()
  if (!token) return true // Simulado = sempre confirmado

  try {
    const { data } = await axios.get(
      `${EFI_BASE}/v2/cob/${txId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return data.status === 'CONCLUIDA'
  } catch {
    return false
  }
}
