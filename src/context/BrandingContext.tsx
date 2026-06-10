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

interface BrandingContextValue {
  logoUrl: string | null
  loading: boolean
  refreshLogo: () => Promise<void>
  uploadLogo: (file: File) => Promise<void>
  removeLogo: () => Promise<void>
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshLogo = useCallback(async () => {
    const url = await api.fetchLogo()
    setLogoUrl(url)
  }, [])

  useEffect(() => {
    refreshLogo().finally(() => setLoading(false))
  }, [refreshLogo])

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

  const value = useMemo(
    () => ({ logoUrl, loading, refreshLogo, uploadLogo, removeLogo }),
    [logoUrl, loading, refreshLogo, uploadLogo, removeLogo],
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider')
  return ctx
}
