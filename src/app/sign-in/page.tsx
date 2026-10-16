'use client'

import { useState, type FormEvent } from 'react'
import { signIn, signUp } from '@/lib/auth-client'

function safeNext() {
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export default function SignInPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const creating = mode === 'sign-up'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const name = String(form.get('name') ?? '').trim()
    setPending(true)
    setError('')
    const result = creating ? await signUp.email({ email, password, name }) : await signIn.email({ email, password })
    if (result.error) {
      setPending(false)
      setError(result.error.message ?? 'No se pudo completar la acción')
      return
    }
    const next = safeNext()
    window.location.assign(creating && next === '/' ? '/elegir-mesa' : next)
  }

  const withGoogle = async () => {
    setPending(true)
    setError('')
    const result = await signIn.social({ provider: 'google', callbackURL: safeNext() })
    if (result?.error) {
      setPending(false)
      setError(result.error.message ?? 'No se pudo conectar con Google')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><b>LB</b><span>LUDOBREAK</span></div>
        <h1 id="auth-title">{creating ? 'Creá tu cuenta' : 'Bienvenido de vuelta'}</h1>
        <p>{creating ? 'Armá tu biblioteca de juegos y tu propia mesa.' : 'Entrá para ver tus mesas, tu biblioteca y tus partidas.'}</p>
        <button type="button" className="auth-google" onClick={withGoogle} disabled={pending}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
            <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Continuar con Google
        </button>
        <div className="auth-divider"><span>o con email</span></div>
        <form onSubmit={submit} className="auth-form">
          {creating && (
            <label>Nombre
              <input name="name" type="text" autoComplete="name" required minLength={2} maxLength={40} />
            </label>
          )}
          <label>Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>Contraseña
            <input name="password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} required minLength={8} />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="gold-button" type="submit" disabled={pending}>{pending ? 'Un momento…' : creating ? 'Crear cuenta' : 'Entrar'}</button>
        </form>
        <button type="button" className="auth-switch" onClick={() => { setMode(creating ? 'sign-in' : 'sign-up'); setError('') }}>
          {creating ? 'Ya tengo cuenta' : 'No tengo cuenta, crear una'}
        </button>
      </section>
    </main>
  )
}
