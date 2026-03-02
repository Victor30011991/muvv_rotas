// ─── AddressSearch — Busca de endereço com CEP + Geocoding ───────────────────
// CEP opcional: preenche Estado/Cidade automaticamente via ViaCEP.
// Geocoding: converte o endereço completo em lat/lng via Nominatim.

import { useState, useCallback } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'
import type { RouteWaypoint, AddressForm } from '@/types'

interface AddressSearchProps {
  label:    string
  index:    number
  onAdd:    (wp: RouteWaypoint) => void
}

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

const EMPTY_FORM: AddressForm = {
  estado: 'PI', cidade: '', endereco: '', numero: '', cep: '',
}

/** Busca CEP via ViaCEP e retorna endereço parcial */
async function fetchViaCep(cep: string): Promise<Partial<AddressForm> | null> {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) return null
  try {
    const res  = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
    const data = await res.json() as {
      erro?: boolean; logradouro?: string; localidade?: string; uf?: string
    }
    if (data.erro) return null
    return {
      endereco: data.logradouro ?? '',
      cidade:   data.localidade ?? '',
      estado:   data.uf ?? '',
    }
  } catch {
    return null
  }
}

/** Geocoding via Nominatim */
async function geocodeAddress(form: AddressForm): Promise<{ lat: number; lng: number } | null> {
  const query = [form.endereco, form.numero, form.cidade, form.estado, 'Brasil']
    .filter(Boolean).join(', ')
  try {
    const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    const res  = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
    const data = await res.json() as Array<{ lat: string; lon: string }>
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export function AddressSearch({ label, index, onAdd }: AddressSearchProps) {
  const [form,      setForm]      = useState<AddressForm>(EMPTY_FORM)
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [open,      setOpen]      = useState(false)

  const set = (field: keyof AddressForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleCepBlur = useCallback(async () => {
    if (!form.cep || form.cep.replace(/\D/g, '').length !== 8) return
    setCepStatus('loading')
    const result = await fetchViaCep(form.cep)
    if (result) {
      setForm(prev => ({ ...prev, ...result }))
      setCepStatus('ok')
    } else {
      setCepStatus('error')
    }
  }, [form.cep])

  const handleConfirm = async () => {
    if (!form.cidade || !form.endereco) return
    setGeoStatus('loading')
    const coords = await geocodeAddress(form)
    if (!coords) { setGeoStatus('error'); return }

    setGeoStatus('ok')
    const addressLabel = `${form.endereco}${form.numero ? ', '+form.numero : ''} — ${form.cidade}/${form.estado}`
    onAdd({
      id:      `wp-${Date.now()}`,
      label:   `${index + 1}. ${label}`,
      address: addressLabel,
      lat:     coords.lat,
      lng:     coords.lng,
    })
    setOpen(false)
    setGeoStatus('idle')
  }

  const inputCls = 'w-full bg-muvv-primary rounded-xl px-3 py-2.5 text-sm text-muvv-dark outline-none focus:ring-2 focus:ring-muvv-accent/30 transition'

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-card-sm border-2 border-dashed border-muvv-secondary/30 cursor-pointer transition hover:border-muvv-accent/40"
      >
        <div className="w-8 h-8 rounded-full bg-muvv-accent/10 flex items-center justify-center flex-shrink-0">
          <span className="text-muvv-accent font-bold text-xs">{index + 1}</span>
        </div>
        <div className="flex-1 text-left">
          <p className="text-muvv-muted text-[11px]">{label}</p>
          <p className="text-muvv-dark text-sm font-semibold">
            {form.cidade ? `${form.endereco || 'Endereço'}, ${form.cidade}/${form.estado}` : 'Toque para preencher'}
          </p>
        </div>
        <Icon path={open ? ICON_PATHS.arrowLeft : ICON_PATHS.arrow} size={16} color="#8AAEBB" />
      </button>

      {open && (
        <div className="mt-2 bg-white rounded-2xl p-4 shadow-card border border-muvv-border space-y-3">
          {/* CEP */}
          <div>
            <label className="text-muvv-muted text-[11px] font-semibold mb-1 block">CEP (opcional)</label>
            <div className="relative">
              <input
                className={inputCls}
                placeholder="00000-000"
                value={form.cep}
                onChange={e => set('cep', e.target.value)}
                onBlur={handleCepBlur}
                maxLength={9}
              />
              {cepStatus === 'loading' && (
                <span className="absolute right-3 top-2.5 text-muvv-muted text-xs">buscando...</span>
              )}
              {cepStatus === 'ok' && (
                <span className="absolute right-3 top-2.5 text-muvv-accent text-xs">✓</span>
              )}
              {cepStatus === 'error' && (
                <span className="absolute right-3 top-2.5 text-red-400 text-xs">CEP inválido</span>
              )}
            </div>
          </div>

          {/* Estado + Cidade */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-muvv-muted text-[11px] font-semibold mb-1 block">Estado</label>
              <select
                className={inputCls}
                value={form.estado}
                onChange={e => set('estado', e.target.value)}
              >
                {ESTADOS.map(uf => <option key={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="text-muvv-muted text-[11px] font-semibold mb-1 block">Cidade *</label>
              <input
                className={inputCls}
                placeholder="Parnaíba"
                value={form.cidade}
                onChange={e => set('cidade', e.target.value)}
              />
            </div>
          </div>

          {/* Endereço + Número */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-muvv-muted text-[11px] font-semibold mb-1 block">Endereço *</label>
              <input
                className={inputCls}
                placeholder="Av. Gov. Chapadinha"
                value={form.endereco}
                onChange={e => set('endereco', e.target.value)}
              />
            </div>
            <div>
              <label className="text-muvv-muted text-[11px] font-semibold mb-1 block">Número</label>
              <input
                className={inputCls}
                placeholder="123"
                value={form.numero}
                onChange={e => set('numero', e.target.value)}
              />
            </div>
          </div>

          {/* Botão confirmar */}
          <button
            onClick={handleConfirm}
            disabled={!form.cidade || !form.endereco || geoStatus === 'loading'}
            className="w-full bg-gradient-cta text-white font-bold text-sm py-3 rounded-xl shadow-accent transition disabled:opacity-50 cursor-pointer"
          >
            {geoStatus === 'loading' ? 'Localizando...' : geoStatus === 'error' ? 'Endereço não encontrado' : '📍 Confirmar Ponto'}
          </button>
        </div>
      )}
    </div>
  )
}