/* Service worker de la version web (PWA) : l'application marche hors connexion après un premier chargement.
   - Coquille (pages, styles, scripts, données, polices, icônes) : gardée en entier à l'installation, quelques Mo.
   - Audio (environ 165 Mo en tout) : pas tout d'avance, ce qui pèserait trop sur un iPhone. Sont gardés :
     les fichiers déjà écoutés, et ceux des cartes du jour, que l'application demande par un message
     { type: 'precharger', urls: [...] } au début de chaque session.
   Un fichier audio absent hors connexion n'est pas grave : l'application prend la voix de l'appareil.
   Safari demande l'audio par morceaux (en-tête Range) : la réponse en cache est découpée (statut 206).
   Changer VERSION à chaque publication : l'ancienne coquille est remplacée, l'audio gardé reste. */
'use strict';

const VERSION = 'v1.0.1-ec7043d1';
const COQUILLE = 'coquille-' + VERSION;
const AUDIO = 'audio-v1';

const FICHIERS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'fonts/Inter-Variable.woff2',
  'fonts/SpaceGrotesk-Variable.woff2',
  'icones/icone-192.png',
  'icones/icone-512.png',
  'icones/apple-touch-icon.png',
  'js/config.js',
  'js/donnees.js',
  'data/de/vocabulaire/presenter.js',
  'data/de/vocabulaire/resto.js',
  'data/de/vocabulaire/deplacer.js',
  'data/de/vocabulaire/courses.js',
  'data/de/vocabulaire/medecin.js',
  'data/de/vocabulaire/metiers.js',
  'data/de/vocabulaire/nombres.js',
  'data/de/vocabulaire/mode.js',
  'data/de/vocabulaire/famille.js',
  'data/de/vocabulaire/agriculture.js',
  'data/de/grammaire.js',
  'data/de/conjugaison.js',
  'js/moteur.js',
  'js/recompenses.js',
  'js/stockage.js',
  'js/sons.js',
  'js/voix.js',
  'js/app.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(COQUILLE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((k) => k.startsWith('coquille-') && k !== COQUILLE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const estAudio = (url) => /\/audio\/[^/]+\.mp3$/.test(new URL(url).pathname);

/** Réponse partielle (206) taillée dans une réponse complète, pour une demande avec en-tête Range. */
async function morceau(requete, reponse) {
  const plage = /bytes=(\d*)-(\d*)/.exec(requete.headers.get('range') || '');
  if (!plage) return reponse;
  const corps = await reponse.arrayBuffer();
  const taille = corps.byteLength;
  let debut = plage[1] === '' ? taille - Number(plage[2]) : Number(plage[1]);
  let fin = plage[1] !== '' && plage[2] !== '' ? Number(plage[2]) : taille - 1;
  debut = Math.max(0, debut);
  fin = Math.min(fin, taille - 1);
  if (debut > fin) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + taille } });
  return new Response(corps.slice(debut, fin + 1), {
    status: 206,
    headers: {
      'Content-Type': reponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + debut + '-' + fin + '/' + taille,
      'Content-Length': String(fin - debut + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

/** Audio : d'abord le cache ; sinon le réseau, et le fichier complet est gardé pour la prochaine fois. */
async function audio(requete) {
  const cache = await caches.open(AUDIO);
  const cle = requete.url;
  let rep = await cache.match(cle);
  if (!rep) {
    const reseau = await fetch(cle); // sans Range : on garde le fichier entier
    if (!reseau.ok) return reseau;
    await cache.put(cle, reseau.clone());
    rep = reseau;
  }
  return requete.headers.has('range') ? morceau(requete, rep) : rep;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (estAudio(req.url)) {
    e.respondWith(audio(req).catch(() => new Response(null, { status: 504 })));
    return;
  }
  // Coquille : le cache d'abord (hors connexion), le réseau sinon.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
});

self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type !== 'precharger' || !Array.isArray(m.urls)) return;
  e.waitUntil(caches.open(AUDIO).then(async (cache) => {
    for (const url of m.urls) {
      const abs = new URL(url, self.registration.scope).href;
      if (!estAudio(abs) || (await cache.match(abs))) continue;
      try {
        const r = await fetch(abs);
        if (r.ok) await cache.put(abs, r);
      } catch (err) { return; } // hors connexion : on réessaiera à la prochaine session
    }
  }));
});
