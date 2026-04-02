import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard      from './pages/Dashboard'
import Motoristas     from './pages/Motoristas'
import Fretes         from './pages/Fretes'
import Financeiro     from './pages/Financeiro'
import Precos         from './pages/Precos'
import Login          from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import { logout, getUser } from './lib/auth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

function AppLayout() {
  return (
    <div style={s.shell}>
      <Sidebar />
      <main style={s.main}>
        <Routes>
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<Dashboard />} />
          <Route path="/motoristas" element={<Motoristas />} />
          <Route path="/fretes"     element={<Fretes />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/precos"     element={<Precos />} />
        </Routes>
      </main>
    </div>
  )
}

function Sidebar() {
  const user  = getUser()
  const links = [
    { to: '/dashboard',  label: 'Dashboard',  icon: '📊' },
    { to: '/motoristas', label: 'Motoristas', icon: '🚗' },
    { to: '/fretes',     label: 'Fretes',     icon: '📦' },
    { to: '/financeiro', label: 'Financeiro', icon: '💰' },
    { to: '/precos',     label: 'Preços',     icon: '🏷️' }
  ]

  return (
    <aside style={s.sidebar}>
      <div style={s.logo}>
        <span style={s.logoTxt}>MUVV</span>
        <span style={s.logoSub}>Admin</span>
      </div>
      <nav>
        {links.map(link => (
          <NavLink key={link.to} to={link.to}
            style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navLinkActive : {}) })}
          >
            <span style={s.navIcon}>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={s.sidebarFooter}>
        {user && <p style={s.footerUser}>{user.name}</p>}
        <button style={s.logoutBtn} onClick={logout}>Sair</button>
        <p style={s.footerTxt}>Muvv Rotas v1.0 · Parnaíba — PI</p>
      </div>
    </aside>
  )
}

const s: Record<string, React.CSSProperties> = {
  shell:   { display: 'flex', height: '100vh', background: '#0f1923', overflow: 'hidden' },
  sidebar: { width: 220, background: '#0a1520', borderRight: '1px solid #1a2535', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 },
  logo:    { padding: '0 20px 32px', borderBottom: '1px solid #1a2535', marginBottom: 8 },
  logoTxt: { fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: 3, display: 'block' },
  logoSub: { fontSize: 11, color: '#00a070', letterSpacing: 6, textTransform: 'uppercase' as const },
  navLink: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', fontSize: 14, color: '#8a9aaa', textDecoration: 'none', borderRadius: '0 8px 8px 0', marginRight: 12 },
  navLinkActive: { color: '#00e0a0', background: '#0d2a20' },
  navIcon: { fontSize: 16 },
  sidebarFooter: { marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid #1a2535' },
  footerUser:    { fontSize: 12, color: '#8a9aaa', margin: '0 0 8px', fontWeight: 500 },
  logoutBtn: { width: '100%', background: '#1a1520', border: '1px solid #3a2535', borderRadius: 8, padding: '8px', color: '#e08080', cursor: 'pointer', fontSize: 12, marginBottom: 8 },
  footerTxt: { fontSize: 11, color: '#4a5a6a', margin: 0 },
  main: { flex: 1, overflowY: 'auto' }
}