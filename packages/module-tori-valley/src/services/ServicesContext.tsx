import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createServices, type Services } from './createServices'

const ServicesContext = createContext<Services | undefined>(undefined)

export function ServicesProvider({ children }: { children: ReactNode }) {
  const services = useMemo(() => createServices(), [])
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}

export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useServices must be used within a ServicesProvider')
  return services
}
