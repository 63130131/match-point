interface PlayerAvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'avatar--sm',
  md: 'avatar--md',
  lg: 'avatar--lg',
} as const

export function PlayerAvatar({ name, photoUrl, size = 'md', className = '' }: PlayerAvatarProps) {
  const initial = name.charAt(0).toUpperCase() || '?'

  return (
    <span className={`avatar ${sizes[size]} ${className}`.trim()} aria-hidden>
      {photoUrl ? (
        <img src={photoUrl} alt="" className="avatar__img" />
      ) : (
        <span className="avatar__initial">{initial}</span>
      )}
    </span>
  )
}
