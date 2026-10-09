'use client'

import { useState } from 'react'

export type AdminGame = {
  id: number
  title: string
  genre: string
  time: string
  accent: string
  cover: string
  backdrop: string
  rules: string
}

const emptyGame: Omit<AdminGame, 'id'> = {
  title: '', genre: '', time: '', accent: 'gold', cover: '', backdrop: '', rules: '',
}

export function AdminGamePanel({ games, onClose, onSaved }: { games: AdminGame[]; onClose: () => void; onSaved: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(games[0]?.id ?? null)
  const selected = games.find((game) => game.id === selectedId)
  const [draft, setDraft] = useState<Omit<AdminGame, 'id'>>(selected ? { ...selected } : emptyGame)
  const [isNew, setIsNew] = useState(!selected)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'cover' | 'backdrop' | 'rules' | null>(null)
  const [bggQuery, setBggQuery] = useState('')
  const [bggResults, setBggResults] = useState<{ bggId: string; name: string; year: string }[]>([])
  const [bggLoading, setBggLoading] = useState(false)
  const [bggStatus, setBggStatus] = useState('')

  const uploadImage = async (field: 'cover' | 'backdrop' | 'rules', file?: File) => {
    if (!file) return
    setUploading(field)
    setStatus('')
    const formData = new FormData()
    formData.append('file', file)
    if (field === 'rules') formData.append('kind', 'rules')
    const response = await fetch('/api/upload', { method: 'POST', body: formData })
    const body = await response.json()
    setUploading(null)
    if (!response.ok) return setStatus(body.error || 'No se pudo subir el archivo')
    setDraft((current) => ({ ...current, [field]: body.url }))
    setStatus(field === 'rules' ? 'PDF cargado. Guarda los cambios para aplicarlo.' : 'Imagen cargada. Guarda los cambios para aplicarla.')
  }

  const imageField = (field: 'cover' | 'backdrop', label: string, placeholder: string) => <label>{label}<input value={draft[field]} onChange={(event) => update(field, event.target.value)} placeholder={placeholder} /><span className="admin-upload-row"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadImage(field, event.target.files?.[0])} disabled={uploading !== null} /><small>{uploading === field ? 'SUBIENDO...' : 'JPG, PNG o WebP · máx. 8 MB'}</small></span>{draft[field] && <span className={`admin-image-preview ${field === 'cover' ? 'cover-preview' : 'backdrop-preview'}`}><img src={draft[field]} alt={`Vista previa de ${label.toLowerCase()}`} onError={(event) => { event.currentTarget.style.display = 'none' }} /></span>}</label>

  const choose = (game: AdminGame) => {
    setSelectedId(game.id)
    setDraft({ ...game })
    setIsNew(false)
    setStatus('')
  }
  const update = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  const searchBgg = async () => {
    if (bggQuery.trim().length < 2) return
    setBggLoading(true); setBggStatus('Buscando en BoardGameGeek...')
    const response = await fetch(`/api/bgg-search?q=${encodeURIComponent(bggQuery.trim())}`)
    const body = await response.json()
    setBggLoading(false); setBggResults(response.ok ? body : []); setBggStatus(response.ok ? '' : body.error || 'No se pudo buscar')
  }
  const importBgg = async (bggId: string) => {
    setBggLoading(true); setBggStatus('Cargando datos del juego...')
    const response = await fetch('/api/bgg-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bggId }) })
    const body = await response.json(); setBggLoading(false)
    if (!response.ok) return setBggStatus(body.error || 'No se pudo importar')
    setDraft((current) => ({ ...current, ...body })); setBggResults([]); setBggStatus('Datos importados. Revisá el color y guardá la caja.')
  }
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
      <div className="admin-form"><div className="admin-form-title">{isNew ? 'Nueva caja' : 'Editar caja'}</div><label>Nombre<input value={draft.title} onChange={(event) => { update('title', event.target.value); setBggQuery(event.target.value) }} placeholder="Nombre del juego" /></label>{isNew && <div className="bgg-import"><div className="bgg-search-row"><input value={bggQuery} onChange={(event) => setBggQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); searchBgg() } }} placeholder="Nombre, link o ID de BoardGameGeek" /><button type="button" onClick={searchBgg} disabled={bggLoading}>{bggLoading ? 'BUSCANDO...' : 'BUSCAR'}</button></div>{bggStatus && <small>{bggStatus}</small>}{bggResults.length > 0 && <div className="bgg-results">{bggResults.map((result) => <button type="button" key={result.bggId} onClick={() => importBgg(result.bggId)}><b>{result.name}</b><span>{result.year || 'Sin año'}</span></button>)}</div>}</div>}<div className="admin-form-grid"><label>Categoría<input value={draft.genre} onChange={(event) => update('genre', event.target.value)} placeholder="Hidden roles · 5–10 players" /></label><label>Duración<input value={draft.time} onChange={(event) => update('time', event.target.value)} placeholder="30–45 min" /></label></div><div className="admin-form-grid"><label>Color<select value={['gold', 'orange', 'red', 'teal'].includes(draft.accent) ? draft.accent : 'custom'} onChange={(event) => update('accent', event.target.value === 'custom' ? '#b58b5b' : event.target.value)}><option value="gold">Gold</option><option value="orange">Orange</option><option value="red">Red</option><option value="teal">Teal</option><option value="custom">Personalizado</option></select><span className="admin-color-row"><input className="admin-color-picker" type="color" value={draft.accent.startsWith('#') ? draft.accent : '#b58b5b'} onChange={(event) => update('accent', event.target.value)} /><code>{draft.accent}</code></span></label></div>{imageField('cover', 'Imagen de caja', '/games/mi-juego.png')}{imageField('backdrop', 'Imagen de fondo', 'https://...')}<label>Reglas (PDF)<span className="admin-upload-row"><input type="file" accept="application/pdf" onChange={(event) => uploadImage('rules', event.target.files?.[0])} disabled={uploading !== null} /><small>{uploading === 'rules' ? 'SUBIENDO...' : 'PDF · máx. 20 MB'}</small></span>{draft.rules ? <span className="admin-rules-current"><a href={draft.rules} target="_blank" rel="noopener noreferrer">Ver PDF actual</a><button type="button" onClick={() => update('rules', '')}>Quitar</button></span> : <small>Este juego todavía no tiene reglas.</small>}</label><div className="admin-actions"><button className="admin-save" onClick={save} disabled={saving}>{saving ? 'GUARDANDO...' : isNew ? 'CREAR CAJA' : 'GUARDAR CAMBIOS'}</button>{!isNew && <button className="admin-delete" onClick={remove}>ELIMINAR</button>}</div>{status && <p className="admin-status">{status}</p>}</div>
    </div>
  </div>
}
