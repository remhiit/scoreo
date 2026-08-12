import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n, { LANG_STORAGE_KEY } from '../../i18n/i18n'
import { LanguagePickerDialog } from './LanguagePickerDialog'

describe('LanguagePickerDialog', () => {
  afterEach(() => {
    void i18n.changeLanguage('en')
  })

  it('shows English and French options, with the active language highlighted', () => {
    render(<LanguagePickerDialog onClose={() => {}} />)

    const english = screen.getByText('English').closest('button')
    const french = screen.getByText('French').closest('button')
    expect(english?.className).toContain('theme-chip--active')
    expect(french?.className).not.toContain('theme-chip--active')
  })

  it('switches language and persists the choice to localStorage', async () => {
    render(<LanguagePickerDialog onClose={() => {}} />)

    fireEvent.click(screen.getByText('French'))
    // i18next's `languageChanged` listener (registered in src/i18n/i18n.ts) persists asynchronously.
    await vi.waitFor(() => expect(i18n.language).toBe('fr'))

    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('fr')
  })

  it('calls onClose from the Close button', () => {
    const onClose = vi.fn()
    render(<LanguagePickerDialog onClose={onClose} />)

    fireEvent.click(screen.getByText('Close'))

    expect(onClose).toHaveBeenCalled()
  })

  it('shows a flag next to each language option', () => {
    render(<LanguagePickerDialog onClose={() => {}} />)

    expect(screen.getByText('🇬🇧')).toBeInTheDocument()
    expect(screen.getByText('🇫🇷')).toBeInTheDocument()
  })
})
