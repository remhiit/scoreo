#!/usr/bin/env node
// Évaluation déterministe de complexité d'une issue/PR — un ComplexityAssessment
// (niveau/score/confiance/dimensions/raisons/provenance, issue #402,
// doc/technical/automation-plan.md §4). Zéro LLM, zéro appel réseau, comme
// task-context.mjs (#401) dont ce script consomme la sortie (`TaskContext`) :
// chaque dimension est dérivée d'un signal déjà présent dans ce contexte —
// jamais un second appel API. Complexité (effort de raisonnement/mise en
// œuvre) et risque (change-risk, #387, gravité potentielle d'une erreur) sont
// deux échelles distinctes : ce script ne calcule, ne lit ni n'écrase jamais
// un niveau de risque, et ne doit jamais servir à en masquer un.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseRoutinesYaml } from './automation-dispatch.mjs'

export const COMPLEXITY_ASSESSMENT_VERSION = 1

// Même sous-ensemble minimal de YAML que .automation/routines.yml (mappings
// imbriqués de scalaires, pas de listes) — voir .automation/complexity-thresholds.yml
// pour la règle d'arrondi (un score == au `min` d'une bande appartient à
// cette bande, jamais à la précédente).
export const DEFAULT_THRESHOLDS = Object.freeze({
  version: 1,
  bands: [
    { level: 'trivial', min: 0 },
    { level: 'standard', min: 20 },
    { level: 'complex', min: 45 },
    { level: 'very-complex', min: 70 },
  ],
})

export function loadThresholds(path) {
  const parsed = parseRoutinesYaml(readFileSync(path, 'utf8'))
  const bands = Object.entries(parsed.bands ?? {})
    .map(([level, cfg]) => ({ level, min: Number(cfg.min) }))
    .sort((a, b) => a.min - b.min)
  return { version: Number(parsed.version), bands }
}

export function levelForScore(score, thresholds) {
  let selected = thresholds.bands[0].level
  for (const band of thresholds.bands) {
    if (score >= band.min) selected = band.level
  }
  return selected
}

// value <= premier seuil d'un couple retourne le score associé ; le dernier
// couple ([Infinity, score]) sert de filet.
function bandScore(value, bands) {
  for (const [maxInclusive, score] of bands) {
    if (value <= maxInclusive) return score
  }
  return bands[bands.length - 1][1]
}

const DISPERSION_BANDS = [
  [1, 0],
  [2, 10],
  [Infinity, 20],
]
const FILE_VOLUME_BANDS = [
  [3, 0],
  [10, 8],
  [25, 12],
  [Infinity, 15],
]
const DEPENDENCIES_BANDS = [
  [0, 0],
  [2, 5],
  [Infinity, 10],
]
const CHANGE_VOLUME_BANDS = [
  [20, 0],
  [100, 6],
  [300, 11],
  [Infinity, 15],
]
const VALIDATION_LOAD_BANDS = [
  [0, 0],
  [1, 4],
  [2, 7],
  [Infinity, 10],
]
const NOVELTY_BANDS = [
  [0, 0],
  [2, 5],
  [Infinity, 10],
]
const CROSS_CUTTING_BANDS = [
  [1, 0],
  [2, 3],
  [Infinity, 5],
]

const REQUIRED_SPEC_SECTIONS = [
  { key: 'acceptance', pattern: /(?:^|\n)##\s*Crit[èe]res d['’]acceptation\b/i },
  { key: 'files', pattern: /(?:^|\n)##\s*Fichiers impact[ée]s\b/i },
  { key: 'outOfScope', pattern: /(?:^|\n)##\s*Hors scope\b/i },
]

function stripCodeFences(text) {
  return (text ?? '').replace(/```[\s\S]*?```/g, '')
}

// Même convention d'ancrage en début de ligne que
// task-context.mjs#extractRelevantFiles / sync-issue-dependencies.mjs#extractBlockerNumbers :
// une mention en prose du nom de section, ou une occurrence dans un bloc de
// code, ne détourne jamais le match.
function extractSection(text, headingPattern) {
  const stripped = stripCodeFences(text)
  const startMatch = stripped.match(headingPattern)
  if (!startMatch) return null
  const rest = stripped.slice(startMatch.index + startMatch[0].length)
  const endMatch = rest.match(/\n##\s/)
  return endMatch ? rest.slice(0, endMatch.index) : rest
}

// Analyse la complétude de la spec (corps de l'entité, déjà redacté/borné par
// task-context.mjs) : sections requises manquantes, nombre de critères
// d'acceptation cochables, nombre de fichiers marqués "(nouveau)" dans
// "## Fichiers impactés". Jamais d'appel réseau, jamais d'inférence
// sémantique — uniquement des motifs textuels déjà utilisés ailleurs dans
// scripts/ (task-context.mjs, sync-issue-dependencies.mjs).
export function analyzeSpecCompleteness(body) {
  const text = body ?? ''
  if (text.trim() === '') {
    return {
      bodyEmpty: true,
      missingSections: REQUIRED_SPEC_SECTIONS.map((s) => s.key),
      acceptanceCriteriaCount: 0,
      newFileCount: 0,
    }
  }

  const stripped = stripCodeFences(text)
  const missingSections = REQUIRED_SPEC_SECTIONS.filter((s) => !s.pattern.test(stripped)).map((s) => s.key)

  const acceptanceSection = extractSection(text, REQUIRED_SPEC_SECTIONS[0].pattern)
  const acceptanceCriteriaCount = acceptanceSection
    ? (acceptanceSection.match(/\n\s*-\s*\[[ xX]\]/g) ?? []).length
    : 0

  const filesSection = extractSection(text, REQUIRED_SPEC_SECTIONS[1].pattern)
  const newFileCount = filesSection ? (filesSection.match(/`[^`\n]+`[^\n]*\(nouveau/gi) ?? []).length : 0

  return { bodyEmpty: false, missingSections, acceptanceCriteriaCount, newFileCount }
}

// Vrai quand la spec n'apporte, de fait, aucun critère d'acceptation
// exploitable — corps vide, section absente, ou section présente mais sans
// case à cocher. C'est le déclencheur du plancher "jamais trivial par
// défaut" (cas limite documenté dans l'issue #402) et d'une confiance basse.
function hasNoAcceptanceCriteria(spec) {
  return spec.bodyEmpty || spec.missingSections.includes('acceptance') || spec.acceptanceCriteriaCount === 0
}

const SURFACE_PATTERNS = [
  { key: 'persistence', pattern: /infrastructure\/localStorage|infrastructure\/migration|domain\/model/ },
  { key: 'contracts', pattern: /module-api|shared-domain|schemas\/import|domain\/port/ },
  { key: 'auth', pattern: /infrastructure\/google/ },
  { key: 'deploy', pattern: /\.github\/workflows|public\/manifest\.json|public\/sw\.js/ },
  { key: 'config', pattern: /vite\.config|tsconfig|eslint\.config|(?:^|\/)package\.json|pnpm-workspace\.yaml/ },
]

// Approximation grossière, à des fins de dosage de la charge de validation
// uniquement — ce n'est pas change-risk (#387) et ne prétend pas produire un
// niveau de risque : simple heuristique de dénombrement de surfaces
// touchées pour peser la dimension `validationLoad`.
function touchedSurfaces(files) {
  const set = new Set()
  for (const file of files) {
    for (const surface of SURFACE_PATTERNS) {
      if (surface.pattern.test(file)) set.add(surface.key)
    }
  }
  return [...set]
}

function layerOf(path) {
  if (path.includes('/domain/')) return 'domain'
  if (path.includes('/application/')) return 'application'
  if (path.includes('/infrastructure/')) return 'infrastructure'
  if (path.includes('/ui/')) return 'ui'
  if (path.startsWith('scripts/')) return 'scripts'
  if (path.startsWith('schemas/') || path.startsWith('doc/')) return 'docs-schemas'
  return 'config-root'
}

function touchedLayers(files) {
  return [...new Set(files.map(layerOf))]
}

function findComplexityOverride(labels) {
  const candidates = [...new Set((labels ?? []).map((l) => l.match(/^complexity:(trivial|standard|complex|very-complex)$/)).filter(Boolean).map((m) => m[1]))]
  if (candidates.length === 0) return { level: null, ambiguous: false, candidates: [] }
  if (candidates.length > 1) return { level: null, ambiguous: true, candidates }
  return { level: candidates[0], ambiguous: false, candidates }
}

function computeDimensions(taskContext, spec) {
  const filesAvailable = taskContext.files.relevant.available || taskContext.files.changed.available
  const allFiles = [...new Set([...(taskContext.files.relevant.items ?? []), ...(taskContext.files.changed.items ?? [])])]
  const limits = []

  const dimensions = {}

  // Dispersion dans le monorepo : nombre de paquets touchés (déjà dérivé par
  // task-context.mjs#derivePackages).
  if (filesAvailable) {
    const pkgCount = taskContext.packages.length
    const score = bandScore(pkgCount, DISPERSION_BANDS)
    dimensions.dispersion = {
      available: true,
      score,
      max: 20,
      reason: `Dispersion : ${pkgCount} paquet(s) touché(s) (${taskContext.packages.join(', ') || 'aucun'}) → ${score}/20`,
    }
  } else {
    dimensions.dispersion = {
      available: false,
      score: 0,
      max: 20,
      reason: 'Dispersion non disponible : aucun fichier pertinent ni modifié fourni à ce run',
    }
    limits.push('dispersion non disponible : paquets non déterminables (aucun fichier fourni)')
  }

  // Volume de fichiers pertinents/modifiés (union dédupliquée).
  if (filesAvailable) {
    const fileCount = allFiles.length
    const score = bandScore(fileCount, FILE_VOLUME_BANDS)
    dimensions.fileVolume = {
      available: true,
      score,
      max: 15,
      reason: `Fichiers : ${fileCount} fichier(s) pertinent(s)/modifié(s) → ${score}/15`,
    }
  } else {
    dimensions.fileVolume = {
      available: false,
      score: 0,
      max: 15,
      reason: 'Fichiers non disponible : aucun fichier pertinent ni modifié fourni à ce run',
    }
    limits.push('fileVolume non disponible : nombre de fichiers non déterminable')
  }

  // Ambiguïté de la spec.
  if (spec.bodyEmpty) {
    dimensions.ambiguity = { available: true, score: 15, max: 15, reason: 'Ambiguïté : corps vide → 15/15 (ambiguïté maximale)' }
  } else {
    const acceptanceMissing = spec.missingSections.includes('acceptance')
    let score = spec.missingSections.length * 4
    const emptyAcceptance = !acceptanceMissing && spec.acceptanceCriteriaCount === 0
    if (emptyAcceptance) score += 3
    score = Math.min(score, 15)
    const parts = []
    if (spec.missingSections.length > 0) parts.push(`section(s) manquante(s) : ${spec.missingSections.join(', ')}`)
    if (emptyAcceptance) parts.push('section "Critères d\'acceptation" présente mais sans case à cocher')
    if (parts.length === 0) parts.push('spec complète (aucune section requise manquante)')
    dimensions.ambiguity = { available: true, score, max: 15, reason: `Ambiguïté : ${parts.join(' ; ')} → ${score}/15` }
  }

  // Dépendances connues (déclarées + bloqueurs natifs si fournis). Cette
  // dimension reste toujours `available: true`, contrairement aux autres :
  // `dependencies.declaredAvailable === false` signifie seulement qu'aucune
  // section "## Dépendances" n'existe dans le corps, ce que
  // sync-issue-dependencies.mjs#extractBlockerNumbers (et le §4 de
  // automation-plan.md qui en découle) traite déjà comme "zéro dépendance
  // déclarée", jamais comme "signal inconnu" — à la différence de `novelty`
  // ou `fileVolume`, où l'absence de section rend le compte proprement
  // indéterminable (rien à compter). `declaredAvailable` n'est donc
  // délibérément pas lu ici ; seul `nativeBlockersAvailable` (un vrai trou de
  // donnée : la liste des bloqueurs natifs n'a simplement pas été fournie à
  // ce run) est signalé, dans `limits` ci-dessous.
  const declaredCount = taskContext.dependencies.declared.length
  const nativeAvailable = taskContext.dependencies.nativeBlockersAvailable
  const nativeCount = nativeAvailable ? taskContext.dependencies.nativeBlockers.length : 0
  const depCount = declaredCount + nativeCount
  const depScore = bandScore(depCount, DEPENDENCIES_BANDS)
  dimensions.dependencies = {
    available: true,
    score: depScore,
    max: 10,
    reason: `Dépendances : ${declaredCount} déclarée(s)${nativeAvailable ? ` + ${nativeCount} bloqueur(s) natif(s)` : ''} → ${depScore}/10`,
  }
  if (!nativeAvailable) {
    limits.push('dependencies : bloqueurs natifs non fournis à ce run — seules les dépendances déclarées sont comptées')
  }

  // Volume de changement estimé (résumé de diff du payload webhook).
  if (taskContext.diff.available) {
    const lines = taskContext.diff.summary.additions + taskContext.diff.summary.deletions
    const score = bandScore(lines, CHANGE_VOLUME_BANDS)
    dimensions.changeVolume = {
      available: true,
      score,
      max: 15,
      reason: `Volume de changement : ${lines} ligne(s) (+${taskContext.diff.summary.additions}/-${taskContext.diff.summary.deletions}) → ${score}/15`,
    }
  } else {
    dimensions.changeVolume = {
      available: false,
      score: 0,
      max: 15,
      reason: `Volume de changement non disponible : ${taskContext.diff.unavailableReason}`,
    }
    limits.push(`changeVolume non disponible : ${taskContext.diff.unavailableReason}`)
  }

  // Charge de validation : nombre de surfaces sensibles touchées (approximation
  // grossière, pas un niveau de risque — voir touchedSurfaces()).
  if (filesAvailable) {
    const surfaces = touchedSurfaces(allFiles)
    const score = bandScore(surfaces.length, VALIDATION_LOAD_BANDS)
    dimensions.validationLoad = {
      available: true,
      score,
      max: 10,
      reason: `Charge de validation : ${surfaces.length} surface(s) sensible(s) touchée(s)${surfaces.length ? ` (${surfaces.join(', ')})` : ''} → ${score}/10`,
    }
  } else {
    dimensions.validationLoad = {
      available: false,
      score: 0,
      max: 10,
      reason: 'Charge de validation non disponible : aucun fichier fourni à ce run',
    }
    limits.push('validationLoad non disponible : surfaces non déterminables (aucun fichier fourni)')
  }

  // Nouveauté : fichiers marqués "(nouveau)" dans "## Fichiers impactés".
  if (!spec.bodyEmpty && !spec.missingSections.includes('files')) {
    const score = bandScore(spec.newFileCount, NOVELTY_BANDS)
    dimensions.novelty = {
      available: true,
      score,
      max: 10,
      reason: `Nouveauté : ${spec.newFileCount} fichier(s) marqué(s) "(nouveau)" → ${score}/10`,
    }
  } else {
    dimensions.novelty = {
      available: false,
      score: 0,
      max: 10,
      reason: 'Nouveauté non disponible : pas de section "## Fichiers impactés" exploitable dans le corps',
    }
    limits.push('novelty non disponible : section "## Fichiers impactés" absente ou corps vide')
  }

  // Surfaces transverses : nombre de couches d'architecture distinctes touchées.
  if (filesAvailable) {
    const layers = touchedLayers(allFiles)
    const score = bandScore(layers.length, CROSS_CUTTING_BANDS)
    dimensions.crossCuttingSurfaces = {
      available: true,
      score,
      max: 5,
      reason: `Surfaces transverses : ${layers.length} couche(s) touchée(s) (${layers.join(', ')}) → ${score}/5`,
    }
  } else {
    dimensions.crossCuttingSurfaces = {
      available: false,
      score: 0,
      max: 5,
      reason: 'Surfaces transverses non disponible : aucun fichier fourni à ce run',
    }
    limits.push('crossCuttingSurfaces non disponible : couches non déterminables (aucun fichier fourni)')
  }

  return { dimensions, limits }
}

const DIMENSION_ORDER = [
  'dispersion',
  'fileVolume',
  'ambiguity',
  'dependencies',
  'changeVolume',
  'validationLoad',
  'novelty',
  'crossCuttingSurfaces',
]

// Pure : les mêmes entrées produisent toujours la même sortie (critère
// d'acceptation #402), à condition que l'appelant fixe `generatedAt` (le
// défaut "maintenant" ne sert qu'au chemin CLI, où la reproductibilité
// n'est pas l'enjeu — la traçabilité l'est), même convention que
// task-context.mjs#buildTaskContext.
export function assessComplexity(taskContext, { thresholds = DEFAULT_THRESHOLDS, generatedAt = new Date().toISOString() } = {}) {
  if (!taskContext || typeof taskContext !== 'object' || !taskContext.entity) {
    throw new Error('complexity-assessment: un TaskContext valide est requis en entrée (voir scripts/task-context.mjs)')
  }

  const spec = analyzeSpecCompleteness(taskContext.entity.bodyExcerpt)
  const { dimensions, limits } = computeDimensions(taskContext, spec)

  const score = DIMENSION_ORDER.reduce((total, key) => total + dimensions[key].score, 0)
  const reasons = DIMENSION_ORDER.map((key) => dimensions[key].reason)

  const unavailableCount = DIMENSION_ORDER.filter((key) => !dimensions[key].available).length
  const noAcceptanceCriteria = hasNoAcceptanceCriteria(spec)

  let level = levelForScore(score, thresholds)
  if (noAcceptanceCriteria && level === 'trivial') {
    level = 'standard'
    limits.push(
      'niveau plancher forcé à "standard" : spec vide ou sans critère d\'acceptation exploitable — jamais "trivial" par défaut',
    )
  }

  let confidence
  if (noAcceptanceCriteria) {
    confidence = 'low'
  } else if (unavailableCount >= 2) {
    confidence = 'low'
  } else if (unavailableCount === 1) {
    confidence = 'medium'
  } else {
    confidence = 'high'
  }

  const heuristicLevel = level
  let finalLevel = heuristicLevel
  let provenance = 'heuristic'
  let override = null

  const found = findComplexityOverride(taskContext.entity.labels)
  if (found.ambiguous) {
    limits.push(`override ignoré : labels complexity:* contradictoires (${found.candidates.join(', ')})`)
  } else if (found.level) {
    finalLevel = found.level
    provenance = 'manual'
    override = { level: found.level, heuristicLevel, source: `label:complexity:${found.level}` }
  }

  limits.push(
    'heuristique déterministe : lit uniquement les métadonnées et le texte de la spec, jamais le code — ne remplace pas un jugement humain sur la difficulté réelle, ni le niveau de risque de change-risk (#387)',
  )

  return {
    version: COMPLEXITY_ASSESSMENT_VERSION,
    level: finalLevel,
    score,
    confidence,
    provenance,
    dimensions,
    reasons,
    limits,
    override,
    thresholds: { version: thresholds.version, bands: thresholds.bands },
    generatedAt,
  }
}

const VALID_LEVELS = ['trivial', 'standard', 'complex', 'very-complex']
const REQUIRED_TOP_FIELDS = [
  'version',
  'level',
  'score',
  'confidence',
  'provenance',
  'dimensions',
  'reasons',
  'limits',
  'override',
  'thresholds',
  'generatedAt',
]

// Miroir à la main du contrat schemas/automation/complexity-assessment.schema.json
// — même précédent que task-context.mjs#validateTaskContext.
export function validateComplexityAssessment(assessment) {
  const errors = []
  if (!assessment || typeof assessment !== 'object') {
    return { valid: false, errors: ['complexity-assessment: la racine doit être un objet'] }
  }

  for (const field of REQUIRED_TOP_FIELDS) {
    if (assessment[field] === undefined) {
      errors.push(`complexity-assessment.${field}: champ requis manquant`)
    }
  }
  if (assessment.version !== COMPLEXITY_ASSESSMENT_VERSION) {
    errors.push(
      `complexity-assessment.version: doit être ${COMPLEXITY_ASSESSMENT_VERSION} (valeur: ${JSON.stringify(assessment.version)})`,
    )
  }
  if (assessment.level !== undefined && !VALID_LEVELS.includes(assessment.level)) {
    errors.push(`complexity-assessment.level: doit être l'un de ${VALID_LEVELS.join('/')} (valeur: ${JSON.stringify(assessment.level)})`)
  }
  if (assessment.score !== undefined && (!Number.isInteger(assessment.score) || assessment.score < 0 || assessment.score > 100)) {
    errors.push('complexity-assessment.score: doit être un entier entre 0 et 100')
  }
  if (assessment.confidence !== undefined && !['high', 'medium', 'low'].includes(assessment.confidence)) {
    errors.push(`complexity-assessment.confidence: doit être high/medium/low (valeur: ${JSON.stringify(assessment.confidence)})`)
  }
  if (assessment.provenance !== undefined && !['heuristic', 'llm', 'manual'].includes(assessment.provenance)) {
    errors.push(`complexity-assessment.provenance: doit être heuristic/llm/manual (valeur: ${JSON.stringify(assessment.provenance)})`)
  }
  if (assessment.override && !VALID_LEVELS.includes(assessment.override.level)) {
    errors.push('complexity-assessment.override.level: doit être un niveau valide')
  }

  return { valid: errors.length === 0, errors }
}

async function main() {
  const contextPath = process.env.COMPLEXITY_ASSESSMENT_INPUT_PATH ?? 'task-context.json'
  const thresholdsPath = process.env.COMPLEXITY_ASSESSMENT_THRESHOLDS_PATH ?? '.automation/complexity-thresholds.yml'
  const outputPath = process.env.COMPLEXITY_ASSESSMENT_OUTPUT_PATH ?? 'complexity-assessment.json'

  let taskContext
  let thresholds
  try {
    taskContext = JSON.parse(readFileSync(contextPath, 'utf8'))
    thresholds = loadThresholds(thresholdsPath)
  } catch (err) {
    console.error(`::error::complexity-assessment: ${err.message}`)
    process.exitCode = 1
    return
  }

  let assessment
  try {
    assessment = assessComplexity(taskContext, { thresholds })
  } catch (err) {
    console.error(`::error::complexity-assessment: ${err.message}`)
    process.exitCode = 1
    return
  }

  const { valid, errors } = validateComplexityAssessment(assessment)
  if (!valid) {
    for (const error of errors) console.error(`::error::${error}`)
    process.exitCode = 1
    return
  }

  writeFileSync(outputPath, JSON.stringify(assessment, null, 2))
  console.log(
    `complexity-assessment: écrit dans ${outputPath} (level=${assessment.level}, score=${assessment.score}, confidence=${assessment.confidence}, provenance=${assessment.provenance})`,
  )
}

// Même garde que task-context.mjs/automation-log.mjs : n'exécute main() que
// si ce fichier est le point d'entrée, pas quand pnpm test l'importe.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
