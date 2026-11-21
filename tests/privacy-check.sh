#!/usr/bin/env bash
# bash tests/privacy-check.sh [сирий JSON Олени поза репо]
# Перевіряє ВСЮ історію git (усі гілки, усі коміти): сирого файлу Олени та його службових полів там бути не може.
# Із шляхом до сирого файлу додатково шукає його точні значення: відповіді одним рядком, хеш, час, браузер.
set -uo pipefail
cd "$(dirname "$0")/.."
bad=0
names=$(git log --all --name-only --pretty=format: | sort -u | grep -Ei '(olena|mirror-mbti).*\.json$|raw|private' | grep -vx 'reference.json' || true)
if [ -n "$names" ]; then echo "✗ в історії є підозрілі файли:"; echo "$names"; bad=1; fi
PAT='"(session|time_sec|user_agent|timezone|started_at|finished_at|duration_sec|answering_time_sec|changes|integrity|answers_sha256|answers_compact|position|weighted)" *:|iPhone OS|Mozilla/5\.0|Europe/Kiev'
hits=$(git log --all -p -- . ':(exclude)tests/privacy-check.sh' | grep -E "^\+.*($PAT)" || true)
if [ -n "$hits" ]; then echo "✗ у вмісті історії знайдено службові поля:"; echo "$hits" | head -5; bad=1; fi
if [ -n "${1:-}" ]; then
  while IFS= read -r v; do
    [ -z "$v" ] && continue
    if git log --all -p | grep -qF -- "$v"; then echo "✗ в історії знайдено значення з сирого файлу: ${v:0:24}…"; bad=1; fi
  done < <(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
    console.log([r.answers_compact,r.integrity&&r.integrity.answers_sha256,r.session&&r.session.started_at,r.session&&r.session.finished_at,r.session&&r.session.user_agent].filter(Boolean).join("\n"))' "$1")
fi
commits=$(git rev-list --all | wc -l | tr -d ' ')
if [ $bad -eq 0 ]; then echo "✓ історія чиста: комітів $commits, сирого файлу й полів session/time_sec/changes/integrity немає"; fi
exit $bad
