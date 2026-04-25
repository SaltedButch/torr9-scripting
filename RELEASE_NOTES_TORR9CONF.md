# Release Notes - torr9conf

Ce fichier suit l'etat fonctionnel du userscript `torr9conf` a partir de la version actuellement en place. Aucun historique anterieur n'est reconstruit.

## Regle de mise a jour

- Ajouter une ligne explicative dans ce fichier a chaque nouvelle feature livree.
- Ouvrir une nouvelle section seulement quand la version du userscript change.
- Garder des formulations courtes, orientees usage, sans reconstituer les anciennes releases.

## v1.0.6 - 2026-04-25

- Adaptation du filtrage de la page `stats` a la nouvelle structure HTML du site.
- Masquage de nouveau fonctionnel des lignes `+18` dans le listing des torrents sur `stats`.
- Mise a jour des compteurs visibles de la page `stats` pour garder un affichage coherent apres filtrage des lignes adultes.

## v1.0.5 - Snapshot initial - 2026-04-25

- Filtrage des lignes adultes sur `my-uploads` et `stats` quand `want_porn = false`.
- Reapplication automatique du filtrage apres chargement dynamique du DOM.
- Synchronisation locale avec `localStorage.user` pour reagir aux changements de configuration.
- Raccourci `Ctrl+Alt+P` pour basculer `want_porn` via l'API Torr9 puis recharger la page.
