import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InMemoryCloudSyncRepository } from '../infrastructure/testing/inMemoryCloudSyncRepository'
import { createServices } from './createServices'
import { ServicesProvider, useServices } from './ServicesContext'

function Probe() {
  const services = useServices()
  return <div>{services.cloudSyncRepository ? 'sync-available' : 'sync-unavailable'}</div>
}

describe('ServicesContext', () => {
  it('throws when useServices is called outside a ServicesProvider', () => {
    expect(() => render(<Probe />)).toThrow('useServices must be used within a ServicesProvider')
  })

  it('provides services to descendants', () => {
    render(
      <ServicesProvider>
        <Probe />
      </ServicesProvider>,
    )

    expect(screen.getByText('sync-unavailable')).toBeInTheDocument()
  })

  it('provides the services it is handed instead of the default ones', () => {
    const services = createServices({ cloudSyncRepository: new InMemoryCloudSyncRepository() })
    render(
      <ServicesProvider services={services}>
        <Probe />
      </ServicesProvider>,
    )

    expect(screen.getByText('sync-available')).toBeInTheDocument()
  })
})
