---
name: audit-harness
description: Audite la chaîne d'agents et les garde-fous d'un dépôt (rules AGENTS.md/CLAUDE.md, MCP, skills, commands, subagents et leurs droits, hooks, lint, types, tests, CI, Git) en prouvant chaque défaut par une commande exécutée. À utiliser dès qu'on demande si un dépôt est « bien outillé pour les agents », pourquoi une chaîne d'agents travaille mal, de vérifier un `.opencode/` ou un `.claude/`, de relire une config d'agent, un hook, un pre-commit ou une CI, ou quand des tests verts, un lint vert ou une CI verte paraissent suspects — même si le mot « harness » n'est pas prononcé.
---

# Auditer un harness, brique par brique

Un harness peut être complet sur le papier et ne rien retenir : un lint sans règle passe
toujours, un hook non branché ne tourne jamais, une CI qui ne lance pas les tests reste
verte. Le but de l'audit n'est pas de lister ce qui existe mais d'établir, pour chaque
brique, **ce qu'elle arrête réellement**.

Deux principes tiennent tout le reste.

**Prouver, pas déduire.** Lire un fichier fait naître un soupçon. Ce qui l'établit, c'est
une commande et sa sortie. Pour chaque filet, la preuve la plus directe est de lui
présenter une faute volontaire et de regarder s'il la retient : s'il laisse passer un
fichier manifestement fautif, il ne vérifie rien, quelle que soit sa config.

**Ne pas accuser ce qui est voulu.** Avant de signaler une ligne, lire ce qui l'entoure :
un commentaire, une règle propre à un dossier ou une phrase du prompt d'un agent peut
expliquer le choix. Un `skip` commenté avec sa raison, une permission restreinte à un
dossier, une exception documentée ne sont pas des défauts. En cas de doute, le dire
comme un doute.

## Déroulé

1. **État des lieux sans rien modifier.** Cloner ou copier le dépôt à part pour les
   essais destructifs (commits de test, fichiers fautifs) : l'audit ne salit pas l'arbre
   de travail.
2. **Passer chaque brique** avec le tableau ci-dessous. Noter la commande, sa sortie, le
   fichier en cause.
3. **Mesurer** ce qui ne se voit pas à la lecture : couverture, score de mutation,
   contexte consommé par les outils déclarés.
4. **Réparer dans l'ordre du filet** : d'abord ce qui vérifie (lint, types, tests), puis
   ce qui le déclenche (hooks, CI), puis la chaîne d'agents. Un filet réparé se relance
   sur le code existant : il révèle souvent des bugs que personne n'avait vus.
5. **Rejouer les preuves** après réparation : la même faute volontaire doit maintenant
   être retenue.

## Les briques

Pour chacune : la question, la preuve à produire, les défauts habituels.

### Rules (`AGENTS.md`, `CLAUDE.md`, règles par dossier)

Le fichier dit-il la vérité sur le dépôt ? Exécuter **chaque commande** qu'il documente
(`npm run` liste les scripts réels) et chercher dans le code **chaque convention** qu'il
énonce (`grep`). Une règle fausse est pire qu'une règle absente : l'agent la suit.

- Commande documentée qui n'existe pas.
- Convention contredite par tout le code existant.
- Deux fichiers de règles qui se contredisent sans dire lequel l'emporte. Une règle
  locale qui déroge explicitement à la règle générale est légitime.
- Vérifier que l'outil utilisé lit bien le fichier : OpenCode lit `AGENTS.md`, Claude
  Code lit `CLAUDE.md` (qui peut importer l'autre avec `@AGENTS.md`).

### MCP

Lesquels sont déclarés, lesquels répondent, lesquels servent ? Pour chaque serveur :
résoudre son hôte ou le lancer, lui envoyer `initialize` puis `tools/list`, compter les
outils et la taille de leurs définitions (octets / 4 ≈ tokens). Ces définitions sont
chargées dans le contexte à **chaque** session, utilisées ou non.

- Serveur injoignable, ou qui exige un jeton que rien ne fournit.
- Serveur qui répond mais ne sert à rien pour ce projet.
- Syntaxe de variable d'environnement qui n'est pas celle de l'outil (OpenCode :
  `{env:NOM}` ; Claude Code : `${NOM}`).

Un MCP absent se défend très bien : chaque serveur retiré rend du contexte.

### Skills et commands

Qu'est-ce qui est packagé, et qu'est-ce que ça déclenche ? Lire chaque command comme une
suite d'actions et se demander ce qui arrive si le travail est rouge.

- Command qui livre (`git add -A`, commit, push) sans relancer les checks, en s'appuyant
  sur un hook qui ne bloque pas.
- Command qui contredit les rules (commit sur la branche principale).

### Subagents

Combien, quels rôles, lesquels sont joignables ? Recouper trois listes : les fichiers
d'agents, leur `mode`, et la table d'équipe dans le prompt de l'orchestrateur.

- Agent en `mode: primary` que l'orchestrateur croit pouvoir appeler comme subagent.
- Agent qui existe mais que l'orchestrateur ne cite nulle part : il ne travaille jamais.
- Prompt d'orchestrateur qui l'autorise à tout faire lui-même : les subagents ne servent
  plus.
- Description qui ne correspond pas au corps du prompt (rôle qui a dérivé).

### Droits

Qui peut lire, écrire, exécuter, déléguer, et est-ce cohérent avec le rôle ? Dresser la
matrice agent × (lecture, écriture, shell, délégation, réseau).

- **Ordre des règles.** Dans OpenCode la dernière règle qui correspond l'emporte : un
  `"*": deny` placé en dernier annule tout ce qui précède. L'agent ne peut plus rien
  lire et répond quand même. Le joker se met en premier.
- Orchestrateur « qui ne code jamais » avec `edit` et `bash` ouverts.
- Relecteur qui peut modifier ce qu'il relit : son verdict ne vaut plus rien.
- Subagent qui peut déléguer à son tour (`task`).
- Agent de lecture avec un accès réseau sortant, dans un dépôt qui contient des secrets.

### Hooks

Branchés, exécutés, bloquants ? Trois preuves distinctes.

- Branché : `git config core.hooksPath`, présence de l'outil dans les dépendances, script
  `prepare`, bit exécutable (`git ls-files -s`).
- Exécuté et bloquant : commiter un fichier fautif dans une copie. S'il passe, le hook ne
  retient rien.
- Un script qui finit toujours par `exit 0` ne bloque jamais. Pour un hook d'après
  écriture, avertir sans interrompre peut être voulu — mais alors quelque chose d'autre
  doit bloquer (pre-commit, CI), et rien ne doit prétendre que « le hook a déjà vérifié ».
- Commentaire qui dit où le hook est branché, alors qu'il ne l'est pas là.

### Lint et types

Que vérifient-ils, et sur quoi ? Écrire un fichier volontairement sale (`var`, `==`,
`any`, `eval`, variable inutilisée, paramètre non typé) et lancer lint et typecheck.

- Parser branché mais `rules: {}`.
- `strict: false`, `noImplicitAny: false`.
- `// @ts-nocheck` ou `eslint-disable` en tête de fichier : regarder ce qu'il cache.

### Tests

Combien existent, combien s'exécutent, que prouvent-ils ? Compter les `it(` du dépôt et
comparer au total annoncé par le lanceur.

- Motif d'inclusion qui écarte une partie des fichiers (`*.spec.ts` contre `*.test.ts`).
- `skip` : lire chacun. Un skip sans raison écrite cache souvent le test qui échouerait.
- Tests qui ne testent rien : `expect(true).toBe(true)`, assertions sur un double défini
  dans le test lui-même.
- Couverture, puis **mutation testing** : une ligne couverte mais dont aucun mutant n'est
  tué n'est pas testée.
- Lancer tous les tests en ignorant le motif d'inclusion : ceux qui échouent désignent
  des bugs réels.

### CI et Git

Qu'est-ce qui tourne à chaque commit, à chaque PR ? Lire le workflow étape par étape et
le comparer au pre-commit.

- Étape de test commentée « provisoirement ».
- CI qui ne lance que le lint, lui-même sans règle.
- Secrets suivis par Git : `git ls-files | grep -i env`, et `.gitignore`. Un secret
  commité reste dans l'historique : le retirer de l'index ne suffit pas, il doit être
  changé.

## Restitution

Un tableau, une ligne par problème :

| Brique | Symptôme (commande + ce qu'elle a répondu) | Cause (fichier) | Réparation |
|---|---|---|---|

Puis trois listes courtes : ce qui a été mesuré avant et après, ce qui ressemblait à un
défaut et n'en est pas un (avec la ligne qui le justifie), ce qui n'a pas été corrigé et
pourquoi. Distinguer partout ce qui a été **exécuté** de ce qui a seulement été **lu**.
