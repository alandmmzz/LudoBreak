'use client'

import { useEffect, useRef } from 'react'

type VoteReplaceDialogProps = {
  open: boolean
  previousCount: number
  newCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function VoteReplaceDialog({ open, previousCount, newCount, onConfirm, onCancel }: VoteReplaceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const plural = (count: number) => `${count} ${count === 1 ? 'juego' : 'juegos'}`

  return (
    <dialog
      ref={dialogRef}
      className="vote-dialog"
      aria-labelledby="vote-dialog-title"
      aria-describedby="vote-dialog-description"
      onCancel={(event) => { event.preventDefault(); onCancel() }}
      onClick={(event) => { if (event.target === event.currentTarget) onCancel() }}
    >
      <div className="vote-dialog-body">
        <h2 id="vote-dialog-title">¿Reemplazar tu voto?</h2>
        <p id="vote-dialog-description">
          Ya enviaste un voto hoy ({plural(previousCount)}). Si continuás, se reemplaza por esta nueva selección ({plural(newCount)}) y el anterior se borra.
        </p>
        <div className="vote-dialog-actions">
          <button type="button" className="vote-dialog-cancel" onClick={onCancel}>Cancelar</button>
          <button type="button" className="vote-dialog-confirm" onClick={onConfirm} autoFocus>Reemplazar voto</button>
        </div>
      </div>
    </dialog>
  )
}
