// ================================================
// MUVV ROTAS — Login do Painel Admin
// ================================================

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { email, password })

      if (data.user.role !== 'ADMIN') {
        setError('Acesso restrito ao painel administrativo.')
        return
      }

      localStorage.setItem('muvv_admin_token',   data.accessToken)
      localStorage.setItem('muvv_admin_user',    JSON.stringify(data.user))
      localStorage.setItem('muvv_refresh_token', data.refreshToken)

      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.logo}>
          <span style={s.logoText}>MUVV</span>
          <span style={s.logoSub}>Admin</span>
        </div>

        <p style={s.subtitle}>Painel administrativo</p>

        <form onSubmit={handleLogin} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              placeholder="admin@muvvrotas.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Senha</label>
            <input
              style={s.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={s.errorBox}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={s.hint}>
          Credencial de teste:<br />
          admin@muvvrotas.com.br / muvv@admin2026
        </p>

      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    height:          '100vh',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    background:      '#0a1520'
  },
  card: {
    background:   '#0f1923',
    border:       '1px solid #1a2535',
    borderRadius: 16,
    padding:      '40px 36px',
    width:        360
  },
  logo: {
    textAlign:    'center',
    marginBottom: 4
  },
  logoText: {
    fontSize:    32,
    fontWeight:  800,
    color:       '#fff',
    letterSpacing: 4,
    display:     'block'
  },
  logoSub: {
    fontSize:    11,
    color:       '#00a070',
    letterSpacing: 6,
    textTransform: 'uppercase' as const
  },
  subtitle: {
    textAlign:    'center',
    fontSize:     13,
    color:        '#8a9aaa',
    marginBottom: 32,
    marginTop:    8
  },
  form: {
    display:       'flex',
    flexDirection: 'column' as const,
    gap:           16
  },
  field: {
    display:       'flex',
    flexDirection: 'column' as const,
    gap:           6
  },
  label: {
    fontSize:   12,
    fontWeight: 500,
    color:      '#8a9aaa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em'
  },
  input: {
    background:   '#1a2535',
    border:       '1px solid #2a3545',
    borderRadius: 10,
    padding:      '12px 14px',
    fontSize:     14,
    color:        '#fff',
    outline:      'none'
  },
  errorBox: {
    background:   '#2a1515',
    border:       '1px solid #5a2525',
    borderRadius: 8,
    padding:      '10px 14px',
    fontSize:     13,
    color:        '#e08080'
  },
  btn: {
    background:   '#00a070',
    border:       'none',
    borderRadius: 10,
    padding:      '14px',
    fontSize:     15,
    fontWeight:   600,
    color:        '#fff',
    cursor:       'pointer',
    marginTop:    4
  },
  btnDisabled: {
    opacity: 0.6,
    cursor:  'not-allowed'
  },
  hint: {
    marginTop:  24,
    fontSize:   11,
    color:      '#4a5a6a',
    textAlign:  'center' as const,
    lineHeight: 1.6
  }
}
