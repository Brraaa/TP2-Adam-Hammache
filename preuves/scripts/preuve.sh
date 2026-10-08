#!/usr/bin/env bash
# Rejoue une preuve du diagnostic dans un clone du depot.
#   bash preuves/scripts/preuve.sh <nom> [dossier-du-clone]
# Les preuves qui salissent le depot (fichier fautif, commit de test) nettoient derriere
# elles : a lancer dans un clone jetable, pas dans l'arbre de travail.
export PATH="/c/Program Files/nodejs:$PATH"
here="$(cd "$(dirname "$0")" && pwd)"
cd "${2:-.}" || exit 1

run() { printf '\033[33m$ %s\033[0m\n' "$*"; eval "$*"; }
code() { printf '\033[33m$ %s\033[0m\n' "$*"; eval "$*"; printf '\033[35m  -> code de sortie : %s\033[0m\n' "$?"; }
titre() { printf '\033[36m== %s ==\033[0m\n' "$*"; }
nocolor() { sed 's/\x1b\[[0-9;]*m//g'; }

sale() {
  cat > src/sale.ts <<'EOF'
var inutilise = 1
export function f(a, b) { if (a == b) { debugger; } const x: any = eval("1"); return }
EOF
}

case "$1" in
  rules)
    titre "Les commandes documentees dans AGENTS.md existent-elles ?"
    for c in $(grep -oE '^\| `npm (run )?[a-z:]+`' AGENTS.md | grep -oE '[a-z:]+`$' | tr -d '`' | grep -vE '^(install|run)$'); do
      if node -e "process.exit(require('./package.json').scripts['$c'] ? 0 : 1)"; then
        printf '  %-16s documentee, et le script existe\n' "$c"
      else
        printf '  \033[31m%-16s documentee, mais : %s\033[0m\n' "$c" "$(npm run "$c" 2>&1 | head -1)"
      fi
    done
    titre "src/lib/AGENTS.md exige un export default par module"
    run "grep -n 'export default' src/lib/AGENTS.md | head -3"
    run "grep -c 'export default' src/lib/*.ts"
    ;;
  tests)
    titre "Combien de tests existent, combien s'executent ?"
    run "grep -cE '^\s*it(\.skip|\.each\(.*\))?\(' test/*.ts"
    run "cat vitest.config.ts | grep -n include | head -2"
    run "npx vitest run 2>&1 | nocolor | grep -E '✓|❯|×|Test Files|Tests '"
    ;;
  tests-tous)
    titre "Les memes tests, sans le filtre *.spec.ts de vitest.config.ts"
    printf 'import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: { include: ["test/**/*.{spec,test}.ts"] } });\n' > vitest.tous.config.ts
    run "npx vitest run -c vitest.tous.config.ts 2>&1 | nocolor | grep -E '❯|×|→|Test Files|Tests '"
    rm -f vitest.tous.config.ts
    ;;
  lint)
    titre "Un fichier volontairement fautif : var, ==, debugger, any, eval, parametres non types"
    sale
    run "cat src/sale.ts"
    code "npx eslint src"
    code "npx tsc --noEmit"
    rm -f src/sale.ts
    ;;
  hooks)
    titre "Le pre-commit est-il branche, et bloque-t-il un commit fautif ?"
    run "git config core.hooksPath; ls .husky"
    run "npm ls husky 2>&1 | tail -1"
    depart=$(git rev-parse HEAD)
    sale
    git add src/sale.ts
    code "git commit -q -m 'test: fichier fautif' > .commit.log 2>&1"
    nocolor < .commit.log | grep -E 'error|problems|husky|Tests ' | tail -6; rm -f .commit.log
    run "git log --oneline | head -1"
    git reset -q --hard "$depart"
    rm -f src/sale.ts
    ;;
  checks)
    titre "scripts/checks.sh sur un depot ou un check est rouge : que dit son code de sortie ?"
    sale
    code "bash scripts/checks.sh > .checks.log 2>&1"
    nocolor < .checks.log | grep -E '^---'; rm -f .checks.log
    rm -f src/sale.ts
    ;;
  bugs)
    titre "L'API reelle, sur le port 3111"
    PORT=3111 npx tsx src/server.ts > /dev/null 2>&1 &
    sleep 5
    post() { curl -s -w '  [HTTP %{http_code}]\n' -X POST localhost:3111/bookings -H 'content-type: application/json' -d "$1"; }
    echo "Samedi 10/10/2026, salle-a (25 EUR/h), 2 h : prix attendu 50 + 20 = 70"
    run "post '{\"roomId\":\"salle-a\",\"who\":\"moi\",\"people\":4,\"startsAt\":\"2026-10-10T09:00:00Z\",\"endsAt\":\"2026-10-10T11:00:00Z\"}'"
    echo "bk-1001 occupe salle-a de 09:00 a 11:00 ; on reserve 11:00-12:00, bout a bout"
    run "post '{\"roomId\":\"salle-a\",\"who\":\"moi\",\"people\":4,\"startsAt\":\"2026-10-05T11:00:00Z\",\"endsAt\":\"2026-10-05T12:00:00Z\"}'"
    echo "Une date qui n'est pas de l'ISO 8601 UTC (AGENTS.md, convention 3)"
    run "post '{\"roomId\":\"salle-b\",\"who\":\"moi\",\"people\":2,\"startsAt\":\"Nov 2 2026\",\"endsAt\":\"3 November 2026 10:00\"}'"
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3111 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }" > /dev/null 2>&1
    ;;
  mcp)
    titre "Chaque MCP declare dans opencode.json : repond-il, et que coute-t-il en contexte ?"
    run "node -e \"console.log(Object.keys(require('./opencode.json').mcp ?? {}).join(', ') || '(aucun MCP declare)')\""
    run "node '$here/../mesure-mcp.mjs' opencode.json 2>&1 | cut -c1-230"
    ;;
  mcp-detail)
    titre "Serveurs locaux : demarrage, outils qui ecrivent, un vrai appel sans jeton"
    run "node '$here/../mesure-mcp-detail.mjs' opencode.json 2>&1 | cut -c1-200"
    titre "Paquets lances par npx -y : version figee ? toujours maintenus ?"
    for p in $(node -e "for (const c of Object.values(require('./opencode.json').mcp ?? {})) if (c.command) console.log(c.command[c.command.length-1])"); do
      printf '  %-40s deprecie sur npm : %s
' "$p" "$(npm view "${p%@latest}" deprecated 2>/dev/null | head -c 34 | grep . || echo non)"
    done
    titre "Jetons : attendus par la config, fournis nulle part"
    run "grep -o '[$]{[A-Z_]*}' opencode.json; grep -c environment opencode.json; git show HEAD:.env 2>/dev/null | grep -c SALLES_MCP_TOKEN"
    titre "Qui s'en sert ? (rules, README, prompts des agents, command)"
    run "grep -rniE 'salles-db|github|notion|slack|sentry|playwright|mcp' AGENTS.md README.md .opencode/agent .opencode/command | wc -l"
    run "grep -lE '(salles|github|notion|slack|sentry|playwright).*: *(allow|ask)' .opencode/agent/*.md | wc -l; grep -l '\"\*\": deny' .opencode/agent/*.md | wc -l"
    run "git log --format='%h %ad %s' --date=short -- opencode.json | head -3"
    ;;
  couverture)
    titre "Couverture des tests qui s'executent"
    run "npx vitest run --coverage --coverage.include='src/**' --coverage.reporter=text 2>&1 | nocolor | grep -E '^\s*(File|All files|[a-z/.]+\.ts| lib| routes| src)|Tests '"
    ;;
  ci-git)
    titre "Que lance la CI ? Que suit Git ?"
    run "grep -n 'run:' .github/workflows/ci.yml"
    run "git ls-files | grep -i '\.env'; grep -n 'env' .gitignore"
    ;;
  droits)
    titre "Mode et droits de chaque agent (lecture des frontmatters)"
    for a in architect planner finder explorer dev reviewer tester; do
      f=.opencode/agent/$a.md
      printf '\033[33m%-10s\033[0m %s | %s\n' "$a" "$(grep -m1 '^mode:' $f)" "$(awk '/^permission:/{p=1;next} /^---/{p=0} p' $f | grep -E '^  ("\*"|edit|task|webfetch|bash):' | tr -s ' ' | tr '\n' ';')"
    done
    titre "finder : ordre des regles (dans OpenCode, la derniere qui correspond l'emporte)"
    run "awk '/^permission:/{p=1} /^---/{if(p)exit} p' .opencode/agent/finder.md"
    titre "L'orchestrateur connait-il tester ? Peut-il tout faire lui-meme ?"
    run "grep -c '^| .tester' .opencode/agent/architect.md; grep -n 'answered by a subagent' .opencode/agent/architect.md"
    ;;
  *) echo "preuve inconnue : $1"; exit 1 ;;
esac
