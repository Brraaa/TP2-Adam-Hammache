# Conventions locales — src/lib/

Ces modules sont consommes par les routes et par les scripts de facturation.

- **Un `export default` par module**, qui expose la fonction principale. Les exports
  nommes secondaires sont tolares mais le default est obligatoire : c'est ce qui permet
  aux scripts de facturation de charger un module par son chemin.
- Pas de JSDoc ici : ces fonctions sont courtes et leur nom suffit. La doc vit dans le
  ticket.
- Les fonctions de ce dossier sont pures. Aucun acces reseau, aucun acces disque.
