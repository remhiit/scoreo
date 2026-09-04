#!/usr/bin/env node
// Builds a versioned, deterministic `TaskContext` from a dispatcher GitHub
// event (`issues`/`pull_request`), so a routine can be analyzed and routed
// without depending on the raw shape of the webhook payload
// (doc/technical/automation-plan.md §4). Zero LLM, zero network call — every
// field is derived from the event payload plus whatever the caller already
// has in hand (a routine name, a run id, optionally a pre-fetched diff stat
// or changed-file list); anything not provided is marked explicitly
// unavailable rather than guessed or silently omitted, per the issue's edge
// cases. Same "documented in schemas/, validated by hand-written code"
// precedent as automation-dispatch.mjs / routines.schema.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { extractBlockerNumbers } from './sync-issue-dependencies.mjs'

export const TASK_CONTEXT_VERSION = 1

export const DEFAULT_LIMITS = Object.freeze({
  maxRelevantFiles: 50,
  maxChangedFiles: 200,
  maxBodyChars: 4000,
})

// Deliberately conservative: over-redacting a false positive costs nothing
// (the context loses one word), under-redacting a real secret leaks it to
// every model this context feeds (automation-plan.md §4 "risques et
// questions ouvertes" on issue #401). Each pattern names itself so a
// redaction can be traced back to which rule fired if that's ever needed.
const SECRET_PATTERNS = [
  {
    name: 'private-key-block',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replace: () => '[REDACTED:private-key]',
  },
  {
    name: 'github-token',
    regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
    replace: () => '[REDACTED:github-token]',
  },
  {
    name: 'github-pat-fine-grained',
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
    replace: () => '[REDACTED:github-token]',
  },
  {
    name: 'aws-access-key',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    replace: () => '[REDACTED:aws-key]',
  },
  {
    name: 'bearer-token',
    regex: /\bBearer\s+[A-Za-z0-9._-]{10,}\b/gi,
    replace: () => 'Bearer [REDACTED]',
  },
  {
    // Catches the general "SOMETHING_SECRET=value" / "SOMETHING_TOKEN: value"
    // shape (env-var-looking assignments) — the key name stays visible (it's
    // what makes the redaction legible), only the value is dropped. Case
    // insensitive and accepts snake_case/camelCase key names too (not just
    // SCREAMING_SNAKE_CASE): `access_token=`, `apiKey:`, `password:` are at
    // least as common in issue/PR prose as `GOOGLE_CLIENT_SECRET=`.
    // Negative lookahead on the value keeps this from re-matching output
    // already redacted by an earlier pattern in this same pass (e.g.
    // "token: ghp_..." → github-token redacts the value first, and without
    // the lookahead this pattern would then match "token: [REDACTED:...]"
    // again, double-counting and re-mangling an already-safe value).
    name: 'sensitive-assignment',
    regex:
      /\b([A-Za-z0-9_]*(?:secret|token|password|passwd|api[_-]?key|private[_-]?key)[A-Za-z0-9_]*)\s*[:=]\s*(?!\[REDACTED)("[^"\n]*"|'[^'\n]*'|\S+)/gi,
    replace: (_match, key) => `${key}=[REDACTED]`,
  },
]

export function redactSecrets(text) {
  if (!text) return { text: text ?? '', count: 0 }
  let result = text
  let count = 0
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern.regex, (...args) => {
      count += 1
      return pattern.replace(...args)
    })
  }
  return { text: result, count }
}

// Same anchored-at-line-start convention as extractBlockerNumbers
// (sync-issue-dependencies.mjs): a prose mention of the section name, or one
// inside a fenced code block, never hijacks the match. Returns `null` when
// the section is absent (explicitly unavailable — distinct from "present but
// empty", which returns `[]`).
export function extractRelevantFiles(body) {
  const text = (body ?? '').replace(/```[\s\S]*?```/g, '')
  const match = text.match(/(?:^|\n)##\s*Fichiers impact[ée]s\b([\s\S]*?)(?=\n##\s|$)/i)
  if (!match) return null
  const files = [...match[1].matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim()).filter(Boolean)
  return [...new Set(files)]
}

// Bounded, deterministic mapping from a file path to its workspace package
// (doc/technical/architecture.md § Repository layout): the host app
// (`apps/scoreo/`) collapses to "scoreo", a `packages/<name>/` file maps to
// `<name>`, anything else (root config, `doc/`, `.github/`, ...) to "root".
export function derivePackages(filePaths) {
  const packages = new Set()
  for (const path of filePaths) {
    if (path.startsWith('apps/scoreo/')) {
      packages.add('scoreo')
    } else if (path.startsWith('packages/')) {
      const segment = path.split('/')[1]
      if (segment) packages.add(segment)
    } else {
      packages.add('root')
    }
  }
  return [...packages].sort()
}

function boundList(items, max) {
  const truncated = items.length > max
  return { items: truncated ? items.slice(0, max) : items, truncated }
}

function buildFilesSection({ body, changedFiles, limits }) {
  const relevantRaw = extractRelevantFiles(body)
  const relevantAvailable = relevantRaw !== null
  const relevantBounded = boundList(relevantRaw ?? [], limits.maxRelevantFiles)

  const changedAvailable = Array.isArray(changedFiles)
  const changedBounded = boundList(changedAvailable ? changedFiles : [], limits.maxChangedFiles)

  return {
    relevant: {
      available: relevantAvailable,
      items: relevantBounded.items,
      truncated: relevantAvailable && relevantBounded.truncated,
      unavailableReason: relevantAvailable
        ? null
        : 'no "## Fichiers impactés" section in the entity body',
    },
    changed: {
      available: changedAvailable,
      items: changedBounded.items,
      truncated: changedAvailable && changedBounded.truncated,
      unavailableReason: changedAvailable ? null : 'changed-file list not provided to this run',
    },
  }
}

// Declared dependencies (the "## Dépendances" section, same parser as
// sync-issue-dependencies.mjs) are always derivable from the payload alone.
// The native `blocked_by` links require an API call this zero-network script
// never makes itself — a caller that already has them (e.g. the dispatcher,
// which reads them for promotion decisions) can pass them in; otherwise
// they're marked explicitly unavailable rather than assumed empty.
function buildDependenciesSection({ body, knownBlockers }) {
  const declared = extractBlockerNumbers(body)
  return {
    declared: declared ?? [],
    declaredAvailable: declared !== null,
    nativeBlockers: Array.isArray(knownBlockers) ? knownBlockers : [],
    nativeBlockersAvailable: Array.isArray(knownBlockers),
  }
}

// A real unified diff needs a paginated files/diff API call this script
// deliberately never makes (test strategy: fixtures only, no network calls).
// What the webhook payload already carries for a pull_request — changed
// file/addition/deletion counts — becomes the diff "summary"; anything else
// (an issue with no PR, a payload missing those counts, or a PR too large to
// summarize meaningfully) is marked unavailable with a stated reason, never
// silently dropped.
function buildDiffSection({ entityType, pullRequest, limits }) {
  if (entityType !== 'pull_request') {
    return {
      available: false,
      summary: null,
      unavailableReason: 'entity is an issue, not a pull request',
    }
  }
  const stats = pullRequest ?? {}
  if (
    typeof stats.changed_files !== 'number' ||
    typeof stats.additions !== 'number' ||
    typeof stats.deletions !== 'number'
  ) {
    return {
      available: false,
      summary: null,
      unavailableReason: 'diff stats missing from the pull_request payload',
    }
  }
  if (stats.changed_files > limits.maxChangedFiles) {
    return {
      available: false,
      summary: null,
      unavailableReason: `pull request too large to summarize (${stats.changed_files} files > ${limits.maxChangedFiles})`,
    }
  }
  return {
    available: true,
    summary: {
      changedFiles: stats.changed_files,
      additions: stats.additions,
      deletions: stats.deletions,
    },
    unavailableReason: null,
  }
}

function labelNames(labels) {
  return (labels ?? []).map((label) => (typeof label === 'string' ? label : label.name))
}

// Returns `null` for an event this script doesn't know how to describe (an
// unhandled event type, or an `issues`/`pull_request` payload missing its
// own entity) — the caller must fail explicitly rather than build a partial
// context from it.
function buildEntity(eventName, payload) {
  if (eventName === 'issues' && payload?.issue) {
    const issue = payload.issue
    return {
      type: 'issue',
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      state: issue.state,
      labels: labelNames(issue.labels),
      body: issue.body ?? '',
    }
  }
  if (eventName === 'pull_request' && payload?.pull_request) {
    const pr = payload.pull_request
    return {
      type: 'pull_request',
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      labels: labelNames(pr.labels),
      body: pr.body ?? '',
      draft: Boolean(pr.draft),
      merged: Boolean(pr.merged),
      headSha: pr.head?.sha ?? null,
      baseRef: pr.base?.ref ?? null,
    }
  }
  return null
}

// Pure: the same input always produces the same output (acceptance
// criterion — "le contexte d'une issue et celui d'une PR sont reproductibles
// à partir des mêmes entrées"), provided the caller pins `generatedAt`
// (defaults to "now" only for the CLI path, where reproducibility isn't the
// point — traceability is).
export function buildTaskContext({
  eventName,
  payload,
  routine,
  runId,
  attempt = 1,
  trigger = {},
  resultUrl = null,
  repository = null,
  changedFiles = null,
  knownBlockers = null,
  limits = DEFAULT_LIMITS,
  generatedAt = new Date().toISOString(),
}) {
  const entity = buildEntity(eventName, payload)
  if (!entity) {
    throw new Error(
      `task-context: unhandled or incomplete event — no describable issue/pull_request entity for eventName="${eventName}"`,
    )
  }
  if (!routine || !runId) {
    throw new Error('task-context: "routine" and "runId" are required to build a context')
  }

  const titleRedaction = redactSecrets(entity.title ?? '')
  const bodyRedaction = redactSecrets(entity.body ?? '')
  const totalRedactions = titleRedaction.count + bodyRedaction.count

  const bodyTruncated = bodyRedaction.text.length > limits.maxBodyChars
  const bodyExcerpt = bodyTruncated
    ? bodyRedaction.text.slice(0, limits.maxBodyChars)
    : bodyRedaction.text

  const files = buildFilesSection({ body: entity.body, changedFiles, limits })
  const packages = derivePackages([...files.relevant.items, ...files.changed.items])
  const dependencies = buildDependenciesSection({ body: entity.body, knownBlockers })
  const diff = buildDiffSection({
    entityType: entity.type,
    pullRequest: payload.pull_request,
    limits,
  })

  const truncatedFields = []
  if (files.relevant.truncated) truncatedFields.push('files.relevant')
  if (files.changed.truncated) truncatedFields.push('files.changed')
  if (bodyTruncated) truncatedFields.push('entity.bodyExcerpt')

  return {
    version: TASK_CONTEXT_VERSION,
    runId: String(runId),
    routine,
    attempt,
    trigger: {
      event: trigger.event ?? eventName,
      label: trigger.label ?? null,
      actor: trigger.actor ?? null,
    },
    entity: {
      type: entity.type,
      number: entity.number,
      title: titleRedaction.text,
      url: entity.url,
      state: entity.state,
      labels: entity.labels,
      bodyExcerpt,
      ...(entity.type === 'pull_request'
        ? {
            draft: entity.draft,
            merged: entity.merged,
            headSha: entity.headSha,
            baseRef: entity.baseRef,
          }
        : {}),
    },
    repository: repository ?? { owner: null, name: null },
    files,
    packages,
    dependencies,
    diff,
    constraints: { ...limits },
    truncation: { applied: truncatedFields.length > 0, fields: truncatedFields },
    redaction: { applied: totalRedactions > 0, occurrences: totalRedactions },
    resultUrl,
    generatedAt,
  }
}

const REQUIRED_TOP_FIELDS = [
  'version',
  'runId',
  'routine',
  'attempt',
  'trigger',
  'entity',
  'repository',
  'files',
  'packages',
  'dependencies',
  'diff',
  'constraints',
  'truncation',
  'redaction',
  'resultUrl',
  'generatedAt',
]

// Hand-written structural validator mirroring
// schemas/automation/task-context.schema.json — same precedent as
// automation-dispatch.mjs's validateRoutinesConfig for routines.schema.json
// (schemas/ documents the contract, a plain script enforces it).
export function validateTaskContext(context) {
  const errors = []
  if (!context || typeof context !== 'object') {
    return { valid: false, errors: ['task-context: root must be an object'] }
  }

  for (const field of REQUIRED_TOP_FIELDS) {
    if (context[field] === undefined) {
      errors.push(`task-context.${field}: champ requis manquant`)
    }
  }
  if (context.version !== TASK_CONTEXT_VERSION) {
    errors.push(
      `task-context.version: doit être ${TASK_CONTEXT_VERSION} (valeur: ${JSON.stringify(context.version)})`,
    )
  }
  if (context.entity && !['issue', 'pull_request'].includes(context.entity.type)) {
    errors.push(
      `task-context.entity.type: doit être "issue" ou "pull_request" (valeur: ${JSON.stringify(context.entity?.type)})`,
    )
  }
  if (
    context.attempt !== undefined &&
    (!Number.isInteger(context.attempt) || context.attempt < 1)
  ) {
    errors.push('task-context.attempt: doit être un entier >= 1')
  }
  if (context.truncation && typeof context.truncation.applied !== 'boolean') {
    errors.push('task-context.truncation.applied: doit être un booléen')
  }
  if (context.redaction && typeof context.redaction.applied !== 'boolean') {
    errors.push('task-context.redaction.applied: doit être un booléen')
  }

  return { valid: errors.length === 0, errors }
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  const eventName = process.env.GITHUB_EVENT_NAME
  if (!eventPath || !eventName) {
    console.error('::error::task-context: GITHUB_EVENT_PATH/GITHUB_EVENT_NAME manquant(s)')
    process.exitCode = 1
    return
  }

  const payload = JSON.parse(readFileSync(eventPath, 'utf8'))
  const routine = process.env.TASK_CONTEXT_ROUTINE ?? 'unknown'
  const runId = process.env.GITHUB_RUN_ID ?? 'unknown'
  const attempt = Number(process.env.TASK_CONTEXT_ATTEMPT ?? '1')
  const resultUrl =
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null

  let context
  try {
    context = buildTaskContext({
      eventName,
      payload,
      routine,
      runId,
      attempt,
      trigger: {
        event: payload.action ? `${eventName}.${payload.action}` : eventName,
        label: payload.label?.name ?? null,
        actor: payload.sender?.login ?? null,
      },
      resultUrl,
      repository: {
        owner: process.env.REPO_OWNER ?? payload.repository?.owner?.login ?? null,
        name: process.env.REPO_NAME ?? payload.repository?.name ?? null,
      },
    })
  } catch (err) {
    console.error(`::error::task-context: ${err.message}`)
    process.exitCode = 1
    return
  }

  const { valid, errors } = validateTaskContext(context)
  if (!valid) {
    for (const error of errors) console.error(`::error::${error}`)
    process.exitCode = 1
    return
  }

  const outputPath = process.env.TASK_CONTEXT_OUTPUT_PATH ?? 'task-context.json'
  writeFileSync(outputPath, JSON.stringify(context, null, 2))
  console.log(
    `task-context: écrit dans ${outputPath} (entity=${context.entity.type}#${context.entity.number}, ` +
      `redactions=${context.redaction.occurrences}, truncated=${context.truncation.applied})`,
  )
}

// Same guard as every other scripts/*.mjs: GITHUB_EVENT_PATH is set for
// every step of every Actions job, including `pnpm test` — importing this
// module from its test file must not run main().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
