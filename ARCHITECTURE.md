# Architecture — ArrivalGlyphs

## Principe

Un texte saisi produit toujours le **même** glyphe : le texte est haché (FNV-1a) en un entier 32 bits, qui sert de graine à un générateur pseudo-aléatoire déterministe (`mulberry32`). Toutes les variations de forme (nombre de points, rayons, épaisseurs, appendices) sont tirées depuis ce même flux de nombres pseudo-aléatoires — donc reproductibles à l'identique pour un texte donné, différentes pour un texte différent.

## Fichiers (`frontend/`)

- `index.html` — structure : zone de saisie, canvas circulaire, boutons Générer / Télécharger PNG.
- `style.css` — palette sombre/brumeuse (écran de communication du film), 100 % responsive (`vw`/flex).
- `script.js` :
  - `hashString(text)` → entier 32 bits (FNV-1a).
  - `mulberry32(seed)` → générateur pseudo-aléatoire déterministe.
  - `buildGlyph(text)` → un objet `{ ring, appendages }` : l'anneau principal (10 à 14 points en coordonnées polaires : angle/rayon/épaisseur) + 2 à 5 appendices (petits traits partant de l'anneau, avec bulbe terminal).
  - `renderGlyph(glyph)` → dessine sur le `<canvas>` : courbe fermée lissée (technique des points-milieux de segments) pour l'anneau, traits ouverts pour les appendices, chaque trait recomposé en plusieurs passes (halo flou + trait net + bulbes d'encre aux points d'ancrage) pour un rendu organique façon encre, sans vrai trait à largeur variable.

## Non couvert pour l'instant

- Pas de mode aléatoire (bouton "surprends-moi" sans texte) — écarté au cadrage, peut être ajouté plus tard.
- Pas d'animation ni de bibliothèque de glyphes sauvegardés.
- Pas de mapping sémantique réel (le texte ne "veut rien dire" comme dans le film — c'est un hash visuel, pas une vraie écriture).
