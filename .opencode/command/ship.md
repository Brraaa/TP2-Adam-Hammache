---
description: Livre le travail en cours sur sa branche, apres avoir reprouve qu'il est vert
agent: architect
---

Le travail est pret a etre livre. Avant de livrer, prouve-le :

1. `git status` et `git branch --show-current`. Si la branche est `main`, arrete-toi et
   dis-le : on ne commite pas dans `main` (AGENTS.md). Propose un nom de branche.
2. `npm run check` (typecheck, lint, tests). Le hook post-ecriture avertit mais ne bloque
   pas : c'est ici que le vert se verifie. Si un check est rouge, arrete-toi et colle la
   sortie. Ne livre pas.
3. Si le diff n'a pas ete attaque par `reviewer` dans cette session, demande-lui un
   verdict. `VERDICT: BLOCKING` arrete la livraison.
4. Montre `git diff --stat` et la liste des fichiers que tu vas ajouter, un par un.
   Jamais `git add -A` : il embarque ce qui traine (fichiers d'environnement, brouillons).
5. `git add <fichiers>`, puis `git commit -m "<type>: <resume en une ligne>"`. Le
   pre-commit relance les checks ; s'il echoue, rapporte l'echec, ne le contourne pas
   (`--no-verify` est interdit).
6. `git push -u origin <branche>` et donne la commande pour ouvrir la PR.

Les etapes 5 et 6 demandent une confirmation : c'est voulu.
