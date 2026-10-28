import type { CSSProperties } from 'react'

export const backdropClass = (url?: string | null) => (url ? 'has-backdrop' : '')

export const backdropStyle = (url?: string | null): CSSProperties | undefined =>
  url ? ({ '--card-backdrop': `url(${JSON.stringify(url)})` } as CSSProperties) : undefined
