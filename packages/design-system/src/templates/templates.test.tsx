import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImmersiveTemplate, ScreenTemplate } from './ScreenTemplate'

describe('ScreenTemplate', () => {
  it('reserves room for the action bar only when there is one', () => {
    const { rerender } = render(<ScreenTemplate header={<header />}>content</ScreenTemplate>)
    expect(screen.getByRole('main')).not.toHaveClass('sc-screen--with-bar')
    rerender(
      <ScreenTemplate header={<header />} actionBar={<div />}>
        content
      </ScreenTemplate>,
    )
    expect(screen.getByRole('main')).toHaveClass('sc-screen--with-bar')
  })
})

describe('ImmersiveTemplate', () => {
  it('always offers the way out', () => {
    const onExit = vi.fn()
    render(
      <ImmersiveTemplate title="Skyjo" exit={{ label: 'Back to Scoreo', onClick: onExit }}>
        module
      </ImmersiveTemplate>,
    )
    expect(screen.getByRole('banner')).toHaveTextContent('Skyjo')
    fireEvent.click(screen.getByRole('button', { name: 'Back to Scoreo' }))
    expect(onExit).toHaveBeenCalledOnce()
  })
})
