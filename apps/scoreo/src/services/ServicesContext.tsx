import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createServices, type Services } from './createServices'

const ServicesContext = createContext<Services | undefined>(undefined)

/**
 * `services` replaces the default localStorage-backed bag: the design catalog
 * hands in-memory repositories seeded with example data (apps/catalog).
 */
export function ServicesProvider({
  children,
  services: injected,
}: {
  children: ReactNode
  services?: Services
}) {
  const services = useMemo(() => injected ?? createServices(), [injected])
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}

export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useServices must be used within a ServicesProvider')
  return services
}
