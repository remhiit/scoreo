#!/usr/bin/env bash
# One-time repo setup for the automation plan (doc/technical/automation-plan.md, Phase 0).
#
# Run manually by a repo admin with the GitHub CLI authenticated
# (`gh auth login`, `repo` + `admin:repo_hook` scopes). Not part of CI:
# it changes shared repo configuration (branch protection, secrets, labels).
#
# Usage:
#   GOOGLE_CLIENT_ID=xxx PROJECT_TOKEN=xxx ./setup-repo.sh
set -euo pipefail

REPO="${REPO:-remhiit/scoreo}"

echo "== Labels =="
declare -A LABELS=(
  [queued]="fef2c0:Spec validée, en attente d'un créneau de routine — promue en ready par le dispatcher"
  [ready]="0e8a16:Spec validée, prête pour implémentation (déclenche R2)"
  [in-progress]="fbca04:Une routine travaille dessus"
  [needs-review]="1d76db:En file d'attente pour pr-review (R3) — pose ce label pour (re)déclencher une review"
  [review-pass]="0e8a16:pr-review (R3) a validé la PR — claude/review passe au vert"
  [needs-fix]="d93f0b:claude/review a échoué (déclenche R4)"
  [needs-human]="b60205:Escalade : plafond d'itérations ou hors périmètre"
  [blocked]="5319e7:Dépendance externe"
  [auto]="0052cc:Autorisé à l'auto-merge une fois les checks verts"
  [attempt-1]="c5def5:Compteur anti-boucle R4"
  [attempt-2]="c5def5:Compteur anti-boucle R4"
  [attempt-3]="c5def5:Compteur anti-boucle R4 — à ce stade, stop"
  [P0]="e11d21:Priorité 0"
  [P1]="eb6420:Priorité 1"
  [P2]="fbca04:Priorité 2"
  [P3]="cfd3d7:Priorité 3"
)

existing_labels="$(gh label list --repo "$REPO" --json name -q '.[].name')"

for name in "${!LABELS[@]}"; do
  IFS=':' read -r color desc <<< "${LABELS[$name]}"
  if grep -qx "$name" <<< "$existing_labels"; then
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$desc"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc"
  fi
done

echo "== Auto-merge =="
gh api "repos/$REPO" -X PATCH -f allow_auto_merge=true >/dev/null

echo "== GOOGLE_CLIENT_ID secret =="
if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
  gh secret set GOOGLE_CLIENT_ID --repo "$REPO" --body "$GOOGLE_CLIENT_ID"
else
  echo "GOOGLE_CLIENT_ID env var not set — skipping. Re-run as:"
  echo "  GOOGLE_CLIENT_ID=xxx ./setup-repo.sh"
fi

echo "== PROJECT_TOKEN secret (Project status sync) =="
if [ -n "${PROJECT_TOKEN:-}" ]; then
  gh secret set PROJECT_TOKEN --repo "$REPO" --body "$PROJECT_TOKEN"
else
  echo "PROJECT_TOKEN env var not set — skipping. Needs a classic PAT with the"
  echo "'project' scope (fine-grained PATs don't yet cover writes to a user-owned"
  echo "Projects v2 board). Re-run as:"
  echo "  PROJECT_TOKEN=xxx ./setup-repo.sh"
fi

echo "== Branch protection (main) =="
# required_approving_review_count: 0 — no approval mechanism (see automation-plan.md
# §3): the review verdict is a commit status (claude/review), not a GitHub approval,
# since every routine acts under the same GitHub identity and can't approve its own PR.
gh api "repos/$REPO/branches/main/protection" -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=lint" \
  -f "required_status_checks[contexts][]=test" \
  -f "required_status_checks[contexts][]=build" \
  -f "required_status_checks[contexts][]=doc-links" \
  -f "required_status_checks[contexts][]=claude/review" \
  -F "enforce_admins=true" \
  -f "required_pull_request_reviews[required_approving_review_count]=0" \
  -F "restrictions=null" \
  -F "required_linear_history=true" \
  -F "allow_force_pushes=false" \
  -F "allow_deletions=false" \
  >/dev/null

echo "Done."
