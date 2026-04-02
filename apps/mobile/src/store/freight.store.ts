// ================================================
// MUVV ROTAS — Store de fretes (Zustand)
// ================================================

import { create } from 'zustand'
import { api } from '../lib/api'

export interface Freight {
  id:            string
  title:         string
  description?:  string
  vehicleType:   string
  originAddress: string
  destAddress:   string
  distanceKm:    number
  totalPrice:    number
  driverReceives: number
  platformFee:   number
  helperIncluded: boolean
  status:        string
  shipper:       { id: string; name: string; avatarUrl?: string }
  driver?:       { id: string; name: string; phone: string }
  createdAt:     string
}

interface FreightState {
  available:   Freight[]
  myFreights:  Freight[]
  active:      Freight | null
  isLoading:   boolean

  loadAvailable:  () => Promise<void>
  loadMyFreights: () => Promise<void>
  accept:         (id: string) => Promise<void>
  refuse:         (id: string) => Promise<void>
  startDelivery:  (id: string) => Promise<void>
  confirmDelivery:(id: string) => Promise<void>
  cancel:         (id: string, reason?: string) => Promise<void>
}

export const useFreightStore = create<FreightState>((set, get) => ({
  available:  [],
  myFreights: [],
  active:     null,
  isLoading:  false,

  loadAvailable: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/fretes')
      set({ available: data.fretes })
    } finally {
      set({ isLoading: false })
    }
  },

  loadMyFreights: async () => {
    const { data } = await api.get('/motoristas/fretes')
    set({ myFreights: data.fretes })

    // Define o frete ativo (em andamento)
    const active = data.fretes.find(
      (f: Freight) => f.status === 'MATCHED' || f.status === 'IN_TRANSIT'
    )
    set({ active: active ?? null })
  },

  accept: async (id) => {
    await api.post(`/fretes/${id}/aceitar`)
    await get().loadAvailable()
    await get().loadMyFreights()
  },

  refuse: async (id) => {
    await api.post(`/fretes/${id}/recusar`)
    // Remove localmente sem recarregar
    set(state => ({
      available: state.available.filter(f => f.id !== id)
    }))
  },

  startDelivery: async (id) => {
    await api.post(`/fretes/${id}/iniciar`)
    await get().loadMyFreights()
  },

  confirmDelivery: async (id) => {
    await api.post(`/fretes/${id}/entregar`)
    set({ active: null })
    await get().loadMyFreights()
  },

  cancel: async (id, reason) => {
    await api.post(`/fretes/${id}/cancelar`, { reason })
    set({ active: null })
    await get().loadMyFreights()
  }
}))
