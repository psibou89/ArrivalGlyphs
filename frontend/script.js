// ArrivalGlyphs — génère un logogramme circulaire à partir d'un texte.
// Le même texte donne toujours le même glyphe (hash déterministe -> PRNG -> forme).

const canvas = document.getElementById("glyphCanvas");
const ctx = canvas.getContext("2d");
const form = document.getElementById("glyphForm");
const textInput = document.getElementById("textInput");
const caption = document.getElementById("caption");
const btnDownload = document.getElementById("btnDownload");

// ---------------------------------------------------------------------------
// Hash déterministe (FNV-1a) + PRNG (mulberry32) : même texte -> même graine
// -> même suite de nombres pseudo-aléatoires -> même glyphe, à chaque fois.
// ---------------------------------------------------------------------------
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Construction du glyphe : un anneau irrégulier (les points de contrôle
// varient en angle/rayon/épaisseur) + quelques appendices (petits traits qui
// partent de l'anneau, façon marques radiales des logogrammes du film).
// ---------------------------------------------------------------------------
function buildGlyph(text) {
  const seed = hashString(text.trim().toLowerCase() || "heptapod");
  const rng = mulberry32(seed);

  const pointCount = 10 + Math.floor(rng() * 5); // 10 à 14 points
  const baseRadius = 0.3;
  const ring = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2 + (rng() - 0.5) * 0.25;
    const radius = baseRadius * (0.7 + rng() * 0.55);
    const thickness = 0.012 + rng() * 0.02; // proportion du canvas
    ring.push({ angle, radius, thickness });
  }

  // Quelques points de l'anneau reçoivent un appendice (trait + petite bulle
  // d'encre à l'extrémité, vers l'extérieur ou l'intérieur du cercle).
  const appendages = [];
  const appendageCount = 2 + Math.floor(rng() * 4); // 2 à 5
  for (let k = 0; k < appendageCount; k++) {
    const from = ring[Math.floor(rng() * ring.length)];
    const outward = rng() > 0.35;
    const length = (outward ? 1 : -1) * (0.08 + rng() * 0.16);
    const curve = (rng() - 0.5) * 0.6;
    const endThickness = 0.01 + rng() * 0.018;
    appendages.push({ angle: from.angle, startRadius: from.radius, length, curve, endThickness });
  }

  return { seed, ring, appendages };
}

// ---------------------------------------------------------------------------
// Rendu : trait "encre" reconstitué par plusieurs passes (halo flou + trait
// net + bulbes aux points d'ancrage) plutôt qu'un vrai trait à largeur
// variable — plus simple et donne un rendu organique convaincant en Canvas.
// ---------------------------------------------------------------------------
function polarToXY(cx, cy, size, angle, radius) {
  return { x: cx + Math.cos(angle) * radius * size, y: cy + Math.sin(angle) * radius * size };
}

function strokeInkPath(points, closed, baseWidth, size) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#e8edf3";

  // Halo flou (dépôt d'encre diffus autour du trait).
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.filter = "blur(6px)";
  ctx.lineWidth = baseWidth * size * 1.8;
  tracePath(points, closed);
  ctx.stroke();
  ctx.restore();

  // Trait net (le cœur du trait d'encre).
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.filter = "none";
  ctx.lineWidth = baseWidth * size;
  tracePath(points, closed);
  ctx.stroke();
  ctx.restore();
}

function tracePath(points, closed) {
  ctx.beginPath();
  if (closed) {
    // Courbe lissée passant par les milieux de segments (technique classique
    // pour une boucle fermée organique à partir de points de contrôle épars).
    const first = points[0];
    const last = points[points.length - 1];
    let mid = { x: (last.x + first.x) / 2, y: (last.y + first.y) / 2 };
    ctx.moveTo(mid.x, mid.y);
    for (let i = 0; i < points.length; i++) {
      const cur = points[i];
      const next = points[(i + 1) % points.length];
      const nextMid = { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 };
      ctx.quadraticCurveTo(cur.x, cur.y, nextMid.x, nextMid.y);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const mid = { x: (points[i - 1].x + points[i].x) / 2, y: (points[i - 1].y + points[i].y) / 2 };
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mid.x, mid.y);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }
}

function inkBlob(x, y, radius) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.filter = "blur(5px)";
  ctx.fillStyle = "#e8edf3";
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.filter = "none";
  ctx.fillStyle = "#e8edf3";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderGlyph(glyph) {
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Anneau principal.
  const ringPoints = glyph.ring.map((p) => polarToXY(cx, cy, size, p.angle, p.radius));
  const avgThickness = glyph.ring.reduce((s, p) => s + p.thickness, 0) / glyph.ring.length;
  strokeInkPath(ringPoints, true, avgThickness, size);
  glyph.ring.forEach((p, i) => {
    const pt = ringPoints[i];
    inkBlob(pt.x, pt.y, p.thickness * size * 0.55);
  });

  // Appendices : un petit trait courbe partant de l'anneau, bulbe à l'extrémité.
  glyph.appendages.forEach((a) => {
    const start = polarToXY(cx, cy, size, a.angle, a.startRadius);
    const endRadius = a.startRadius + a.length;
    const midRadius = a.startRadius + a.length * 0.5;
    const mid = polarToXY(cx, cy, size, a.angle + a.curve * 0.5, midRadius);
    const end = polarToXY(cx, cy, size, a.angle + a.curve, endRadius);
    strokeInkPath([start, mid, end], false, a.endThickness * 0.8, size);
    inkBlob(end.x, end.y, a.endThickness * size * 0.6);
  });
}

// ---------------------------------------------------------------------------
// Interaction : soumission du formulaire -> nouveau glyphe ; téléchargement
// du canvas en PNG.
// ---------------------------------------------------------------------------
function generateFromInput() {
  const text = textInput.value.trim();
  const glyph = buildGlyph(text || "heptapod");
  renderGlyph(glyph);
  caption.textContent = text || "heptapod";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  generateFromInput();
});

btnDownload.addEventListener("click", () => {
  const link = document.createElement("a");
  const label = (textInput.value.trim() || "heptapod").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  link.download = "arrivalglyph-" + label + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// Glyphe d'exemple affiché au chargement, pour que la page ne soit jamais vide.
textInput.value = "arrival";
generateFromInput();
