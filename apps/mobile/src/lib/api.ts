// ================================================
// MUVV ROTAS — Cliente HTTP (mobile)
// ================================================

import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// Interceptor: injeta token em toda requisição
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor: trata erro 401 e faz refresh automático
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token')
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        await SecureStore.setItemAsync('access_token', data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        await SecureStore.deleteItemAsync('access_token')
        await SecureStore.deleteItemAsync('refresh_token')
      }
    }

    return Promise.reject(error)
  }
)
