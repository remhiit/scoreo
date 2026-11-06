import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('./link-playwright-browsers.sh', import.meta.url))
const WANTED = '1248'
const INSTALLED = '1243'

function browsersDir(executables) {
  const root = mkdtempSync(join(tmpdir(), 'pw-browsers-'))
  for (const file of executables) {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, '')
    chmodSync(path, 0o755)
  }
  return root
}

const currentLayout = () =>
  browsersDir([
    `chromium-${INSTALLED}/chrome-linux64/chrome`,
    `chromium-${INSTALLED}/chrome-linux64/resources.pak`,
    `chromium_headless_shell-${INSTALLED}/chrome-headless-shell-linux64/chrome-headless-shell`,
  ])

const olderLayout = () =>
  browsersDir([
    `chromium-${INSTALLED}/chrome-linux/chrome`,
    `chromium_headless_shell-${INSTALLED}/chrome-linux/headless_shell`,
    `chromium_headless_shell-${INSTALLED}/chrome-linux/resources.pak`,
  ])

function link(root, wanted = WANTED) {
  return spawnSync('bash', [SCRIPT, root, wanted], { encoding: 'utf8' })
}

const chrome = (root) => join(root, `chromium-${WANTED}/chrome-linux64/chrome`)
const shell = (root) =>
  join(root, `chromium_headless_shell-${WANTED}/chrome-headless-shell-linux64/chrome-headless-shell`)

function expectLinkedTo(root, layout) {
  expect(realpathSync(chrome(root))).toBe(
    realpathSync(join(root, `chromium-${INSTALLED}/${layout.chrome}/chrome`)),
  )
  expect(realpathSync(shell(root))).toBe(
    realpathSync(join(root, `chromium_headless_shell-${INSTALLED}/${layout.shell}`)),
  )
  expect(existsSync(join(root, `chromium-${WANTED}/INSTALLATION_COMPLETE`))).toBe(true)
  expect(existsSync(join(root, `chromium_headless_shell-${WANTED}/INSTALLATION_COMPLETE`))).toBe(true)
}

const CURRENT = { chrome: 'chrome-linux64', shell: 'chrome-headless-shell-linux64/chrome-headless-shell' }
const OLDER = { chrome: 'chrome-linux', shell: 'chrome-linux/headless_shell' }

describe('link-playwright-browsers.sh', () => {
  it('links each directory of the current layout to its same-named twin', () => {
    const root = currentLayout()
    const result = link(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain(`chromium build ${WANTED} now points at the image's ${INSTALLED}`)
    expectLinkedTo(root, CURRENT)
    expect(readlinkSync(join(root, `chromium_headless_shell-${WANTED}/chrome-headless-shell-linux64`))).toBe(
      join(root, `chromium_headless_shell-${INSTALLED}/chrome-headless-shell-linux64`),
    )
  })

  it('keeps linking the older layout, renaming the headless shell binary', () => {
    const root = olderLayout()
    const result = link(root)

    expect(result.status).toBe(0)
    expectLinkedTo(root, OLDER)
    expect(
      realpathSync(join(root, `chromium_headless_shell-${WANTED}/chrome-headless-shell-linux64/resources.pak`)),
    ).toBe(realpathSync(join(root, `chromium_headless_shell-${INSTALLED}/chrome-linux/resources.pak`)))
  })

  it('creates no link and fails when neither layout is found', () => {
    const root = browsersDir([`chromium-${INSTALLED}/somewhere-else/chrome`])
    const result = link(root)

    expect(result.status).not.toBe(0)
    expect(result.stdout).not.toContain('now points at')
    expect(existsSync(join(root, `chromium-${WANTED}`))).toBe(false)
    expect(existsSync(join(root, `chromium_headless_shell-${WANTED}`))).toBe(false)
  })

  it('replaces the broken links an earlier run left behind', () => {
    const root = currentLayout()
    // What the hook used to leave on the current layout: a chrome-linux64 link
    // to a chrome-linux that does not exist, and a headless shell directory of
    // dangling per-entry links, including a literal `*` from an empty glob.
    mkdirSync(join(root, `chromium-${WANTED}`))
    symlinkSync(join(root, `chromium-${INSTALLED}/chrome-linux`), join(root, `chromium-${WANTED}/chrome-linux64`))
    const staleShell = join(root, `chromium_headless_shell-${WANTED}/chrome-headless-shell-linux64`)
    mkdirSync(staleShell, { recursive: true })
    symlinkSync(join(root, `chromium_headless_shell-${INSTALLED}/chrome-linux/*`), join(staleShell, '*'))
    symlinkSync(
      join(root, `chromium_headless_shell-${INSTALLED}/chrome-linux/headless_shell`),
      join(staleShell, 'chrome-headless-shell'),
    )

    expect(link(root).status).toBe(0)
    expectLinkedTo(root, CURRENT)
    expect(lstatSync(staleShell).isSymbolicLink()).toBe(true)

    // And a second run on a now-valid setup converges to the same result.
    expect(link(root).status).toBe(0)
    expectLinkedTo(root, CURRENT)
  })

  it('never writes through an existing link into the installed build', () => {
    const root = olderLayout()
    const installedShell = join(root, `chromium_headless_shell-${INSTALLED}/chrome-linux`)
    // A hand-made workaround: the wanted shell directory linked straight to
    // the installed one. Following it would overwrite the image's binaries.
    mkdirSync(join(root, `chromium_headless_shell-${WANTED}`))
    symlinkSync(installedShell, join(root, `chromium_headless_shell-${WANTED}/chrome-headless-shell-linux64`))

    expect(link(root).status).toBe(0)
    expectLinkedTo(root, OLDER)
    expect(readdirSync(installedShell).sort()).toEqual(['headless_shell', 'resources.pak'])
    expect(lstatSync(join(installedShell, 'headless_shell')).isSymbolicLink()).toBe(false)
  })

  it('does nothing when the wanted build is the installed one', () => {
    const root = currentLayout()
    const result = link(root, INSTALLED)

    expect(result.status).toBe(0)
    expect(result.stdout).toBe('')
    expect(lstatSync(join(root, `chromium-${INSTALLED}/chrome-linux64`)).isSymbolicLink()).toBe(false)
  })

  it('exits silently when the browsers directory is absent', () => {
    const result = link(join(tmpdir(), 'pw-browsers-does-not-exist'))

    expect(result.status).toBe(0)
    expect(result.stdout).toBe('')
  })
})
