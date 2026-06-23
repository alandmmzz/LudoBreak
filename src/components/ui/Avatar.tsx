import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const sizes = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
}

export default function Avatar({
  profile,
  highlight = false,
  size = 'md',
}: {
  profile: Profile
  highlight?: boolean
  size?: keyof typeof sizes
}) {
  const initials = profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return profile.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt={profile.name}
      title={profile.name}
      className={cn(
        sizes[size],
        'rounded-full object-cover border flex-shrink-0',
        highlight ? 'border-brand-400 ring-2 ring-brand-200' : 'border-neutral-200'
      )}
    />
  ) : (
    <div
      title={profile.name}
      className={cn(
        sizes[size],
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0 border',
        highlight
          ? 'bg-brand-100 text-brand-800 border-brand-300'
          : 'bg-neutral-100 text-neutral-600 border-neutral-200'
      )}
    >
      {initials}
    </div>
  )
}
