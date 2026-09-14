# Architecture — ArrivalGlyphs

## Principe

Un texte saisi produit toujours le **même** glyphe : le texte est haché (FNV-1a) en un entier 32 bits, qui sert de graine à un générateur pseudo-aléatoire déterministe (`mulberry32`). Toutes les variations de forme sont tirées depuis ce même flux de nombres pseudo-aléatoires — donc reproductibles à l'identique pour un texte donné, différentes pour un texte différent.

**Référence visuelle réelle** (correction du 2026-09-14 — le premier jet était parti d'un souvenir approximatif du film, pas des vraies images) : quelques logogrammes du dossier `ScriptLogoJpegs/` du dépôt `WolframResearch/Arrival-Movie-Live-Coding` ont été regardés directement (`Weapon1.jpg`, `Human1.jpg`, `Humanity1.jpg`, `Time1.jpg`). Constat : **encre noire sur fond blanc** (pas l'inverse), un **anneau plein à largeur variable** façon trait de pinceau (pas un tracé fin avec des nœuds), **parfois ouvert** (extrémités effilées en pointe), et **un ou plusieurs amas denses** (blob + une dizaine à une vingtaine de fins filaments rayonnants, quelques-uns terminés par une minuscule goutte) fusionnés à l'anneau à un ou deux endroits précis — le reste de l'anneau restant simple. Pas de halo lumineux ni de petits points régulièrement répartis (erreur du premier jet).

## Fichiers (`frontend/`)

- `index.html` — structure : zone de saisie, canvas circulaire, boutons Générer / Télécharger PNG.
- `style.css` — chrome de page sombre/atmosphérique, mais le disque du canvas (le "papier") est blanc cassé (`#f9f7f2`), encre quasi noire (`#111111`) — conforme aux vraies images. 100 % responsive (`vw`/flex).
- `script.js` :
  - `hashString(text)` → entier 32 bits (FNV-1a). `mulberry32(seed)` → PRNG déterministe.
  - `harmonicNoise(rng, count)` → bruit périodique lisse (somme d'harmoniques sinusoïdales), utilisé pour toutes les variations continues (rayon, épaisseur, texture fine) — **jamais** de bruit indépendant par échantillon, qui donnerait un bord en dents de scie au lieu d'un tracé irrégulier mais continu.
  - `buildGlyph(text)` → un objet `{ samples, clusters }` : `samples` = 220 échantillons fins (rayon + épaisseur) le long de l'anneau, avec un ou plusieurs "bumps" gaussiens d'épaisseur aux angles des amas, et un fondu à l'épaisseur mini si l'anneau est ouvert (probabilité ~40 %) ; `clusters` = 1 à 3 amas, chacun avec un blob (polygone irrégulier) et 10-20 filaments (angle, longueur, courbure, goutte terminale optionnelle).
  - `renderGlyph(glyph)` → l'anneau est rempli comme un **vrai ruban à largeur variable** (chemin du bord extérieur puis bord intérieur en sens inverse, un seul `fill()`), pas un trait à largeur constante avec des marqueurs. Amas et filaments dessinés par-dessus, ancrés sur l'anneau à l'angle du cluster. Aucun flou/halo — de l'encre plate.

## Non couvert pour l'instant

- Pas de mode aléatoire (bouton "surprends-moi" sans texte) — écarté au cadrage, peut être ajouté plus tard.
- Pas d'animation ni de bibliothèque de glyphes sauvegardés.
- Pas de boucles internes creuses (vu sur certains logogrammes complexes comme `Time1.jpg`) — variante possible plus tard.
- Pas de mapping sémantique réel (le texte ne "veut rien dire" comme dans le film — c'est un hash visuel, pas une vraie écriture).
