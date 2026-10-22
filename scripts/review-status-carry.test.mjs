import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compareReviewedDiff } from './review-status-carry.mjs'

let dir

function git(...args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
}

function write(file, content) {
  writeFileSync(join(dir, file), content)
}

function commit(message) {
  git('add', '-A')
  git('commit', '-q', '-m', message)
  return git('rev-parse', 'HEAD')
}

const lines = (n) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n') + '\n'

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'review-status-carry-'))
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 'test@example.com')
  git('config', 'user.name', 'Test')
  git('config', 'commit.gpgsign', 'false')
  write('a.txt', lines(20))
  commit('base')
  // `origin/main` stands in for the remote base ref the workflow fetches.
  git('update-ref', 'refs/remotes/origin/main', 'main')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const compare = (before, after) =>
  compareReviewedDiff({ cwd: dir, base: 'origin/main', before, after })

function advanceBase(content) {
  git('checkout', '-q', 'main')
  write('a.txt', content)
  commit('base moves')
  git('update-ref', 'refs/remotes/origin/main', 'main')
}

function startFeature() {
  git('checkout', '-q', '-b', 'feature')
  write('a.txt', lines(20).replace('line 10\n', 'line 10 edited\n'))
  return commit('feature')
}

describe('compareReviewedDiff', () => {
  it('returns same for a pure rebase onto a moved base', () => {
    const before = startFeature()
    advanceBase(lines(20).replace('line 2\n', 'line 2 base\n'))
    git('checkout', '-q', 'feature')
    git('rebase', '-q', 'main')
    expect(git('rev-parse', 'HEAD')).not.toBe(before)
    expect(compare(before, git('rev-parse', 'HEAD'))).toBe('same')
  })

  it('returns same when merging the base without conflict, even next to the PR lines', () => {
    const before = startFeature()
    advanceBase(lines(20).replace('line 12\n', 'line 12 base\n'))
    git('checkout', '-q', 'feature')
    git('merge', '-q', '--no-edit', 'main')
    expect(compare(before, git('rev-parse', 'HEAD'))).toBe('same')
  })

  it('returns changed when a real change is added to the diff', () => {
    const before = startFeature()
    write('b.txt', 'new file\n')
    const after = commit('more')
    expect(compare(before, after)).toBe('changed')
  })

  it('returns unavailable when the previous SHA cannot be found', () => {
    const after = startFeature()
    expect(compare('0'.repeat(40), after)).toBe('unavailable')
  })

  it('returns same when both diffs are empty', () => {
    git('checkout', '-q', '-b', 'feature')
    const before = git('rev-parse', 'HEAD')
    git('commit', '-q', '--allow-empty', '-m', 'empty')
    expect(compare(before, git('rev-parse', 'HEAD'))).toBe('same')
  })
})
