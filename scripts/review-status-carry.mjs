// Calcul de décision de `.github/workflows/review-status-carry.yml` (#586) :
// le diff de la PR contre sa base est-il le même avant et après un push ?
// On compare le `git patch-id --stable` du diff `-U0` pris depuis le
// merge-base, pour qu'un rebase pur ou un merge sans conflit de la base (même
// quand elle touche une ligne voisine) ne change pas l'empreinte, alors que
// tout vrai changement du diff, si.
//
// Résultat :
//   - 'same'        : empreintes identiques, la revue peut être reportée ;
//   - 'changed'     : le diff a changé, la revue ne couvre plus ce qui serait fusionné ;
//   - 'unavailable' : le SHA précédent est introuvable (force-push, objet purgé),
//                     traité comme 'changed' par le workflow (pas de report).

import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

function git(cwd, args, input) {
  return execFileSync('git', args, {
    cwd,
    input,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

function commitExists(cwd, sha) {
  try {
    git(cwd, ['cat-file', '-e', `${sha}^{commit}`])
    return true
  } catch {
    return false
  }
}

// Empreinte du diff de `sha` contre le merge-base avec `base`. Un diff vide
// donne une chaîne vide (`git patch-id` n'imprime rien) : deux diffs vides
// restent donc égaux.
export function patchId(cwd, base, sha) {
  const mergeBase = git(cwd, ['merge-base', base, sha]).trim()
  const diff = git(cwd, ['diff', '-U0', mergeBase, sha])
  return git(cwd, ['patch-id', '--stable'], diff).trim().split(/\s+/)[0] ?? ''
}

export function compareReviewedDiff({ cwd = process.cwd(), base, before, after }) {
  if (!commitExists(cwd, before)) return 'unavailable'
  try {
    return patchId(cwd, base, before) === patchId(cwd, base, after) ? 'same' : 'changed'
  } catch {
    // Pas de merge-base, ou objet manquant : on ne peut pas affirmer l'égalité.
    return 'unavailable'
  }
}

function main() {
  const { BASE_REF, BEFORE, AFTER, GITHUB_OUTPUT } = process.env
  if (!BASE_REF || !BEFORE || !AFTER) {
    console.error('BASE_REF, BEFORE et AFTER sont requis')
    process.exit(2)
  }
  const result = compareReviewedDiff({ base: `origin/${BASE_REF}`, before: BEFORE, after: AFTER })
  console.log(`patch-id comparison: ${result}`)
  if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `result=${result}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
