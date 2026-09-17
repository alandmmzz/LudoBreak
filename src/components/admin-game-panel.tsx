'use client'

import { useState } from 'react'

export type AdminGame = {
  id: number
  title: string
  genre: string
  time: string
  votes: number
  accent: string
  cover: string
  backdrop: string
}

const emptyGame: Omit<AdminGame, 'id'> = {
  title: '', genre: '', time: '', votes: 0, accent: 'gold', cover: '', backdrop: '',
}

export function AdminGamePanel({ games, onClose, onSaved }: { games: AdminGame[]; onClose: () => void; onSaved: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(games[0]?.id ?? null)
  const selected = games.find((game) => game.id === selectedId)
  const [draft, setDraft] = useState<Omit<AdminGame, 'id'>>(selected ? { ...selected } : emptyGame)
  const [isNew, setIsNew] = useState(!selected)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'cover' | 'backdrop' | null>(null)

  const uploadImage = async (field: 'cover' | 'backdrop', file?: File) => {
    if (!file) return
    setUploading(field)
    setStatus('')
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/upload', { method: 'POST', body: formData })
    const body = await response.json()
    setUploading(null)
    if (!response.ok) return setStatus(body.error || 'No se pudo subir la imagen')
    setDraft((current) => ({ ...current, [field]: body.url }))
    setStatus('Imagen cargada. Guarda los cambios para aplicarla.')
  }

  const imageField = (field: 'cover' | 'backdrop', label: string, placeholder: string) => <label>{label}<input value={draft[field]} onChange={(event) => update(field, event.target.value)} placeholder={placeholder} /><span className="admin-upload-row"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadImage(field, event.target.files?.[0])} disabled={uploading !== null} /><small>{uploading === field ? 'SUBIENDO...' : 'JPG, PNG o WebP · máx. 8 MB'}</small></span></label>

  const choose = (game: AdminGame) => {
    setSelectedId(game.id)
    setDraft({ ...game })
    setIsNew(false)
    setStatus('')
  }
  const update = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: key === 'votes' ? Number(value) : value }))
  const save = async () => {
    setSaving(true)
    setStatus('')
    const response = await fetch('/api/games', { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isNew ? draft : { ...draft, id: selectedId }) })
    const body = await response.json()
    setSaving(false)
    if (!response.ok) return setStatus(body.error || 'No se pudo guardar')
    setStatus('Guardado correctamente')
    onSaved()
    if (isNew) { setSelectedId(body.id); setIsNew(false) }
  }
  const remove = async () => {
    if (!selectedId || !window.confirm('¿Eliminar este juego?')) return
    await fetch('/api/games', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) })
    onSaved()
    setSelectedId(null)
    setDraft(emptyGame)
    setIsNew(true)
  }

  return <div className="admin-panel" role="dialog" aria-label="Administrar juegos">
    <div className="admin-panel-head"><div><span className="admin-eyebrow">CONTROL ROOM</span><h2>Juegos &amp; cajas</h2></div><button className="admin-close" onClick={onClose} aria-label="Cerrar administración">×</button></div>
    <div className="admin-layout">
      <div className="admin-list"><div className="admin-list-label">CATÁLOGO · {games.length}</div>{games.map((game) => <button key={game.id} className={game.id === selectedId && !isNew ? 'admin-game-row active' : 'admin-game-row'} onClick={() => choose(game)}><span className="admin-swatch" style={{ background: `var(--${game.accent}, #b58b5b)` }} /><span><b>{game.title}</b><small>{game.genre}</small></span></button>)}<button className={isNew ? 'admin-new active' : 'admin-new'} onClick={() => { setIsNew(true); setSelectedId(null); setDraft(emptyGame) }}>+ Agregar juego</button></div>
      <div className="admin-form"><div className="admin-form-title">{isNew ? 'Nueva caja' : 'Editar caja'}</div><label>Nombre<input value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Nombre del juego" /></label><div className="admin-form-grid"><label>Categoría<input value={draft.genre} onChange={(event) => update('genre', event.target.value)} placeholder="Hidden roles · 5–10 players" /></label><label>Duración<input value={draft.time} onChange={(event) => update('time', event.target.value)} placeholder="30–45 min" /></label></div><div className="admin-form-grid"><label>Color<select value={draft.accent} onChange={(event) => update('accent', event.target.value)}><option value="gold">Gold</option><option value="orange">Orange</option><option value="red">Red</option><option value="teal">Teal</option></select></label><label>Votos<input type="number" min="0" value={draft.votes} onChange={(event) => update('votes', event.target.value)} /></label></div>{imageField('cover', 'Imagen de caja', '/games/mi-juego.png')}{imageField('backdrop', 'Imagen de fondo', 'https://...')}<div className="admin-actions"><button className="admin-save" onClick={save} disabled={saving}>{saving ? 'GUARDANDO...' : isNew ? 'CREAR CAJA' : 'GUARDAR CAMBIOS'}</button>{!isNew && <button className="admin-delete" onClick={remove}>ELIMINAR</button>}</div>{status && <p className="admin-status">{status}</p>}</div>
    </div>
  </div>
}
