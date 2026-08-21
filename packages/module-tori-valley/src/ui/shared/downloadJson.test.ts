import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadJson } from './downloadJson'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('downloadJson', () => {
  it('triggers a download of the pretty-printed JSON and cleans up after itself', () => {
    // jsdom's Blob has no readable body, so capture what was handed to it.
    const blobs: { parts: string[]; type: string }[] = []
    class FakeBlob {
      constructor(parts: string[], options: { type: string }) {
        blobs.push({ parts, type: options.type })
      }
    }
    vi.stubGlobal('Blob', FakeBlob)
    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this)
    })

    downloadJson('export.json', { a: 1 })

    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('export.json')
    expect(clicked[0].href).toContain('blob:fake')
    expect(blobs[0].parts).toEqual(['{\n  "a": 1\n}'])
    expect(blobs[0].type).toBe('application/json')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')
    expect(document.querySelector('a')).toBeNull()
  })
})
