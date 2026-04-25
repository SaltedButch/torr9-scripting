# Release Notes - torr9conf

Ce fichier suit l'etat fonctionnel du userscript `torr9conf` a partir de la version actuellement en place. Aucun historique anterieur n'est reconstruit.

## Regle de mise a jour

- Ajouter une ligne explicative dans ce fichier a chaque nouvelle feature livree.
- Ouvrir une nouvelle section seulement quand la version du userscript change.
- Garder des formulations courtes, orientees usage, sans reconstituer les anciennes releases.

## Version en preparation

- Aucun changement en attente.

## v1.0.6 - 2026-04-25

- Adaptation du filtrage de `stats` a la nouvelle structure HTML du site.
- Rebranchement du ciblage `stats` sur le bloc `Detail par torrent` et ses compteurs `entrees`.
- Durcissement du repérage des lignes sur `my-uploads` et `stats` pour moins dépendre des classes exactes du layout.
- Ajustement du masquage des lignes adultes avec un `display: none !important` quand le filtre est actif.
- Mise a jour des compteurs et libelles visibles pour garder un affichage coherent avec les lignes encore affichees.

## v1.0.5 - Snapshot initial - 2026-04-25

- Filtrage des lignes adultes sur `my-uploads` et `stats` quand `want_porn = false`.
- Reapplication automatique du filtrage apres chargement dynamique du DOM.
- Synchronisation locale avec `localStorage.user` pour reagir aux changements de configuration.
- Raccourci `Ctrl+Alt+P` pour basculer `want_porn` via l'API Torr9 puis recharger la page.
