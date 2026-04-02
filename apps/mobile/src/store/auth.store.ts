// ================================================
// MUVV ROTAS — Store de autenticação (Zustand)
// ================================================

import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api } from '../lib/api'

interface User {
  id:       string
  name:     string
  email:    string
  phone:    string
  role:     'DRIVER' | 'SHIPPER' | 'ADMIN'
  status:   string
  avatarUrl?: string
}

interface AuthState {
  user:          User | null
  isLoading:     boolean
  isAuthenticated: boolean

  login:    (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout:   () => Promise<void>
  loadUser: () => Promise<void>
}

interface RegisterData {
  name:     string
  email:    string
  phone:    string
  password: string
  role:     'DRIVER' | 'SHIPPER'
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  isLoading:       true,
  isAuthenticated: false,

  // ---- LOGIN ----
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    await SecureStore.setItemAsync('access_token',  data.accessToken)
    await SecureStore.setItemAsync('refresh_token', data.refreshToken)
    set({ user: data.user, isAuthenticated: true })
  },

  // ---- CADASTRO ----
  register: async (registerData) => {
    const { data } = await api.post('/auth/cadastro', registerData)
    await SecureStore.setItemAsync('access_token', data.accessToken)
    set({ user: data.user, isAuthenticated: true })
  },

  // ---- LOGOUT ----
  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync('refresh_token')
    try { await api.delete('/auth/logout', { data: { refreshToken } }) } catch {}
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  // ---- CARREGA SESSÃO SALVA ----
  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token')
      if (!token) {
        set({ isLoading: false })
        return
      }
      // Valida o token fazendo uma requisição
      const { data } = await api.get('/motoristas/perfil').catch(() =>
        api.get('/auth/me')
      )
      set({ user: data.driver ?? data.user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  }
}))
