import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListContainer } from './ListContainer'

describe('ListContainer', () => {
  it('renders children with the base class', () => {
    const { container } = render(
      <ListContainer>
        <span>item</span>
      </ListContainer>,
    )
    expect(screen.getByText('item')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('list-container')
  })

  it('appends an extra className when provided', () => {
    const { container } = render(<ListContainer className="list-container--spaced">content</ListContainer>)
    expect(container.firstChild).toHaveClass('list-container', 'list-container--spaced')
  })
})
