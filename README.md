# ArrivalGlyphs

## Objectif

Générateur de **logogrammes** dans l'esprit graphique du film *Arrival* (2016) : des symboles circulaires façon anneau d'encre/fumée, inspirés de l'écriture des heptapodes. Pas une reprise du dépôt d'origine (`WolframResearch/Arrival-Movie-Live-Coding`, en Wolfram Language) mais un outil original, pensé pour tourner directement dans un navigateur.

Référence : dépôt companion officiel du film (analyse des logogrammes, cartographie des sites d'atterrissage, automates cellulaires) et la session de live coding associée : https://www.youtube.com/watch?v=r8nTifCIr0c

## Briques et stack

| Brique | Stack |
|---|---|
| `frontend` | HTML / CSS / JavaScript pur, 100 % côté client (Canvas ou SVG), aucun serveur ni dépendance |

## Fichiers de documentation

| Fichier | Rôle |
|---|---|
| `CONSIGNES.md` | Règles de travail sur ce projet |
| `ARCHITECTURE.md` | Principe de génération des logogrammes, structure des flux |
| `README.md` | Ce fichier |
| `TODO.md` | Tâches à faire et à venir |
| `HISTORIQUES.md` | Journal chronologique des tâches terminées |

## Statut

🟢 Terminé — générateur fonctionnel (`frontend/index.html`), texte → logogramme déterministe, rendu fidèle aux vraies images de référence du film. Pour l'ouvrir : `cd frontend && python3 -m http.server 8790` puis `http://localhost:8790`.
