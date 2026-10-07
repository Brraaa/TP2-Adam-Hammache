# DIAGNOSTIC — salles-api, le repo malade

Relevés du 7 octobre 2026. Branche de réparation : `reparation-harness`.

## Ce qu'il faut savoir avant de lire

**Le TP a été fait avec Claude Code, pas avec OpenCode.** OpenCode n'a jamais été lancé et
aucun de ses résultats n'est simulé ici. Conséquences :

- Tout ce qui est outillage du dépôt (scripts npm, lint, types, tests, hooks Git, CI, MCP,
  API) a été **exécuté** ; chaque ligne du tableau cite la commande et sa capture.
- La chaîne d'agents `.opencode/` (subagents, droits, command, plugin) a été **lue et
  corrigée, pas exécutée**. Ces lignes sont marquées *lu*. Les corrections de `.opencode/`
  n'ont pas été testées sous OpenCode.
- L'exercice 1 a été joué dans Claude Code, qui ne voit ni `AGENTS.md` ni `.opencode/` sur
  le dépôt d'origine : il montre ce que valent les filets, pas le comportement de
  l'orchestrateur `architect`.

Les captures sont de vraies captures de fenêtres console. Elles montrent le script
[`preuves/scripts/preuve.sh`](preuves/scripts/preuve.sh) rejoué sur un clone du dépôt
d'origine (`avant-*`) puis sur un clone du dépôt réparé (`apres-*`). Les captures de
l'exercice 1 affichent le résumé des transcriptions enregistrées dans
[`preuves/ex1/`](preuves/ex1/), pas l'interface interactive.

**Reste à faire :** pousser. `origin` est le dépôt de l'enseignant ; il faut un dépôt à
toi pour y pousser la branche.

## Exercice 1 — la tâche, avant

Tâche lancée telle quelle, session neuve, sur un clone intact :
[transcription](preuves/ex1/avant.resume.txt), [diff produit](preuves/ex1/avant.diff).

![Exercice 1 avant](captures/avant-10-ex1.png)

Ce qu'on observe :

- **Personne d'autre ne travaille.** Un seul agent, aucun sous-agent, aucune relecture
  indépendante, aucun test de l'application lancée.
- **Il suit une règle fausse.** `src/lib/AGENTS.md` exige un `export default` et interdit
  la JSDoc ; l'agent s'y conforme, alors qu'aucun module existant ne le fait.
- **Tout est vert, et ça ne prouve rien.** Il lance `test:unit`, `typecheck` et `lint` :
  verts. Le lint n'a aucune règle, les types ne sont pas stricts, et les deux fichiers de
  tests qui échoueraient ne sont pas exécutés.
- **Un bug de facturation reste invisible.** Le prix du week-end vaut `"5020"` au lieu de
  `70` ; rien ne le signale, l'agent ne le voit pas.
- **Le résultat est incohérent avec l'existant.** Le nouvel endpoint annonce libre à 11:00
  un créneau que `POST /bookings` refuse (bug de chevauchement). L'agent le remarque et le
  laisse.

## Les problèmes

Quinze, les plus nets, un par ligne. *exécuté* = commande lancée, capture à l'appui.
*lu* = constaté dans le fichier, faute d'avoir lancé OpenCode.

| # | Brique | Symptôme | Cause (fichier) | Réparation |
|---|---|---|---|---|
| 1 | Rules | `npm test` et `npm run build`, documentés, répondent `Missing script`. La consigne « à lancer avant tout commit » est inapplicable. *exécuté* | `AGENTS.md`, `package.json` | Script `test` ajouté, plus `check` (types + lint + tests). `build` retiré de la doc : rien n'est compilé. |
| 2 | Rules | Deux conventions décrivent un dépôt qui n'existe pas : « erreurs en `Result`, jamais de `throw` » (0 `Result` dans `src/`, la validation lève des exceptions) et « un `export default` par module » (0 dans `src/lib/`). L'agent de l'exercice 1 a suivi la seconde. *exécuté* | `AGENTS.md`, `src/lib/AGENTS.md` | Règles réécrites pour décrire ce que fait le code. |
| 3 | MCP | Six serveurs déclarés, aucun ne sert : `salles-db` injoignable, `slack` plante au démarrage, `sentry` répond 401, `github` et `notion` démarrent sans jeton et refusent tout appel, `playwright` pilote un navigateur pour une API sans interface. Ceux qui répondent publient 75 outils, ≈ 28 000 tokens. Aucun prompt ni aucune règle ne les mentionne. *exécuté* | `opencode.json` | Les six retirés. `salles-db` reviendra avec la vraie base (INFRA-140). |
| 4 | Commands | `/ship` fait `git add -A`, commit et push « sans poser de question », interdit de relancer les checks et de demander une relecture. Rien n'empêche de livrer du rouge, ni de livrer sur `main`. *lu* | `.opencode/command/ship.md` | Réécrite : refuse `main`, relance `npm run check`, demande le verdict de `reviewer`, confirmation avant commit et push. |
| 5 | Subagents | Deux des six subagents ne sont pas joignables : `planner` est en `mode: primary`, et `tester` n'apparaît pas dans la table d'équipe de l'orchestrateur. Les étapes « Plan » et test réel n'ont jamais lieu. *lu* | `planner.md`, `architect.md` | `planner` en `mode: subagent` ; `tester` ajouté à la table et à l'étape « Verify ». |
| 6 | Droits | `finder` ne peut rien lire : son `"*": deny` est la dernière règle, et dans OpenCode la dernière règle qui correspond l'emporte. C'est l'agent qui répond sans avoir rien lu. *lu* | `finder.md` | Joker remonté en première ligne, comme chez les autres agents. |
| 7 | Droits | `architect`, qui « never writes code », a `edit: allow` et `bash: "*": allow`, et son prompt l'invite à faire lui-même ce qu'un subagent pourrait faire. Il n'a plus de raison de déléguer. *lu* | `architect.md` | `edit: deny`, `bash` limité à la lecture Git et aux checks ; les deux phrases du prompt rétablies. |
| 8 | Droits | `reviewer` a `edit: allow` et la consigne « fix what you find » : il relit son propre code, alors que son prompt fonde sa valeur sur son indépendance. *lu* | `reviewer.md` | `edit: deny`, règle « never fix anything ». |
| 9 | Droits | Deux subagents sortent de leur rôle : `dev` peut déléguer à d'autres `dev` (`task: allow`), `explorer`, agent de lecture, peut écrire partout et lancer `curl`. *lu* | `dev.md`, `explorer.md` | `task: deny` pour `dev` ; `explorer` limité à ses notes, `curl` retiré. |
| 10 | Hooks | Le pre-commit n'est pas branché : `core.hooksPath` vide, `husky` absent des dépendances, pas de script `prepare`. Un commit d'un fichier fautif passe. *exécuté* | `.husky/pre-commit`, `package.json` | `husky` installé et branché. Le même commit est maintenant refusé. |
| 11 | Hooks | `scripts/checks.sh` renvoie `0` même quand un check est rouge, et `/ship` s'appuie dessus pour ne rien revérifier. *exécuté* | `scripts/checks.sh` | Le script renvoie son vrai code et annonce « CHECKS ROUGES ». |
| 12 | Lint et types | Un fichier avec `var`, `==`, `debugger`, `any`, `eval` et des paramètres non typés passe `eslint` et `tsc` avec le code 0. *exécuté* | `eslint.config.js` (`rules: {}`), `tsconfig.json` (`strict: false`), `// @ts-nocheck` dans `price.ts` | Règles recommandées, `strict: true`, directive retirée. Le même fichier : 6 erreurs de lint, 2 de types. |
| 13 | Tests | 18 tests écrits, 5 exécutés. Deux fichiers ne tournent jamais (le lanceur ne prend que `*.spec.ts`) ; parmi le reste, des `skip` contenant `expect(true).toBe(true)` et des assertions sur un double défini dans le test. Couverture 21 %, score de mutation 4,35 %. *exécuté* | `vitest.config.ts`, `test/*.test.ts`, `test/store.spec.ts`, `test/overlap.spec.ts` | Fichiers renommés, faux tests remplacés, tests ajoutés : 59 tests, couverture 98,8 %, mutation 97,52 %. |
| 14 | CI | La CI ne lance que le lint — celui qui n'a aucune règle. Les tests sont commentés (« ça bloquait les merges »). Une CI verte ne dit rien. *lu ; la CI GitHub n'a pas été déclenchée* | `.github/workflows/ci.yml` | typecheck, lint, tests avec seuils de couverture. |
| 15 | Git | `.env` est suivi par Git (URL de base, secret de session, clé de facturation) et absent de `.gitignore`. *exécuté* | `.env`, `.gitignore` | Retiré de l'index, `.env.example` à la place, `.gitignore` complété. |

### Les captures, brique par brique

Rules (1, 2) :

![Rules avant](captures/avant-01-rules.png)
![Rules après](captures/apres-01-rules.png)

MCP (3) :

![MCP avant](captures/avant-06-mcp.png)
![MCP avant, détail](captures/avant-06b-mcp-detail.png)
![MCP après](captures/apres-06-mcp.png)

Subagents et droits (5 à 9) — lecture des frontmatters :

![Droits avant](captures/avant-08-droits.png)
![Droits après](captures/apres-08-droits.png)

Hooks (10, 11) :

![Hooks avant](captures/avant-04-hooks.png)
![Hooks après](captures/apres-04-hooks.png)

Lint et types (12) :

![Lint avant](captures/avant-03-lint-types.png)
![Lint après](captures/apres-03-lint-types.png)

Tests (13) :

![Tests avant](captures/avant-02-tests.png)
![Tests après](captures/apres-02-tests.png)
![Mesures avant](captures/avant-07-mesures.png)
![Mesures après](captures/apres-07-mesures.png)

CI et Git (14, 15) :

![CI et Git avant](captures/avant-09-ci-git.png)
![CI et Git après](captures/apres-09-ci-git.png)

### Ce que le filet a attrapé une fois réparé

Ce ne sont pas des défauts du harness mais leur conséquence : deux bugs de production que
les tests écartés et le `@ts-nocheck` cachaient, reproduits sur l'API lancée.

| Bug | Preuve | Cause | Correction |
|---|---|---|---|
| Une réservation de week-end coûte `"5020"` au lieu de `70` (chaîne, pas nombre). | `curl` ; test `price` ; `tsc` strict | `WEEKEND_SURCHARGE = "20"` | `20` |
| Deux réservations bout à bout sont refusées (409), alors que la doc dit `[debut, fin[`. | `curl` ; test `bookings` | `<=` dans `overlaps` | `<` |

En sondant l'API, j'ai aussi fait refuser les dates qui ne sont pas de l'ISO 8601 UTC
(`"Nov 2 2026"` était accepté, contre la convention 3).

![Bugs avant](captures/avant-05-bugs.png)
![Bugs après](captures/apres-05-bugs.png)

### Ajouts pour Claude Code

Pas des réparations, mais ce qu'il fallait pour jouer le TP hors d'OpenCode : `CLAUDE.md`
qui importe `AGENTS.md`, un hook d'après écriture équivalent au plugin
(`.claude/settings.json`), `.gitattributes` pour garder les scripts en LF sous Windows, et
le skill `audit-harness` généré avec skill-creator. Aucun skill n'existait dans le dépôt,
et ce n'était pas un défaut.

![Hook dans une session Claude Code](captures/apres-11-hook-agent.png)

## Ce qui ressemble à un défaut et n'en est pas un

Laissés tels quels, parce que ce qui les entoure dit qu'ils sont voulus.

- **Le `it.skip` « SKIP ASSUMÉ »** de `overlap.spec.ts` : la fixture n'a jamais été versée
  (INFRA-198), le commentaire le dit et dit quand le réactiver.
- **Le motif `*.spec.ts`** de `vitest.config.ts` : c'est la convention (INFRA-205). Le
  défaut était les deux fichiers qui ne la suivaient pas.
- **« Pas de JSDoc » dans `src/lib/`** : une règle locale qui déroge explicitement à la
  règle générale. Gardée, et l'exception est maintenant citée dans le `AGENTS.md` racine.
- **« Ne pas toucher à `src/store.ts` »** : respecté, y compris pour le tester.
- **`planner` ne peut écrire que dans `.opencode/plans/*.md`, `tester` que dans
  `.opencode/scratch/`** (ignoré par Git) : des droits taillés pour le rôle.
- **`reviewer` n'a que `git diff/log/show/status`** : il juge un diff, c'est `tester` qui
  exécute.
- **`dev` : `ask` sur `git reset --hard`, `git clean`, `rm -rf`** : des garde-fous, pas
  des oublis.
- **`explorer` écrit ses notes sur disque** : c'est ce qui garde le contexte de
  l'orchestrateur propre. Gardé, mais borné au dossier des plans.
- **Le hook d'après écriture avertit sans interrompre** (INFRA-231) : défendable, puisque
  l'écriture a déjà eu lieu. Le défaut était que rien d'autre ne bloquait et que `/ship`
  s'appuyait dessus.
- **Stockage en mémoire, pas de base, pas de build** : annoncé et suffisant.

## Ce que je n'ai pas corrigé, et pourquoi

- **Le `.env` reste dans l'historique Git.** Le retirer demande de réécrire l'historique
  et de forcer un push sur un dépôt partagé. Les valeurs sont annoncées comme pédagogiques ;
  dans un vrai projet elles devraient être changées.
- **La convention `Result`** n'a pas été appliquée au code : j'ai aligné la règle sur le
  code plutôt que de réécrire la gestion d'erreurs d'un service en production. C'est le
  choix inverse qui se défendrait si l'équipe tenait à la refonte.
- **Un corps JSON malformé renvoie une page HTML avec la pile d'appels** (400 d'Express).
  Constaté par `curl`, hors périmètre.
- **Cinq mutants survivent** : trois sont équivalents (`""` au lieu de `"/"` dans un
  routeur), un est redondant (`typeof` avant `Number.isInteger`), un correspond à la
  relance d'une erreur non prévue dans `bookings.ts` (lignes 63-64), non testée.
- **Les modèles `opencode/deepseek-v4-*`** et le plugin `.opencode/plugin/checks.js`
  (nom du champ lu dans `input.args`) n'ont pas été vérifiés : il faudrait OpenCode.
- **La JSDoc des fonctions exportées** n'est pas vérifiée par le lint : il faudrait une
  dépendance de plus.

**Dépendances de développement ajoutées**, alors que `AGENTS.md` demande d'en parler
d'abord : `husky`, `@vitest/coverage-v8`, `@eslint/js`, `@stryker-mutator/core`,
`@stryker-mutator/vitest-runner`. Sans elles, ni hook, ni mesure. À valider.

## Exercice 1 — la même tâche, après

Session neuve sur un clone du dépôt réparé :
[transcription](preuves/ex1/apres.resume.txt), [diff produit](preuves/ex1/apres.diff).

![Exercice 1 après](captures/apres-10-ex1.png)

| | Avant | Après |
|---|---|---|
| Conventions suivies | la règle fausse de `src/lib/` (`export default`) | exports nommés, `ValidationError`, comme le reste du code |
| Checks lancés par l'agent | `test:unit`, `typecheck`, `lint` — verts sans rien vérifier | `npm run check` puis `test:coverage`, sous seuils |
| Tests exécutés à la fin | 23, dont 18 nouveaux ; 2 fichiers existants jamais lancés | 91, dont 32 nouveaux ; tous les fichiers |
| Bugs existants | prix `"5020"` non vu ; chevauchement vu et laissé | corrigés avant, l'endpoint est cohérent avec `POST /bookings` |
| Sous-agents | aucun | aucun |

Ce qui ne change pas : dans Claude Code, un seul agent fait tout. La répartition des rôles
réparée dans `.opencode/` ne se voit qu'en lançant OpenCode.

## Fichiers de preuve

- [`preuves/scripts/preuve.sh`](preuves/scripts/preuve.sh) — rejoue chaque preuve dans un clone : `bash preuves/scripts/preuve.sh <rules|tests|tests-tous|lint|hooks|checks|bugs|mcp|mcp-detail|couverture|droits|ci-git> <dossier>`
- [`preuves/mesure-mcp.mjs`](preuves/mesure-mcp.mjs) — interroge chaque serveur MCP et mesure ses définitions d'outils
- [`preuves/mesure-mcp-detail.mjs`](preuves/mesure-mcp-detail.mjs) — démarrage, outils qui écrivent, vrai appel sans jeton
- [`preuves/mutation-avant.txt`](preuves/mutation-avant.txt), [`preuves/mutation-apres.txt`](preuves/mutation-apres.txt) — rapports Stryker complets
- [`preuves/ex1/`](preuves/ex1/) — transcriptions et diffs des deux exécutions de l'exercice 1
- [`preuves/hook-claude-code.jsonl`](preuves/hook-claude-code.jsonl) — session où le hook renvoie le rouge à l'agent
