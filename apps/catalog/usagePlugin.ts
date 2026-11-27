import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'
import { buildUsageIndex, discoverScreens } from './src/usage/extract.ts'

const VIRTUAL_ID = 'virtual:screen-usage'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

/** The sources the index reads, from the repository root: the app's shell and screens, the modules' screens and pieces. */
const ROOTS = ['apps/scoreo/src/App.tsx', 'apps/scoreo/src/ui', 'apps/scoreo/src/modules']
const MODULE_FOLDERS = ['src/ui', 'src/design']

function isSource(path: string): boolean {
  return /\.tsx?$/.test(path) && !/\.(test|spec)\.tsx?$/.test(path) && !path.endsWith('.d.ts')
}

function walk(absolute: string): string[] {
  try {
    return readdirSync(absolute, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name))
  } catch {
    // A single file root, or a folder a module does not have.
    return [absolute]
  }
}

/**
 * `virtual:screen-usage`: the "screen × components" index, computed at build
 * (and at each dev-server start or test run) from the real imports of the
 * app's and the modules' screens — never written by hand. The page embeds the
 * result, not the sources.
 */
export function screenUsage(repositoryRoot: string): Plugin {
  return {
    name: 'scoreo-screen-usage',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      const modules = readdirSync(join(repositoryRoot, 'packages')).filter((name) =>
        name.startsWith('module-'),
      )
      const roots = [
        ...ROOTS.map((root) => join(repositoryRoot, root)),
        ...modules.flatMap((name) =>
          MODULE_FOLDERS.map((folder) => join(repositoryRoot, 'packages', name, folder)),
        ),
      ]
      const files: Record<string, string> = {}
      for (const absolute of roots.flatMap(walk)) {
        if (!isSource(absolute)) continue
        let source: string
        try {
          source = readFileSync(absolute, 'utf8')
        } catch {
          continue // a root that does not exist
        }
        this.addWatchFile(absolute)
        files[relative(repositoryRoot, absolute).split(sep).join('/')] = source
      }
      const index = buildUsageIndex(files, discoverScreens(Object.keys(files)))
      return `export default ${JSON.stringify(index)}`
    },
  }
}
