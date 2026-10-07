#!/usr/bin/env bash
# Checks post-ecriture : typecheck + lint + tests.
# Appele par le plugin OpenCode .opencode/plugin/checks.js et par le hook Claude Code
# (.claude/settings.json) apres chaque ecriture d'un fichier .ts.
# Objectif : l'agent voit le resultat de ses checks sans qu'on ait a le lui demander.
set +e
status=0

echo "--- typecheck"
npm run --silent typecheck || status=1
echo "--- lint"
npm run --silent lint || status=1
echo "--- tests"
npm test --silent || status=1

if [ "$status" -ne 0 ]; then
  echo "--- CHECKS ROUGES : au moins un check a echoue (voir plus haut). Corrige avant de continuer."
else
  echo "--- checks verts"
fi

# Le code de sortie dit la verite. Ne pas interrompre l'agent en plein travail
# (INFRA-231) est la responsabilite de l'appelant : le plugin lit la sortie sans lever
# d'erreur. Ce qui bloque vraiment, c'est le pre-commit et la CI.
exit "$status"
