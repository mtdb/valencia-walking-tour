#!/usr/bin/env bash
# Publish the guide from a terminal with writable Git metadata and GitHub access.
set -euo pipefail
cd "$(dirname "$0")/.."
repo='mtdb/valencia-walking-tour'
remote='git@github.com:mtdb/valencia-walking-tour.git'
for command in git gh node curl; do
  command -v "$command" >/dev/null || { echo "Required command missing: $command" >&2; exit 1; }
done
gh auth status
gh repo view "$repo" --json nameWithOwner --jq .nameWithOwner
node tools/check-tour.mjs
node --test tests/*.test.mjs
node tools/build.mjs
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  git init -b main
fi
if [[ "$(git branch --show-current)" != main ]]; then
  echo 'Run this script from the main branch.' >&2
  exit 1
fi
if git remote get-url origin >/dev/null 2>&1; then
  if [[ "$(git remote get-url origin)" != "$remote" ]]; then
    echo 'Origin already points to another repository. It has not been changed.' >&2
    exit 1
  fi
else
  git remote add origin "$remote"
fi
git add -u
git add -- .github .gitignore .nojekyll *.md index.html manifest.webmanifest package.json pnpm-lock.yaml src styles.css sw.js tests tools icons
if ! git diff --cached --quiet; then
  git commit -m 'feat(tour): add Valencia walking guide' -m $'- Add the circular route, practical information and optional visit budget\n- Include hourly weather, photographs, navigation and offline reading\n- Add validation tools and GitHub Pages deployment'
fi
git push -u origin main
pages_error=$(mktemp)
trap 'rm -f "$pages_error"' EXIT
if gh api "repos/$repo/pages" >/dev/null 2>"$pages_error"; then
  gh api --method PUT "repos/$repo/pages" -f build_type=workflow
elif [[ "$(cat "$pages_error")" == *'(HTTP 404)'* ]]; then
  gh api --method POST "repos/$repo/pages" -f build_type=workflow
else
  cat "$pages_error" >&2
  exit 1
fi
# Dispatch after Pages is enabled, even if the initial push ran before setup.
gh workflow run pages.yml --repo "$repo" --ref main
publish_head=$(git rev-parse HEAD)
run_id=''
for attempt in {1..20}; do
  run_id=$(gh run list --repo "$repo" --workflow pages.yml --event workflow_dispatch --commit "$publish_head" --limit 1 --json databaseId --jq '.[0].databaseId // empty')
  [[ -n "$run_id" ]] && break
  sleep 3
done
if [[ -z "$run_id" ]]; then
  echo "Deployment submitted. Check https://github.com/$repo/actions" >&2
  exit 1
fi
gh run watch "$run_id" --repo "$repo" --exit-status
site_url=$(gh api "repos/$repo/pages" --jq .html_url)
curl --fail --location --retry 5 --retry-delay 3 --max-time 30 --output /dev/null "$site_url"
printf 'Published: %s\n' "$site_url"
