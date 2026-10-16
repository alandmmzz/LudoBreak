'use client'

import '../group-settings.css'
import { useState, type FormEvent } from 'react'
import useSWR, { mutate } from 'swr'
import { Check, Crown, Plus, Users } from 'lucide-react'
import { SiteChrome } from '@/components/site-chrome'
import { useMe } from '@/lib/use-me'

type MyTable = { id: number; name: string; owner: string | null; members: number; isOwner: boolean; isActive: boolean }
type AvailableTable = { id: number; name: string; owner: string | null; members: number }

const fetchTables = async <T,>(url: string): Promise<T[]> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudieron cargar las mesas')
  return (await response.json()).tables
}

const jsonRequest = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const playersLabel = (count: number) => `${count} ${count === 1 ? 'jugador' : 'jugadores'}`

export default function MyTablesPage() {
  const { mutate: mutateMe } = useMe()
  const { data: mine, error: mineError, mutate: mutateMine } = useSWR('/api/tables/mine', (url: string) => fetchTables<MyTable>(url))
  const { data: available, mutate: mutateAvailable } = useSWR('/api/tables/available', (url: string) => fetchTables<AvailableTable>(url), { revalidateOnFocus: false })
  const [pendingId, setPendingId] = useState<number | 'new' | null>(null)
  const [message, setMessage] = useState('')

  const refreshAll = async () => {
    await Promise.all([mutateMe(), mutateMine(), mutateAvailable()])
    await mutate((key) => typeof key === 'string' && key.startsWith('/api/') && !['/api/me', '/api/tables/mine', '/api/tables/available'].includes(key))
  }

  const run = async (id: number | 'new', request: () => Promise<Response>, fallback: string) => {
    setPendingId(id)
    setMessage('')
    const response = await request()
    setPendingId(null)
    if (!response.ok) {
      setMessage((await response.json().catch(() => ({}))).error ?? fallback)
      return false
    }
    await refreshAll()
    return true
  }

  const activate = (tableId: number) => run(tableId, () => fetch('/api/me/table', jsonRequest('PUT', { tableId })), 'No se pudo cambiar de mesa')
  const join = (tableId: number) => run(tableId, () => fetch('/api/tables/join', jsonRequest('POST', { tableId })), 'No se pudo unir a la mesa')

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const name = String(new FormData(form).get('name') ?? '').trim()
    if (!name) return
    if (await run('new', () => fetch('/api/tables', jsonRequest('POST', { name })), 'No se pudo crear la mesa')) form.reset()
  }

  return (
    <main className="group-settings-page">
      <SiteChrome current="MIS MESAS" active="tables" />

      <section className="group-settings-shell">
        <div className="settings-intro">
          <span className="settings-kicker">Tu cuenta</span>
          <h1>Mis mesas</h1>
          <p>Las mesas a las que pertenecés. Cambiá de mesa, sumate a otra o creá una nueva.</p>
        </div>

        {mineError && <p className="auth-error" role="alert">{mineError.message}</p>}
        {message && <p className="auth-error" role="alert">{message}</p>}

        <div className="settings-grid">
          <section className="settings-card" aria-labelledby="mine-title">
            <div className="settings-card-heading"><div><span className="settings-eyebrow">Pertenecés a</span><h2 id="mine-title">Tus mesas <small>{mine?.length ?? 0}</small></h2></div><Users aria-hidden="true" /></div>
            <div className="picker-list" role="list" aria-label="Tus mesas">
              {!mine && !mineError && <p className="picker-empty">Cargando tus mesas…</p>}
              {mine?.map((table) => (
                <div className="picker-row" role="listitem" key={table.id}>
                  <div>
                    <strong>{table.name}</strong>
                    <span>
                      <Users aria-hidden="true" /> {playersLabel(table.members)}
                      {table.isOwner && <><Crown aria-hidden="true" /> Admin</>}
                    </span>
                  </div>
                  {table.isActive
                    ? <span className="you-label"><Check aria-hidden="true" /> Activa</span>
                    : <button type="button" className="picker-join" onClick={() => activate(table.id)} disabled={pendingId !== null}>{pendingId === table.id ? 'Cambiando…' : 'Usar esta mesa'}</button>}
                </div>
              ))}
            </div>
          </section>

          <section className="settings-card" aria-labelledby="new-title">
            <div className="settings-card-heading"><div><span className="settings-eyebrow">Nueva</span><h2 id="new-title">Agregar una mesa</h2></div><Plus aria-hidden="true" /></div>
            <form onSubmit={create}>
              <label className="settings-label" htmlFor="new-table">Crear una mesa propia</label>
              <input id="new-table" name="name" required maxLength={60} placeholder="Ej: Jueves de juegos" />
              <button className="gold-button" type="submit" disabled={pendingId !== null}>{pendingId === 'new' ? 'Creando…' : 'Crear mesa'}</button>
            </form>

            <span className="settings-label">O sumate a una existente</span>
            <div className="picker-list" role="list" aria-label="Mesas disponibles">
              {available?.length === 0 && <p className="picker-empty">No hay otras mesas para unirse por ahora.</p>}
              {available?.map((table) => (
                <div className="picker-row" role="listitem" key={table.id}>
                  <div>
                    <strong>{table.name}</strong>
                    <span><Users aria-hidden="true" /> {playersLabel(table.members)}{table.owner ? ` · admin ${table.owner}` : ''}</span>
                  </div>
                  <button type="button" className="picker-join" onClick={() => join(table.id)} disabled={pendingId !== null}>{pendingId === table.id ? 'Uniéndote…' : 'Unirme'}</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
