import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../api'
import { DEFAULT_SITE_TAGLINE, DEFAULT_SITE_TITLE } from '../constants/branding'

interface BrandingContextValue {
  logoUrl: string | null
  title: string
  tagline: string
  loading: boolean
  refreshBranding: () => Promise<void>
  uploadLogo: (file: File) => Promise<void>
  removeLogo: () => Promise<void>
  updateBranding: (title: string, tagline: string) => Promise<void>
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [title, setTitle] = useState(DEFAULT_SITE_TITLE)
  const [tagline, setTagline] = useState(DEFAULT_SITE_TAGLINE)
  const [loading, setLoading] = useState(true)

  const applyBranding = useCallback((branding: api.Branding) => {
    setLogoUrl(branding.logoUrl)
    setTitle(branding.title)
    setTagline(branding.tagline)
    document.title = branding.title
  }, [])

  const refreshBranding = useCallback(async () => {
    const branding = await api.fetchBranding()
    applyBranding(branding)
  }, [applyBranding])

  useEffect(() => {
    refreshBranding().finally(() => setLoading(false))
  }, [refreshBranding])

  const uploadLogo = useCallback(
    async (file: File) => {
      const url = await api.uploadLogo(file)
      setLogoUrl(url)
    },
    [],
  )

  const removeLogo = useCallback(async () => {
    await api.removeLogo()
    setLogoUrl(null)
  }, [])

  const updateBranding = useCallback(
    async (nextTitle: string, nextTagline: string) => {
      const branding = await api.updateBranding(nextTitle, nextTagline)
      applyBranding(branding)
    },
    [applyBranding],
  )

  const value = useMemo(
    () => ({
      logoUrl,
      title,
      tagline,
      loading,
      refreshBranding,
      uploadLogo,
      removeLogo,
      updateBranding,
    }),
    [logoUrl, title, tagline, loading, refreshBranding, uploadLogo, removeLogo, updateBranding],
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider')
  return ctx
}
