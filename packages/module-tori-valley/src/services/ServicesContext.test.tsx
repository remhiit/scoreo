import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ServicesProvider, useServices } from './ServicesContext'

function Probe() {
  const services = useServices()
  return <div>{services.playerRepository ? 'services-available' : 'services-unavailable'}</div>
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

    expect(screen.getByText('services-available')).toBeInTheDocument()
  })
})
