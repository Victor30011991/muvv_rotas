// ================================================
// MUVV ROTAS — Auth do painel admin
// ================================================

export function getToken(): string | null {
  return localStorage.getItem('muvv_admin_token')
}

export function getUser(): any | null {
  const raw = localStorage.getItem('muvv_admin_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function logout(): void {
  localStorage.removeItem('muvv_admin_token')
  localStorage.removeItem('muvv_admin_user')
  localStorage.removeItem('muvv_refresh_token')
  window.location.href = '/login'
}
