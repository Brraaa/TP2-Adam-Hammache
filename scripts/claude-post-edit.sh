#!/usr/bin/env bash
# Hook PostToolUse de Claude Code : equivalent du plugin OpenCode .opencode/plugin/checks.js.
# Lit l'evenement sur stdin ; si le fichier ecrit est un .ts, relance scripts/checks.sh.
# Sortie 2 = le rouge est renvoye a l'agent, qui doit corriger (l'ecriture, elle, a deja eu lieu).
file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input.file_path||"")}catch{console.log("")}})')
case "$file" in
  *.ts) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
out=$(bash scripts/checks.sh 2>&1)
if [ $? -ne 0 ]; then
  echo "$out" | tail -40 >&2
  exit 2
fi
exit 0
