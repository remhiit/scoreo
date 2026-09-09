import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkEnabledLabelAllowed, requiredControls } from './risk-controls.mjs'

describe('requiredControls', () => {
  describe('contrôles par niveau', () => {
    it.each(['observe', 'apply', undefined])(
      'risque "high" impose la revue humaine et interdit automation:enabled, quel que soit activationMode=%s',
      (activationMode) => {
        const result = requiredControls({ riskLevel: 'high', activationMode })
        expect(result.requiresHumanReview).toBe(true)
        expect(result.forbidsEnabledLabel).toBe(true)
        expect(result.controls).toContain('human-review-mandatory')
        expect(result.controls).toContain('no-automation-enabled')
      },
    )

    it('risque "medium" recommande la revue humaine et interdit aussi automation:enabled', () => {
      const result = requiredControls({ riskLevel: 'medium', activationMode: 'apply' })
      expect(result.requiresHumanReview).toBe(true)
      expect(result.forbidsEnabledLabel).toBe(true)
    })

    it('risque "low" ne demande que des contrôles standards', () => {
      const result = requiredControls({ riskLevel: 'low', activationMode: 'apply' })
      expect(result.requiresHumanReview).toBe(false)
      expect(result.forbidsEnabledLabel).toBe(false)
      expect(result.controls).toEqual(['standard-review'])
    })
  })

  describe('risque illisible', () => {
    it.each([undefined, null, '', 'inconnu', 'Élevé'])('traite %s comme "high"', (riskLevel) => {
      const result = requiredControls({ riskLevel })
      expect(result.riskLevel).toBe('high')
      expect(result.forbidsEnabledLabel).toBe(true)
      expect(result.reasons.join(' ')).toContain('illisible')
    })

    it('ne confond pas un "high" réellement déclaré avec un repli illisible', () => {
      const result = requiredControls({ riskLevel: 'high' })
      expect(result.reasons.join(' ')).not.toContain('illisible')
    })
  })

  describe('indépendance au modèle', () => {
    it('ignore tout champ étranger (ex. le modèle de sous-agent retenu) sans changer le résultat', () => {
      const withModelA = requiredControls({ riskLevel: 'high', activationMode: 'apply', model: 'sonnet' })
      const withModelB = requiredControls({ riskLevel: 'high', activationMode: 'apply', model: 'haiku' })
      expect(withModelA).toEqual(withModelB)
    })

    it('produit le même résultat pour deux appels identiques', () => {
      expect(requiredControls({ riskLevel: 'low', activationMode: 'observe' })).toEqual(
        requiredControls({ riskLevel: 'low', activationMode: 'observe' }),
      )
    })
  })

  describe('refus', () => {
    it('rejette un mode d\'activation inconnu', () => {
      expect(() => requiredControls({ riskLevel: 'low', activationMode: 'sometimes' })).toThrow(
        /mode d'activation inconnu "sometimes"/,
      )
    })
  })
})

describe('checkEnabledLabelAllowed', () => {
  it('autorise quand automation:enabled est absent, quel que soit le risque', () => {
    const result = checkEnabledLabelAllowed({ labels: ['P1'], riskLevel: 'high', issueNumber: 479 })
    expect(result.allowed).toBe(true)
  })

  it('refuse automation:enabled sur une issue liée à risque "high", en nommant l\'issue', () => {
    const result = checkEnabledLabelAllowed({
      labels: ['automation:enabled'],
      riskLevel: 'high',
      issueNumber: 479,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('#479')
    expect(result.reason).toContain('automation:enabled')
    expect(result.reason).toContain('high')
  })

  it('refuse automation:enabled même posé à la main, sur un risque illisible', () => {
    const result = checkEnabledLabelAllowed({ labels: ['automation:enabled'], riskLevel: undefined, issueNumber: 12 })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('#12')
  })

  it('autorise automation:enabled sur une issue à risque "low"', () => {
    const result = checkEnabledLabelAllowed({ labels: ['automation:enabled'], riskLevel: 'low', issueNumber: 5 })
    expect(result.allowed).toBe(true)
    expect(result.reason).toContain('#5')
  })
})

describe('entry-point guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // Même précédent que close-linked-issues.test.mjs (#161) : GITHUB_EVENT_PATH
  // est posé à chaque étape de chaque job Actions, y compris `pnpm test` — un
  // garde régressé lancerait main() ici même, observable via un appel fetch.
  it('ne lance jamais main() à l\'import, même quand GITHUB_EVENT_PATH est posé', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'risk-controls-'))
    const eventPath = join(dir, 'event.json')
    writeFileSync(
      eventPath,
      JSON.stringify({ pull_request: { number: 1, body: 'Closes #2', labels: [{ name: 'automation:enabled' }] } }),
    )
    vi.stubEnv('GITHUB_EVENT_PATH', eventPath)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })

    try {
      vi.resetModules()
      await import('./risk-controls.mjs')
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
