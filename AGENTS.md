# salles-api — conventions du depot

Service interne de reservation de salles. Express + TypeScript, stockage en memoire pour
l'instant (la vraie base arrive avec INFRA-140).

## Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm install` | installe les dependances et branche le hook de pre-commit (husky) |
| `npm start` | demarre l'API sur le port 3000 (`PORT` pour en changer) |
| `npm test` | lance la suite de tests (vitest, `test/**/*.spec.ts`) |
| `npm run typecheck` | verifie les types (`tsc --noEmit`, mode strict) |
| `npm run lint` | verifie les erreurs courantes (eslint + typescript-eslint) |
| `npm run check` | typecheck + lint + tests — **a lancer avant tout commit** |
| `npm run test:coverage` | tests avec couverture ; echoue sous les seuils de `vitest.config.ts` |
| `npm run test:mutation` | mutation testing (Stryker) ; lent, a lancer avant une PR |

Il n'y a pas d'etape de build : `tsx` execute le TypeScript directement.

Le pre-commit et la CI relancent typecheck, lint et tests. Ne pas les contourner
(`--no-verify`).

## Conventions

1. **Toute fonction exportee porte une JSDoc** d'une ligne minimum, qui dit ce qu'elle
   fait et pas comment. Exception : `src/lib/` (voir `src/lib/AGENTS.md`).
2. **Erreurs de validation : `ValidationError`, attrapee dans la route.** Les fonctions
   de `src/lib/validate.ts` levent une `ValidationError` (statut 400) ; la route qui les
   appelle l'attrape et repond avec `err.status` et `{ error: err.message }`. Toute autre
   erreur remonte telle quelle. Les cas metier (salle inconnue : 404 ou 400 selon la
   route, conflit : 409) se repondent directement dans la route.
3. Les dates circulent en **ISO 8601 UTC** (`2026-11-02T09:00:00Z`), toujours en
   `string`, jamais en `Date`. `requireDate` refuse toute autre forme.
4. Un module par responsabilite dans `src/lib/`. Pas de fichier `utils.ts`.
5. Les imports relatifs portent l'extension `.js` (ESM).
6. Les tests s'appellent `test/<sujet>.spec.ts`. Un fichier `*.test.ts` n'est pas execute.
   Un `it.skip` porte un commentaire qui dit pourquoi, sinon il n'a pas lieu d'etre.

## Ce qu'il ne faut pas faire

- Ne pas ajouter de dependance sans en parler.
- Ne pas commiter dans `main` directement.
- Ne pas toucher a `src/store.ts` : il disparait avec INFRA-140.
- Ne pas commiter de fichier `.env` : copier `.env.example`.
