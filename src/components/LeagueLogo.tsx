import { useBranding } from '../context/BrandingContext'
import { BallIcon } from './Icons'

interface LeagueLogoProps {
  className?: string
}

export function LeagueLogo({ className }: LeagueLogoProps) {
  const { logoUrl } = useBranding()

  if (logoUrl) {
    return <img src={logoUrl} alt="" className={className ?? 'league-logo'} />
  }

  return <BallIcon className={className} />
}
