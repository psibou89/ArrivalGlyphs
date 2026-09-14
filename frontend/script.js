// ArrivalGlyphs — génère un logogramme à partir d'un texte, dans l'esprit
// visuel des vrais logogrammes du film (voir ScriptLogoJpegs/ du dépôt
// WolframResearch/Arrival-Movie-Live-Coding) : un anneau d'encre noire à
// largeur variable (parfois ouvert, extrémités effilées), avec un ou
// plusieurs amas denses d'où partent de fins filaments — pas de "nœuds"
// ni de halo lumineux, c'est de l'encre plate, noir sur blanc.

const canvas = document.getElementById("glyphCanvas");
const ctx = canvas.getContext("2d");
const form = document.getElementById("glyphForm");
const textInput = document.getElementById("textInput");
const caption = document.getElementById("caption");
const btnDownload = document.getElementById("btnDownload");

const INK = "#111111";

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

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// Bruit lisse et périodique (somme d'harmoniques sinusoïdales) : donne une
// ondulation organique et continue sur un tour complet, sans bibliothèque.
function harmonicNoise(rng, count) {
  const terms = [];
  for (let i = 0; i < count; i++) {
    terms.push({ freq: i + 1, amp: 1 / (i + 1), phase: rng() * Math.PI * 2 });
  }
  return (theta) => {
    let v = 0;
    for (const t of terms) v += t.amp * Math.sin(t.freq * theta + t.phase);
    return v / terms.length;
  };
}

function angularDist(a, b) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

// ---------------------------------------------------------------------------
// Construction du glyphe : un anneau (rayon/épaisseur qui varient en douceur
// le long du tour, parfois ouvert) + un ou plusieurs amas denses (blob +
// filaments fins) fusionnés à l'anneau à des angles précis.
// ---------------------------------------------------------------------------
function buildGlyph(text) {
  const seed = hashString(text.trim().toLowerCase() || "heptapod");
  const rng = mulberry32(seed);

  const baseRadius = 0.34;
  const baseWidth = 0.014;
  const radiusNoise = harmonicNoise(rng, 3);
  const widthNoise = harmonicNoise(rng, 2);
  // Bruit fin (haute fréquence, faible amplitude) pour une texture "main
  // levée" sur le bord — reste lisse (base sinusoïdale) contrairement à un
  // bruit aléatoire indépendant par échantillon, qui donnerait un bord en
  // dents de scie au lieu d'un tracé irrégulier mais continu.
  const fineNoise = harmonicNoise(rng, 14);

  const clusterCount = pick(rng, [1, 1, 1, 2, 2, 3]);
  const clusters = [];
  for (let c = 0; c < clusterCount; c++) {
    let angle;
    let tries = 0;
    do {
      angle = rng() * Math.PI * 2;
      tries++;
    } while (clusters.some((o) => angularDist(o.angle, angle) < 1.1) && tries < 20);
    clusters.push({ angle, bumpWidth: 0.35 + rng() * 0.25, bumpAmount: baseWidth * (2.2 + rng() * 1.8) });
  }

  const hasGap = rng() < 0.4;
  let gapAngle = null, gapHalfWidth = 0;
  if (hasGap) {
    let tries = 0;
    do {
      gapAngle = rng() * Math.PI * 2;
      tries++;
    } while (clusters.some((o) => angularDist(o.angle, gapAngle) < 0.6) && tries < 20);
    gapHalfWidth = 0.1 + rng() * 0.12;
  }

  // Échantillonnage fin de l'anneau (rayon + épaisseur) sur tout le tour
  // utile (hors coupure), avec un fondu à l'épaisseur mini aux deux bouts
  // quand l'anneau est ouvert, pour un effet "pointe de pinceau".
  const steps = 220;
  const samples = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    if (hasGap && angularDist(theta, gapAngle) < gapHalfWidth) continue;

    let width = baseWidth * (1 + widthNoise(theta) * 0.5);
    for (const c of clusters) {
      const d = angularDist(theta, c.angle);
      width += c.bumpAmount * Math.exp(-(d * d) / (2 * c.bumpWidth * c.bumpWidth));
    }
    if (hasGap) {
      const d = angularDist(theta, gapAngle);
      const taper = Math.min(1, Math.max(0, (d - gapHalfWidth) / 0.35));
      width *= 0.06 + 0.94 * taper;
    }
    const radius = baseRadius * (1 + radiusNoise(theta) * 0.08 + fineNoise(theta) * 0.012);
    width *= 1 + fineNoise(theta * 1.7 + 1.3) * 0.15;
    samples.push({ theta, radius, width: Math.max(width, baseWidth * 0.12) });
  }

  // Filaments de chaque amas : fins traits qui partent du blob, longueurs et
  // angles variés, quelques-uns terminés par une minuscule goutte.
  clusters.forEach((c) => {
    c.whiskers = [];
    const n = 10 + Math.floor(rng() * 12);
    for (let i = 0; i < n; i++) {
      const spread = (rng() - 0.5) * 2.6; // direction autour du rayon local
      const dir = c.angle + spread;
      const length = (rng() < 0.75 ? 0.02 + rng() * 0.05 : 0.09 + rng() * 0.14);
      const curve = (rng() - 0.5) * 0.7;
      const withDrop = rng() < 0.3;
      c.whiskers.push({ dir, length, curve, withDrop, w: 0.0025 + rng() * 0.003 });
    }
    // Silhouette du blob (polygone irrégulier fermé, centré sur l'anneau).
    c.blob = [];
    const bn = 9 + Math.floor(rng() * 5);
    for (let i = 0; i < bn; i++) {
      const a = (i / bn) * Math.PI * 2;
      const r = c.bumpAmount * (1.3 + rng() * 0.9);
      c.blob.push({ a, r });
    }
  });

  return { seed, baseRadius, samples, clusters };
}

// ---------------------------------------------------------------------------
// Rendu Canvas — encre plate (pas de halo/flou) : l'anneau est rempli comme
// un vrai ruban à largeur variable (bord extérieur puis bord intérieur en
// sens inverse), les amas et filaments par-dessus.
// ---------------------------------------------------------------------------
function polar(cx, cy, size, angle, radius) {
  return { x: cx + Math.cos(angle) * radius * size, y: cy + Math.sin(angle) * radius * size };
}

function renderGlyph(glyph) {
  const size = canvas.width;
  const cx = size / 2, cy = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = INK;

  // --- Anneau : un unique polygone rempli (ruban à largeur variable) ---
  // Regroupe les segments continus (une coupure peut fragmenter l'anneau en
  // plusieurs arcs quand hasGap est actif).
  const segments = [];
  let current = [];
  for (let i = 0; i < glyph.samples.length; i++) {
    const s = glyph.samples[i];
    const prev = glyph.samples[i - 1];
    if (prev && s.theta - prev.theta > (Math.PI * 2 / 220) * 1.5) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push(s);
  }
  if (current.length > 1) segments.push(current);
  // Anneau non coupé : le premier et le dernier échantillon coïncident déjà
  // (theta = 0 et theta = 2π donnent le même point), la boucle se referme
  // naturellement sans traitement particulier.

  segments.forEach((seg) => {
    ctx.beginPath();
    seg.forEach((s, i) => {
      const p = polar(cx, cy, size, s.theta, s.radius + s.width / 2);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    for (let i = seg.length - 1; i >= 0; i--) {
      const s = seg[i];
      const p = polar(cx, cy, size, s.theta, s.radius - s.width / 2);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
  });

  // --- Amas : blob irrégulier + filaments fins, ancrés sur l'anneau ---
  glyph.clusters.forEach((c) => {
    const ringSample = glyph.samples.reduce((best, s) =>
      angularDist(s.theta, c.angle) < angularDist(best.theta, c.angle) ? s : best, glyph.samples[0]);
    const center = polar(cx, cy, size, c.angle, ringSample.radius);

    ctx.beginPath();
    c.blob.forEach((b, i) => {
      const x = center.x + Math.cos(b.a) * b.r * size;
      const y = center.y + Math.sin(b.a) * b.r * size;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    c.whiskers.forEach((w) => {
      const end = { x: center.x + Math.cos(w.dir) * w.length * size, y: center.y + Math.sin(w.dir) * w.length * size };
      const perp = w.dir + Math.PI / 2;
      const midLen = w.length * 0.55;
      const mid = {
        x: center.x + Math.cos(w.dir) * midLen * size + Math.cos(perp) * w.curve * w.length * size,
        y: center.y + Math.sin(w.dir) * midLen * size + Math.sin(perp) * w.curve * w.length * size,
      };
      ctx.lineCap = "round";
      ctx.lineWidth = w.w * size;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y);
      ctx.stroke();
      if (w.withDrop) {
        ctx.beginPath();
        ctx.arc(end.x, end.y, w.w * size * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
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
