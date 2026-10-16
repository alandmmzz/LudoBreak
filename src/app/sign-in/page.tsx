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
    window.location.assign(safeNext())
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><b>LB</b><span>LUDOBREAK</span></div>
        <h1 id="auth-title">{creating ? 'Creá tu cuenta' : 'Bienvenido de vuelta'}</h1>
        <p>{creating ? 'Armá tu biblioteca de juegos y tu propia mesa.' : 'Entrá para ver tus mesas, tu biblioteca y tus partidas.'}</p>
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
