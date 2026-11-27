/**
 * The "screen × components" index, computed from the code: which design-system
 * components each screen of Scoreo really imports. Pure string work, no file
 * system — `usagePlugin.ts` reads the sources at build time and hands them
 * here; the catalog's page and the tests read the result.
 */

/** Where a screen lives: the app's shell, one of its `ui/<screen>/` folders, a module's `src/ui/`. */
export type ScreenKind = 'shell' | 'host' | 'module'

export interface ScreenEntry {
  /** `shell`, the `ui/` folder name (`home`), or the module package folder (`module-skyjo`). */
  id: string
  kind: ScreenKind
  /** The file (shell) or folder (ending in `/`) the screen is made of, from the repository root. */
  path: string
  /** Its own sources, where the walk through its imports starts. */
  files: string[]
}

export interface ScreenUsage {
  id: string
  kind: ScreenKind
  path: string
  /** The design-system names it imports, its own files and what they reach, sorted. */
  components: string[]
}

export interface ComponentUsage {
  component: string
  /** The ids of the screens that import it, sorted; empty when none does. */
  screens: string[]
}

const SHELL = 'apps/scoreo/src/App.tsx'
const HOST_SCREEN = /^apps\/scoreo\/src\/ui\/([^/]+)\/[^/]*Screen\.tsx$/
const MODULE_UI = /^packages\/(module-[^/]+)\/src\/ui\//

const DS_IMPORT = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]@scoreboards\/design-system['"]/g
const RELATIVE_IMPORT =
  /(?:import|export)\s[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g

/** The values a source imports from `@scoreboards/design-system`, under their exported name. */
export function designSystemImports(source: string): string[] {
  const names = new Set<string>()
  for (const match of source.matchAll(DS_IMPORT)) {
    if (match[1]) continue // `import type { … }`
    for (const specifier of match[2].split(',')) {
      const spec = specifier.trim()
      if (spec === '' || spec.startsWith('type ')) continue
      names.add(spec.split(/\s+as\s+/)[0].trim())
    }
  }
  return [...names].sort()
}

function relativeImports(source: string): string[] {
  return [...source.matchAll(RELATIVE_IMPORT)].map((match) => match[1] ?? match[2])
}

/** `from` imports `spec`: the path it lands on, or undefined when it is none of `files`. */
function resolve(from: string, spec: string, files: Record<string, string>): string | undefined {
  const parts = from.split('/').slice(0, -1)
  for (const segment of spec.split('/')) {
    if (segment === '..') parts.pop()
    else if (segment !== '.') parts.push(segment)
  }
  const base = parts.join('/')
  return [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`].find(
    (candidate) => candidate in files,
  )
}

/**
 * The screens found in a list of paths from the repository root: the shell
 * (`App.tsx`, around every screen), each `apps/scoreo/src/ui/<folder>/` holding
 * a `*Screen.tsx`, and each module's `src/ui/`. Folders with no screen
 * (`shared/`, `theme/`, `navigation/`) are not entries: they count toward the
 * screens that import them.
 */
export function discoverScreens(paths: readonly string[]): ScreenEntry[] {
  const sorted = [...paths].sort()
  const inFolder = (folder: string) => sorted.filter((path) => path.startsWith(folder))
  const shell: ScreenEntry[] = sorted.includes(SHELL)
    ? [{ id: 'shell', kind: 'shell', path: SHELL, files: [SHELL] }]
    : []
  const hostIds = new Set(sorted.flatMap((path) => HOST_SCREEN.exec(path)?.[1] ?? []))
  const host = [...hostIds].map((id): ScreenEntry => {
    const path = `apps/scoreo/src/ui/${id}/`
    return { id, kind: 'host', path, files: inFolder(path) }
  })
  const moduleIds = new Set(sorted.flatMap((path) => MODULE_UI.exec(path)?.[1] ?? []))
  const modules = [...moduleIds].map((id): ScreenEntry => {
    const path = `packages/${id}/src/ui/`
    return { id, kind: 'module', path, files: inFolder(path) }
  })
  return [...shell, ...host, ...modules]
}

/**
 * For each screen, the design-system names its files import, following their
 * relative imports through `files` (shared compositions, a module's game
 * pieces) but never into another screen: the shell imports every screen, and
 * none of them is the shell's.
 */
export function buildUsageIndex(
  files: Record<string, string>,
  screens: readonly ScreenEntry[],
): ScreenUsage[] {
  return screens.map((screen) => {
    const others = screens.filter((other) => other !== screen).map((other) => other.path)
    const seen = new Set<string>()
    const queue = [...screen.files]
    const components = new Set<string>()
    while (queue.length > 0) {
      const path = queue.shift()!
      if (seen.has(path)) continue
      seen.add(path)
      const source = files[path] ?? ''
      for (const name of designSystemImports(source)) components.add(name)
      for (const spec of relativeImports(source)) {
        const target = resolve(path, spec, files)
        if (target && !others.some((other) => target.startsWith(other))) queue.push(target)
      }
    }
    return {
      id: screen.id,
      kind: screen.kind,
      path: screen.path,
      components: [...components].sort(),
    }
  })
}

/** The inverse index: each of `components`, sorted, with the screens that import it. */
export function usageByComponent(
  screens: readonly ScreenUsage[],
  components: readonly string[],
): ComponentUsage[] {
  return [...components].sort().map((component) => ({
    component,
    screens: screens.filter((screen) => screen.components.includes(component)).map((s) => s.id),
  }))
}
