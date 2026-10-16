'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { Plus, Users } from 'lucide-react'
import { signOut } from '@/lib/auth-client'

type AvailableTable = { id: number; name: string; owner: string | null; members: number }

const fetchTables = async (url: string): Promise<AvailableTable[]> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudieron cargar las mesas')
  return (await response.json()).tables
}

export default function ChooseTablePage() {
  const router = useRouter()
  const { data: tables, error: loadError, isLoading } = useSWR('/api/tables/available', fetchTables, { revalidateOnFocus: false })
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<number | 'new' | null>(null)

  const enter = async () => {
    await mutate((key) => typeof key === 'string' && key.startsWith('/api/'))
    router.replace('/')
  }

  const join = async (tableId: number) => {
    setPendingId(tableId)
    setError('')
    const response = await fetch('/api/tables/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableId }) })
    if (!response.ok) {
      setPendingId(null)
      setError((await response.json().catch(() => ({}))).error ?? 'No se pudo unir a la mesa')
      return
    }
    await enter()
  }

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name') ?? '').trim()
    if (!name) return
    setPendingId('new')
    setError('')
    const response = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    if (!response.ok) {
      setPendingId(null)
      setError((await response.json().catch(() => ({}))).error ?? 'No se pudo crear la mesa')
      return
    }
    await enter()
  }

  const logOut = async () => {
    await signOut()
    await mutate(() => true, undefined, { revalidate: false })
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <main className="auth-page">
      <section className="auth-card table-picker" aria-labelledby="picker-title">
        <div className="auth-brand"><b>LB</b><span>LUDOBREAK</span></div>
        <h1 id="picker-title">Elegí tu mesa</h1>
        <p>Unite a una mesa existente para jugar con ese grupo, o creá la tuya.</p>

        <div className="picker-list" role="list" aria-label="Mesas disponibles">
          {isLoading && <p className="picker-empty">Buscando mesas…</p>}
          {loadError && <p className="auth-error" role="alert">{loadError.message}</p>}
          {tables?.length === 0 && <p className="picker-empty">Todavía no hay mesas para unirse. Creá la primera.</p>}
          {tables?.map((table) => (
            <div className="picker-row" role="listitem" key={table.id}>
              <div>
                <strong>{table.name}</strong>
                <span><Users aria-hidden="true" /> {table.members} {table.members === 1 ? 'jugador' : 'jugadores'}{table.owner ? ` · admin ${table.owner}` : ''}</span>
              </div>
              <button type="button" className="picker-join" onClick={() => join(table.id)} disabled={pendingId !== null}>
                {pendingId === table.id ? 'Uniéndote…' : 'Unirme'}
              </button>
            </div>
          ))}
        </div>

        <div className="auth-divider"><span>o creá una nueva</span></div>
        <form onSubmit={create} className="auth-form">
          <label>Nombre de la mesa
            <input name="name" type="text" required maxLength={60} placeholder="Ej: Jueves de juegos" />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="gold-button" type="submit" disabled={pendingId !== null}>
            <Plus aria-hidden="true" /> {pendingId === 'new' ? 'Creando…' : 'Crear mesa'}
          </button>
        </form>
        <button type="button" className="auth-switch" onClick={logOut}>Cerrar sesión</button>
      </section>
    </main>
  )
}
