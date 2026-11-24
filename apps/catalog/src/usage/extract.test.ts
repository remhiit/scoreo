import { describe, expect, it } from 'vitest'
import { buildUsageIndex, designSystemImports, discoverScreens, usageByComponent } from './extract'

/** A host screen: a value import split over lines, an alias, a type, a shared composition. */
const HOME_SCREEN = `import {
  ActionBar,
  Banner as Notice,
  type Hue,
  Stack,
} from '@scoreboards/design-system'
import type { IconName } from '@scoreboards/design-system'
import { useState } from 'react'
import { GameTypeTabs } from '../shared/GameTypeTabs'
import './nothing.css'

export function HomeScreen() {
  return null
}
`

/** A module screen reaching its game pieces through the design barrel. */
const MODULE_SCREEN = `import { Button, Tabs } from '@scoreboards/design-system'
import { ModuleRoot, ScoreTable } from '../../design'
`

const FILES: Record<string, string> = {
  'apps/scoreo/src/App.tsx': `import { AppHeader } from '@scoreboards/design-system'
import { HomeScreen } from './ui/home/HomeScreen'
import { ThemePickerDialog } from './ui/theme/ThemePickerDialog'
`,
  'apps/scoreo/src/ui/home/HomeScreen.tsx': HOME_SCREEN,
  'apps/scoreo/src/ui/home/homeReducer.ts': `export const x = 1\n`,
  'apps/scoreo/src/ui/shared/GameTypeTabs.tsx': `import { Tabs } from '@scoreboards/design-system'\n`,
  'apps/scoreo/src/ui/theme/ThemePickerDialog.tsx': `import { Dialog, Swatch } from '@scoreboards/design-system'\n`,
  'apps/scoreo/src/ui/navigation/screen.ts': `export type Screen = { type: 'home' }\n`,
  'apps/scoreo/src/ui/empty/EmptyScreen.tsx': `export function EmptyScreen() { return null }\n`,
  'packages/module-dice/src/ui/module/DiceModuleScreen.tsx': MODULE_SCREEN,
  'packages/module-dice/src/design/index.ts': `export { ModuleRoot } from './ModuleRoot'
export { ScoreTable, type ScoreTableProps } from './ScoreTable'
`,
  'packages/module-dice/src/design/ModuleRoot.tsx': `import './ModuleRoot.css'\n`,
  'packages/module-dice/src/design/ScoreTable.tsx': `import { Text } from '@scoreboards/design-system'\n`,
}

describe('designSystemImports', () => {
  it('lists the values a source imports from the design system, under their exported name', () => {
    expect(designSystemImports(HOME_SCREEN)).toEqual(['ActionBar', 'Banner', 'Stack'])
  })

  it('reads a one-line import too', () => {
    expect(designSystemImports(MODULE_SCREEN)).toEqual(['Button', 'Tabs'])
  })

  it('finds nothing in a source that imports no design-system value', () => {
    expect(designSystemImports(`import { useState } from 'react'\n`)).toEqual([])
  })
})

describe('discoverScreens', () => {
  it('finds the shell, each host screen folder and each module screen', () => {
    const screens = discoverScreens(Object.keys(FILES))
    expect(screens.map((screen) => [screen.id, screen.kind, screen.path])).toEqual([
      ['shell', 'shell', 'apps/scoreo/src/App.tsx'],
      ['empty', 'host', 'apps/scoreo/src/ui/empty/'],
      ['home', 'host', 'apps/scoreo/src/ui/home/'],
      ['module-dice', 'module', 'packages/module-dice/src/ui/'],
    ])
    expect(screens.find((screen) => screen.id === 'home')?.files).toEqual([
      'apps/scoreo/src/ui/home/HomeScreen.tsx',
      'apps/scoreo/src/ui/home/homeReducer.ts',
    ])
  })
})

describe('buildUsageIndex', () => {
  const index = buildUsageIndex(FILES, discoverScreens(Object.keys(FILES)))
  const of = (id: string) => index.find((screen) => screen.id === id)?.components

  it('follows relative imports into shared compositions', () => {
    expect(of('home')).toEqual(['ActionBar', 'Banner', 'Stack', 'Tabs'])
  })

  it('follows a module screen into its game pieces', () => {
    expect(of('module-dice')).toEqual(['Button', 'Tabs', 'Text'])
  })

  it('never counts another screen in the shell', () => {
    expect(of('shell')).toEqual(['AppHeader', 'Dialog', 'Swatch'])
  })

  it('keeps a screen that imports no component, with an empty list', () => {
    expect(of('empty')).toEqual([])
  })
})

describe('usageByComponent', () => {
  it('inverts the index for every component, unused ones included', () => {
    const index = buildUsageIndex(FILES, discoverScreens(Object.keys(FILES)))
    const inverse = usageByComponent(index, ['Tabs', 'Swatch', 'Sheet'])
    expect(inverse).toEqual([
      { component: 'Sheet', screens: [] },
      { component: 'Swatch', screens: ['shell'] },
      { component: 'Tabs', screens: ['home', 'module-dice'] },
    ])
  })
})
