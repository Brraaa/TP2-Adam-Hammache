# Conventions locales — src/lib/

Ces modules sont consommes par les routes.

- **Exports nommes**, importes par leur nom depuis les routes
  (`import { overlaps } from "../lib/overlap.js"`). Pas d'`export default`.
- La JSDoc n'est pas obligatoire ici : ces fonctions sont courtes et leur nom suffit.
  C'est l'exception a la convention 1 du `AGENTS.md` racine.
- Les fonctions de ce dossier sont pures. Aucun acces reseau, aucun acces disque.
