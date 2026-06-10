#!/usr/bin/env bash
# Worker for the AI commit-review hook.
# Reviews ONE commit with Claude (your logged-in subscription — no API key),
# pushes it, and posts the review to GitHub as a commit comment.
# Invoked in the background by .githooks/post-commit.
#
# Debug log: .git/ai-review.log
set -uo pipefail

SHA="${1:-$(git rev-parse HEAD)}"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 0

LOG="$ROOT/.git/ai-review.log"
exec >>"$LOG" 2>&1
echo "=== $(date '+%F %T')  review $SHA ==="

# --- prerequisites (fail quietly, just log) ---
command -v claude >/dev/null 2>&1 || { echo "SKIP: claude CLI not found (install Claude Code, run 'claude' once to log in)"; exit 0; }
command -v gh     >/dev/null 2>&1 || { echo "SKIP: gh CLI not found (brew install gh; gh auth login)"; exit 0; }

BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# Diff of just this commit, capped so a huge commit can't blow up tokens.
DIFF="$(git show --no-color "$SHA" | head -c 60000)"
[ -z "$DIFF" ] && { echo "SKIP: empty diff"; exit 0; }

RUBRIC="$(cat "$ROOT/.githooks/review-prompt.md" 2>/dev/null || true)"
REVIEW="$(mktemp)"

# Build the review. Rubric + diff go in as context; the instruction is the prompt.
printf '%s\n\n# レビュー対象コミット: %s\n\n```diff\n%s\n```\n' "$RUBRIC" "$SHA" "$DIFF" \
  | claude -p "上の#観点と#出力フォーマットに従って、このdiffだけを見てコードレビューを書いて。ツールは使わず、出力は日本語Markdownのレビュー本文のみ。" \
  > "$REVIEW" 2>>"$LOG" || { echo "SKIP: claude review failed (see log above)"; rm -f "$REVIEW"; exit 0; }

[ -s "$REVIEW" ] || { echo "SKIP: empty review"; rm -f "$REVIEW"; exit 0; }

# The commit must exist on GitHub before we can comment on it.
git push origin "$BRANCH" >/dev/null 2>&1 || { echo "SKIP: push failed — is 'origin' set? (gh repo create ... --push)"; rm -f "$REVIEW"; exit 0; }

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)"
[ -z "$REPO" ] && { echo "SKIP: no GitHub repo found (run: gh repo create)"; rm -f "$REVIEW"; exit 0; }

if gh api -X POST "repos/$REPO/commits/$SHA/comments" -F body=@"$REVIEW" >/dev/null 2>&1; then
  echo "OK: posted review to $REPO @ $SHA"
else
  echo "ERROR: failed to post comment (check: gh auth status)"
fi
rm -f "$REVIEW"
