// ================================================
// MUVV ROTAS — Cliente HTTP (web admin)
// ================================================

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// Injeta token em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('muvv_admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redireciona para login se token expirar
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/login'
      if (!isLoginPage) {
        localStorage.removeItem('muvv_admin_token')
        localStorage.removeItem('muvv_admin_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
