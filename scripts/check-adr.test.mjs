import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INDEX_END, INDEX_START, parseFrontMatter, run } from './check-adr.mjs'

function adr({
  title = 'A decision',
  decision = 'We decide.',
  status = 'Accepted',
  date,
  extra = '',
}) {
  const lines = ['---']
  if (title !== null) lines.push(`title: ${title}`)
  if (decision !== null) lines.push(`decision: ${decision}`)
  if (status !== null) lines.push(`status: ${status}`)
  if (date !== null) lines.push(`date: ${date}`)
  if (extra) lines.push(extra)
  lines.push('---', '', '## Context', '', '## Decision', '', '## Consequences', '')
  return lines.join('\n')
}

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'check-adr-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function write(files) {
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content)
}

/** Writes the ADRs, then a README whose index is regenerated from them. */
function writeWithIndex(files) {
  write({ ...files, 'README.md': `# ADR\n\n${INDEX_START}\n${INDEX_END}\n` })
  run(dir, { write: true })
}

const two = () => ({
  '0001-first.md': adr({ title: 'First', date: '2026-01-01' }),
  '0002-second.md': adr({ title: 'Second', date: '2026-01-02' }),
})

describe('parseFrontMatter', () => {
  it('reads key: value pairs verbatim, keeping a # inside a value', () => {
    const fields = parseFrontMatter(
      '---\ntitle: "Quoted"\nsources: commit abc1234, issue #642\n---\nbody',
    )
    expect(fields).toEqual({ title: 'Quoted', sources: 'commit abc1234, issue #642' })
  })

  it('returns null without a header', () => {
    expect(parseFrontMatter('# Title\n')).toBeNull()
  })
})

describe('run', () => {
  it('passes on a valid folder', () => {
    writeWithIndex(two())
    expect(run(dir)).toEqual([])
  })

  it('regenerates the index with --write', () => {
    writeWithIndex(two())
    const readme = readFileSync(join(dir, 'README.md'), 'utf-8')
    expect(readme).toContain('| [ADR-0001](0001-first.md) | First | Accepted | 2026-01-01 |')
    expect(readme).toContain('| [ADR-0002](0002-second.md) | Second | Accepted | 2026-01-02 |')
    expect(readme.startsWith('# ADR\n\n')).toBe(true)
  })

  it('fails when the index differs from the files', () => {
    writeWithIndex(two())
    write({ '0003-third.md': adr({ title: 'Third', date: '2026-01-03' }) })
    expect(run(dir)).toEqual([expect.stringContaining('the index differs from the ADR files')])
  })

  it('fails when the index markers are missing', () => {
    write({ ...two(), 'README.md': '# ADR\n' })
    expect(run(dir)).toEqual([expect.stringContaining('index markers')])
  })

  it('fails when a number is missing', () => {
    writeWithIndex({ ...two(), '0004-fourth.md': adr({ date: '2026-01-04' }) })
    expect(run(dir)).toContainEqual(expect.stringContaining('ADR-0003 is missing'))
  })

  it('fails when a number is used twice', () => {
    writeWithIndex({ ...two(), '0002-other.md': adr({ date: '2026-01-02' }) })
    expect(run(dir)).toContainEqual(expect.stringContaining('ADR-0002 is used by several files'))
  })

  it('fails when dates decrease in number order', () => {
    writeWithIndex({
      '0001-first.md': adr({ date: '2026-02-01' }),
      '0002-second.md': adr({ date: '2026-01-01' }),
    })
    expect(run(dir)).toEqual([
      expect.stringContaining('0002-second.md: date 2026-01-01 is earlier'),
    ])
  })

  it.each(['title', 'decision', 'status', 'date'])(
    'fails when the required field %s is missing',
    (field) => {
      writeWithIndex({ '0001-first.md': adr({ date: '2026-01-01', [field]: null }) })
      expect(run(dir)).toContainEqual(`0001-first.md: missing required field "${field}"`)
    },
  )

  it('fails on a file without a header', () => {
    writeWithIndex({ '0001-first.md': '# no header\n' })
    expect(run(dir)).toContainEqual(expect.stringContaining('no front matter header'))
  })

  it('fails on a status outside the three allowed values', () => {
    writeWithIndex({ '0001-first.md': adr({ date: '2026-01-01', status: 'Proposed' }) })
    expect(run(dir)).toEqual([expect.stringContaining('status "Proposed" must be')])
  })

  it('accepts Deprecated, and a supersedes answered by Superseded by', () => {
    writeWithIndex({
      '0001-first.md': adr({ date: '2026-01-01', status: 'Superseded by ADR-0002' }),
      '0002-second.md': adr({ date: '2026-01-02', extra: 'supersedes: ADR-0001' }),
      '0003-third.md': adr({ date: '2026-01-03', status: 'Deprecated' }),
    })
    expect(run(dir)).toEqual([])
  })

  it('fails when a supersedes is not answered by the target status', () => {
    writeWithIndex({
      '0001-first.md': adr({ date: '2026-01-01' }),
      '0002-second.md': adr({ date: '2026-01-02', extra: 'supersedes: ADR-0001' }),
    })
    expect(run(dir)).toEqual([
      expect.stringContaining(
        '0002-second.md: supersedes ADR-0001, but 0001-first.md\'s status is "Accepted"',
      ),
    ])
  })

  it('fails when a Superseded by is not answered by the target supersedes', () => {
    writeWithIndex({
      '0001-first.md': adr({ date: '2026-01-01', status: 'Superseded by ADR-0002' }),
      '0002-second.md': adr({ date: '2026-01-02' }),
    })
    expect(run(dir)).toEqual([
      expect.stringContaining(
        '0001-first.md: status names ADR-0002, but 0002-second.md does not declare',
      ),
    ])
  })

  it('fails when a supersedes names an absent ADR', () => {
    writeWithIndex({ '0001-first.md': adr({ date: '2026-01-01', extra: 'supersedes: ADR-0009' }) })
    expect(run(dir)).toEqual(['0001-first.md: supersedes ADR-0009, which does not exist'])
  })

  it('fails when a Superseded by names an absent ADR', () => {
    writeWithIndex({
      '0001-first.md': adr({ date: '2026-01-01', status: 'Superseded by ADR-0009' }),
    })
    expect(run(dir)).toEqual(['0001-first.md: status names ADR-0009, which does not exist'])
  })
})
