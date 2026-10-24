/* Interface : accueil, session de révision, fin de session, Sprint, réglages, sauvegarde.
   Toute la logique de révision est dans moteur.js ; ici on ne fait qu'afficher et relayer les gestes. */
(function () {
  'use strict';

  const C = window.Config, D = window.DONNEES, M = window.Moteur, R = window.Recompenses, S = window.Stockage;
  const Sons = window.Sons, Voix = window.Voix;

  const stockage = S.stockageNavigateur();
  let prog = S.charger(stockage);
  const catalogue = D.catalogue();
  const vue = document.getElementById('vue');

  // ---------- Petits outils ----------

  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach((k) => {
        const v = props[k];
        if (v === false || v == null) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'on') Object.keys(v).forEach((ev) => el.addEventListener(ev, v[ev]));
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (let i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach((c) => {
        if (c == null || c === false) return;
        el.append(c.nodeType ? c : document.createTextNode(c));
      });
    }
    return el;
  }

  const NS = 'http://www.w3.org/2000/svg';
  function iconeHautParleur() {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('fill', 'currentColor');
    p.setAttribute('d', 'M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z');
    svg.append(p);
    return svg;
  }

  const reduit = () => document.body.classList.contains('reduit');
  const nombre = (n) => Number(n).toLocaleString('fr-FR');
  const virgule = (x) => String(x).replace('.', ',');
  const maintenant = () => Date.now();
  const sauver = () => S.sauver(stockage, prog);

  let timerAnnonce = null;
  function annoncer(texte) {
    const a = document.getElementById('annonce');
    a.textContent = '';
    clearTimeout(timerAnnonce);
    timerAnnonce = setTimeout(() => { a.textContent = texte; }, 30);
  }

  let timerToast = null;
  function toast(texte) {
    const t = document.getElementById('toast');
    t.textContent = texte;
    t.classList.add('visible');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => t.classList.remove('visible'), Math.max(3800, texte.length * 70));
  }

  // Dans l'APK (Capacitor) : plugins natifs pour les vibrations et l'export. Ailleurs : null.
  function plugin(nom) {
    const c = window.Capacitor;
    return c && typeof c.isNativePlatform === 'function' && c.isNativePlatform() && c.Plugins ? c.Plugins[nom] || null : null;
  }

  function vibrer(ms) {
    const haptics = prog.reglages.vibrations && plugin('Haptics');
    if (haptics) {
      try { Promise.resolve(haptics.vibrate({ duration: ms })).catch(() => {}); } catch (e) { /* sans effet */ }
    } else if (prog.reglages.vibrations && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) { /* sans effet */ }
    }
  }

  function appliquerReglages() {
    const r = prog.reglages;
    document.body.classList.toggle('reduit', !!r.reduireAnimations || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));
    Sons.actif = !!r.son;
    Voix.actif = !!r.son; // le réglage « son » coupe aussi la voix
    if (!r.son) Voix.arreter();
  }

  const attendre = (ms) => new Promise((ok) => setTimeout(ok, reduit() ? 0 : ms));

  /** Fait défiler un nombre de 0 jusqu'à sa valeur ; le texte final est lu par les lecteurs d'écran. */
  function compter(el, valeur, suffixe, duree) {
    const fin = () => { el.textContent = nombre(valeur) + (suffixe || ''); };
    if (reduit() || valeur === 0) return fin();
    const t0 = performance.now();
    (function pas(t) {
      const k = Math.min(1, (t - t0) / duree);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = nombre(Math.round(valeur * eased)) + (suffixe || '');
      if (k < 1) requestAnimationFrame(pas);
      else fin();
    })(t0);
  }

  let touches = null; // gestionnaire clavier de la vue courante
  let nettoyage = null; // appelé quand on quitte la vue courante
  function afficher(noeuds, opts) {
    if (nettoyage) { nettoyage(); nettoyage = null; }
    touches = null;
    Voix.arreter();
    vue.replaceChildren.apply(vue, [].concat(noeuds).filter(Boolean));
    vue.classList.toggle('avec-barre', !!(opts && opts.barre));
    document.getElementById('fond-pulse').classList.remove('on');
    window.scrollTo(0, 0);
    vue.focus({ preventScroll: true });
  }

  function barre() {
    const contenu = h('div', { class: 'barre-in' });
    [].slice.call(arguments).forEach((b) => contenu.append(b));
    return h('div', { class: 'barre' }, contenu);
  }

  // ---------- Libellés ----------

  const ETATS = { neuve: 'Nouvelle', apprentissage: 'Apprentissage', reapprentissage: 'Réapprentissage', en_cours: 'En cours', mure: 'Mûre' };
  const INVITES = {
    sens: 'Que veut dire ce mot ?',
    allemand: 'Écris-le en allemand',
    ecoute: 'Écoute, puis écris la traduction',
    trou: 'Complète la phrase',
    conjuguer: 'Conjugue',
  };

  // ---------- Accueil ----------

  function anneauObjectif(fait, objectif) {
    const r = 38, c = 2 * Math.PI * r;
    const k = Math.min(1, objectif ? fait / objectif : 0);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 90 90');
    svg.setAttribute('aria-hidden', 'true');
    ['fond', 'val'].forEach((cls) => {
      const ci = document.createElementNS(NS, 'circle');
      ci.setAttribute('class', cls);
      ci.setAttribute('cx', 45); ci.setAttribute('cy', 45); ci.setAttribute('r', r);
      if (cls === 'val') {
        ci.setAttribute('stroke-dasharray', c.toFixed(2));
        ci.setAttribute('stroke-dashoffset', (c * (1 - k)).toFixed(2));
      }
      svg.append(ci);
    });
    const wrap = h('div', { class: 'anneau', role: 'img', 'aria-label': 'Objectif du jour : ' + fait + ' cartes sur ' + objectif }, svg,
      h('div', { class: 'centre num', 'aria-hidden': 'true' }, fait + '/' + objectif));
    return wrap;
  }

  function faitAujourdhui() {
    const j = prog.jour;
    return j && j.numero === M.numeroJour(maintenant()) ? j.reponses : 0;
  }

  function fichesCollection() {
    const fiches = new Map();
    catalogue.forEach((e) => {
      if (!fiches.has(e.fiche)) fiches.set(e.fiche, { id: e.fiche, type: e.type, cartes: [], premier: e });
      fiches.get(e.fiche).cartes.push(e.id);
    });
    return [...fiches.values()];
  }

  function vueAccueil() {
    const ajd = M.numeroJour(maintenant());
    const s = R.serie(prog.joursActifs, ajd);
    const dispo = M.sprintDisponible(prog, catalogue, prog.reglages);
    const probl = Object.keys(prog.cartes).filter((id) => prog.cartes[id].problematique).length;
    const niv = R.niveau(prog.points);

    const resume = h('section', { class: 'resume', 'aria-label': 'Résumé' },
      anneauObjectif(faitAujourdhui(), prog.reglages.objectifJour),
      h('div', { class: 'chiffres' },
        h('div', { class: 'ligne' }, 'Niveau', h('strong', { class: 'num' }, String(niv))),
        h('div', { class: 'ligne' }, 'Points', h('strong', { class: 'num ambre' }, nombre(prog.points))),
        h('div', { class: 'ligne' }, 'Série', h('strong', { class: 'num' }, s.longueur + (s.longueur > 1 ? ' jours' : ' jour')))));

    const cal = h('div', { class: 'calendrier', role: 'img', 'aria-label': 'Calendrier des 30 derniers jours : ' + s.jours.filter((j) => j.statut === 'actif').length + ' jours révisés' },
      s.jours.map((j) => h('span', { class: 'jour ' + j.statut, title: j.statut })));
    const serie = h('section', { class: 'serie' },
      h('h2', null, 'Série'),
      cal,
      h('p', { class: 'legende' }, 'Plein : révisé. Hachuré : jour de tolérance (2 par semaine). Pointillé : aujourd’hui.'));

    const fiches = fichesCollection();
    const tuiles = fiches.map((f) => {
      const p = R.palierFiche(f.cartes, prog.cartes);
      const entree = D.entree({ type: f.type, id: f.cartes[0] });
      const regle = f.type === 'gram' ? D.regle(f.id) : null;
      const fc = f.type === 'conj' ? D.ficheConj(f.id) : null;
      const mot = regle ? regle.titre_fr : fc ? fc.infinitif + ', ' + fc.titre_temps : entree ? entree.de || f.id : f.id;
      return h('button', { class: 'tuile p' + p, 'aria-label': mot + ', palier ' + p + ' sur 4', on: { click: () => vueFiche(f) } },
        h('span', { class: 'mot' }, mot),
        h('span', { class: 'pts', 'aria-hidden': 'true' }, [1, 2, 3, 4].map((i) => h('i', { class: i <= p ? 'on' : '' }))));
    });
    const doreees = fiches.filter((f) => R.palierFiche(f.cartes, prog.cartes) === 4).length;

    const btnSprint = h('button', { class: 'btn', 'aria-disabled': dispo.ok ? 'false' : 'true', on: { click: () => {
      if (!dispo.ok) return toast('Sprint : encore ' + dispo.manque + (dispo.manque > 1 ? ' cartes' : ' carte') + ' à faire sortir de l’apprentissage.');
      demarrerSprint();
    } } }, h('span', null, 'Sprint', h('small', null, dispo.ok ? '60 secondes' : 'encore ' + dispo.manque)));
    const btnReviser = h('button', { class: 'btn principal', on: { click: demarrerSession } }, 'Réviser');
    const btnReglages = h('button', { class: 'btn', on: { click: vueReglages } }, 'Réglages');

    afficher([
      h('header', { class: 'entete' }, h('h1', null, 'AMOR & Deutsch'), h('span', { class: 'pastille num' }, 'Meilleur Sprint ' + nombre(prog.sprintRecord))),
      resume, serie,
      probl ? h('p', { class: 'ligne-info' }, probl + (probl > 1 ? ' cartes sont difficiles' : ' carte est difficile') + ' : ', h('button', { class: 'passer', on: { click: vueProblematiques } }, 'voir la liste')) : null,
      h('h2', { class: 'section-titre' }, 'Collection', h('small', { class: 'num' }, doreees + ' dorée' + (doreees > 1 ? 's' : '') + ' sur ' + fiches.length)),
      h('div', { class: 'collection' }, tuiles),
      barre(btnSprint, btnReviser, btnReglages),
    ], { barre: true });
  }

  // ---------- Fiche d'un mot ----------

  function vueFiche(f) {
    const entree = D.entree({ type: f.type, id: f.cartes[0] });
    const carte = prog.cartes[f.cartes[0]];
    const etat = carte ? ETATS[M.etatAffiche(carte)] : 'Pas encore vue';
    let corps;
    if (f.type === 'vocab') {
      const pl = entree.nature === 'nom' ? M.libellePluriel(entree) : null;
      corps = [
        h('div', { class: 'etiquettes' }, h('span', { class: 'etiquette' }, etat), entree.controle === 'non contrôlé' ? h('span', { class: 'etiquette nc' }, 'non contrôlé') : null),
        h('div', { class: 'entree' }, entree.de),
        pl ? h('p', { class: 'invite' }, pl) : null,
        h('p', { class: 'invite' }, entree.fr),
        h('p', { class: 'exemple' }, entree.exemple_de, h('em', null, entree.exemple_fr)),
        boutonsEcoute(() => M.segmentsAudio(entree, 'vocab'), true),
      ];
    } else if (f.type === 'gram') {
      const regle = D.regle(f.id);
      corps = [
        h('div', { class: 'etiquettes' }, h('span', { class: 'etiquette' }, etat), h('span', { class: 'etiquette' }, regle.niveau)),
        ficheRegle(regle, 'h2'),
        boutonsEcoute(() => segmentsRegle(regle), true),
      ];
    } else {
      const fc = D.ficheConj(f.id);
      corps = [
        h('div', { class: 'etiquettes' }, h('span', { class: 'etiquette' }, etat)),
        ficheConjugaison(fc, 'h2'),
        boutonsEcoute(() => segmentsFicheConj(fc), true),
      ];
    }
    const lecture = f.type === 'gram' ? () => segmentsRegle(D.regle(f.id))
      : f.type === 'conj' ? () => segmentsFicheConj(D.ficheConj(f.id)) : () => M.segmentsAudio(entree, 'vocab');
    afficher([
      h('div', { class: 'page' }, h('h1', null, 'Fiche'), h('div', { class: 'fiche-carte' }, corps)),
      barre(h('button', { class: 'btn principal', on: { click: vueAccueil } }, 'Retour')),
    ], { barre: true });
    touches = (e) => lireTouche(e, lecture) || (e.key === 'Escape' && (vueAccueil(), true));
  }

  /** Contenu d'une fiche de grammaire : titres, formule, explication, deux exemples traduits. */
  function ficheRegle(regle, niveauTitre) {
    return h('div', { class: 'regle' },
      niveauTitre ? h(niveauTitre, { class: 'regle-titre' }, regle.titre_fr) : null,
      h('p', { class: 'regle-titre-de', lang: 'de' }, regle.titre_de),
      h('p', { class: 'regle-formule', lang: 'de' }, regle.formule_de),
      h('p', { class: 'regle-explication' }, regle.explication_fr),
      regle.exemples.map((x) => h('p', { class: 'exemple' }, h('span', { lang: 'de' }, x.de), h('em', null, x.fr))));
  }

  /** Contenu d'une fiche de conjugaison : infinitif et traductions, temps, chaque forme avec son pronom, deux exemples, note. */
  function ficheConjugaison(fc, niveauTitre) {
    const v = D.verbe(fc.verbe);
    return h('div', { class: 'regle' },
      niveauTitre ? h(niveauTitre, { class: 'regle-titre', lang: 'de' }, fc.infinitif) : null,
      h('p', { class: 'regle-explication' }, (fc.sens || [v.fr].concat(v.fr_acceptes || []).join(', ')) + ' · ' + fc.titre_temps),
      h('ul', { class: 'formes', lang: 'de' }, fc.formes.map((x) =>
        h('li', null, fc.temps === 'imperativ' ? x.forme + ' ! (' + x.pronom + ')' : x.pronom + ' ' + x.forme))),
      fc.exemples.map((x) => h('p', { class: 'exemple' }, h('span', { lang: 'de' }, x.de), h('em', null, x.fr))),
      fc.note ? h('p', { class: 'regle-explication' }, 'Note : ' + fc.note) : null);
  }

  const segmentsRegle = (regle) => M.segmentsAudio(regle, 'regle');
  const segmentsFicheConj = (fc) => M.segmentsAudio(fc, 'fiche-conj', D.conjugaison.filter((c) => c.fiche === fc.id));

  function ecouter(segments, lent) {
    Sons.debloquer();
    Voix.debloquer();
    Voix.jouer(segments, { lent: lent, manuel: true });
  }

  /**
   * Deux boutons visibles : « Écouter » (touche V) et « Lentement » (Maj + V), au doigt, à la souris et au clavier.
   * `quoi` précise ce qu'on écoute quand il y a plusieurs groupes sur l'écran (« la fiche »).
   */
  function boutonsEcoute(getSegments, petit, quoi) {
    const suffixe = quoi ? ' ' + quoi : '';
    return h('div', { class: 'ecoute' + (petit ? ' petit' : '') },
      h('button', { type: 'button', class: 'haut-parleur', 'aria-label': 'Écouter' + suffixe + ' en allemand' + (quoi ? '' : ', touche V'), on: { click: (e) => ecouter(getSegments(), e.shiftKey) } },
        iconeHautParleur(), h('span', { class: 'ecoute-texte' }, 'Écouter')),
      h('button', { type: 'button', class: 'lentement', 'aria-label': 'Écouter' + suffixe + ' lentement' + (quoi ? '' : ', Maj + V'), on: { click: () => ecouter(getSegments(), true) } },
        h('span', { class: 'ecoute-texte' }, 'Lentement')));
  }

  /** V écoute, Maj+V écoute au ralenti. Renvoie true si la touche a été traitée. */
  function lireTouche(e, getSegments) {
    if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
      const dansSaisie = e.target && e.target.tagName === 'INPUT';
      if (dansSaisie && !e.altKey) return false; // dans une saisie, « v » est une lettre : Alt + V
      e.preventDefault();
      ecouter(getSegments(), e.shiftKey);
      return true;
    }
    return false;
  }

  function vueProblematiques() {
    const ids = Object.keys(prog.cartes).filter((id) => prog.cartes[id].problematique);
    const items = ids.map((id) => {
      const c = prog.cartes[id];
      const e = D.entree(c);
      return h('div', { class: 'bloc' },
        h('h2', null, e ? (e.de || e.question || e.id) : id),
        h('p', { class: 'ligne-info' }, e && e.fr ? e.fr + ' · ' : '', c.echecs + ' échecs en révision'),
        h('p', null, 'Suggestion : reformule cette carte, par exemple avec une phrase qui t’aide à t’en souvenir.'));
    });
    afficher([
      h('div', { class: 'page' }, h('h1', null, 'Cartes difficiles'),
        h('p', { class: 'ligne-info' }, 'Ces cartes restent actives : elles ont été ratées 8 fois en révision.'),
        items.length ? items : h('p', { class: 'vide' }, 'Aucune carte difficile pour le moment.')),
      barre(h('button', { class: 'btn principal', on: { click: vueReglages } }, 'Retour')),
    ], { barre: true });
  }

  // ---------- Session de révision ----------

  let ses = null;
  let ui = null;

  // ---------- Hors connexion (version web) ----------

  /** Garde d'avance l'audio des cartes du jour (et de leurs fiches) dans le service worker. */
  function prechargerAudio() {
    const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!sw) return;
    try {
      const urls = new Set();
      M.cartesDuJour(prog, catalogue, maintenant(), prog.reglages).forEach((c) => {
        const e = D.entree(c);
        if (!e) return;
        let segs = M.segmentsAudio(e, c.type);
        if (c.type === 'gram' && D.regle(e.regle)) segs = segs.concat(segmentsRegle(D.regle(e.regle)));
        if (c.type === 'conj' && D.ficheConj(e.fiche)) segs = segs.concat(segmentsFicheConj(D.ficheConj(e.fiche)));
        segs.forEach((s) => { urls.add(Voix.fichier(s, false)); if (s.lent !== false) urls.add(Voix.fichier(s, true)); });
      });
      sw.postMessage({ type: 'precharger', urls: Array.from(urls) });
    } catch (e) { /* sans effet : l'audio viendra du réseau ou de la voix de l'appareil */ }
  }

  function demarrerSession() {
    Sons.debloquer();
    Voix.debloquer();
    prechargerAudio();
    ses = { rs: R.sessionNeuve(prog.points), vues: 0, justes: 0, sorties: 0, dernier: null, phase: null, q: null, carte: null, entree: null, res: null, note: null, niveauEnAttente: null, points0: prog.points };
    construireSession();
    questionSuivante();
  }

  function majCombo() {
    const c = ses.rs.combo;
    const m = R.multiplicateur(c);
    ui.mult.textContent = '×' + virgule(m);
    ui.mult.classList.toggle('zero', c === 0);
    ui.detail.textContent = c === 0 ? 'Combo : 0' : 'Combo : ' + c + ' d’affilée';
    ui.pts.textContent = nombre(ses.rs.points);
    ui.carte && ui.carte.classList.toggle('lumiere', c >= 3);
    document.getElementById('fond-pulse').classList.toggle('on', c >= 20 && !reduit());
    majObjectif();
  }

  function majObjectif() {
    const k = Math.min(1, faitAujourdhui() / Math.max(1, prog.reglages.objectifJour));
    ui.objectif.style.transform = 'scaleX(' + k + ')';
    ui.objectifTexte.textContent = faitAujourdhui() + ' / ' + prog.reglages.objectifJour + ' aujourd’hui';
  }

  function construireSession() {
    ui = {
      mult: h('span', { class: 'mult num' }),
      detail: h('span', { class: 'detail num' }),
      pts: h('strong', { class: 'num' }),
      objectif: h('i'),
      objectifTexte: h('span', { class: 'sr-only' }),
      zoneCarte: h('div', { class: 'zone-carte' }),
      feedback: h('div', { class: 'feedback' }),
      actions: h('div', { class: 'actions' }),
      carte: null,
    };
    const haut = h('div', { class: 'haut' },
      h('button', { class: 'btn', on: { click: finSession } }, 'Terminer'),
      h('div', { class: 'combo', 'aria-label': 'Combo' }, ui.mult, ui.detail),
      h('div', { class: 'stat-pts' }, 'Points', ui.pts));
    afficher(h('section', { class: 'session' }, haut,
      h('div', { class: 'barre-objectif', 'aria-hidden': 'true' }, ui.objectif), ui.objectifTexte,
      ui.zoneCarte, ui.feedback, ui.actions));
    touches = clavierSession;
    nettoyage = () => { document.getElementById('fond-pulse').classList.remove('on'); };
    majCombo();
  }

  function questionSuivante() {
    if (!ses) return; // session terminée entre-temps
    const r = M.prochaineCarte(prog, catalogue, maintenant(), prog.reglages, ses.dernier);
    if (!r) return finSession();
    ses.carte = r.carte;
    ses.neuve = r.neuve;
    ses.entree = D.entree(r.carte);
    const format = M.choisirFormat(r.carte, prog.reglages);
    ses.q = M.construireQuestion(ses.entree, r.carte, format, D.vocabulaire, Math.random, contexteQuestion(ses.entree, r.carte));
    ses.phase = 'question';
    ses.res = null;
    rendreQuestion();
    if (prog.reglages.lectureAuto && ses.q.lectureAvant) Voix.jouer(ses.q.segments);
  }

  /** Conjugaison : la fiche et le verbe, pour rappeler le sens et le temps dans la question. */
  function contexteQuestion(entree, carte) {
    if (carte.type !== 'conj' || !entree) return null;
    const fiche = D.ficheConj(entree.fiche);
    return fiche ? { fiche: fiche, verbe: D.verbe(fiche.verbe) } : null;
  }

  function texteInvite(q) {
    if (q.invite === 'allemand' && q.nature === 'nom') return 'Écris-le en allemand, avec l’article';
    return INVITES[q.invite] || '';
  }

  function rendreQuestion() {
    const q = ses.q;
    const etiquettes = h('div', { class: 'etiquettes' },
      h('span', { class: 'etiquette' }, ETATS[M.etatAffiche(ses.carte)]),
      ses.entree && ses.entree.controle === 'non contrôlé' ? h('span', { class: 'etiquette nc' }, 'non contrôlé') : null);
    const principal = q.masque
      ? h('div', { class: 'entree masque' }, 'Mot à écouter')
      : h('div', { class: 'entree' + (q.invite === 'trou' || q.invite === 'conjuguer' ? ' phrase' : '') }, q.affiche);
    const carte = h('article', { class: 'carte', tabindex: '-1', role: 'group', 'aria-label': 'Question' },
      etiquettes, principal,
      q.traduction ? h('p', { class: 'traduction', lang: 'fr' }, q.traduction) : null,
      h('p', { class: 'invite' }, texteInvite(q)),
      boutonsEcoute(() => q.segments, false));
    if (!q.lectureAvant) {
      // l'allemand est la réponse à trouver (ou la contient) : pas d'écoute avant la validation
      carte.querySelector('.ecoute').hidden = true;
    }
    ui.carte = carte;
    carte.classList.toggle('lumiere', ses.rs.combo >= 3);
    ui.zoneCarte.replaceChildren(carte);
    ui.feedback.replaceChildren();
    ui.actions.replaceChildren();

    if (q.choix) {
      q.choix.forEach((texte, i) => {
        ui.actions.append(h('button', { class: 'choix', 'data-i': i, 'aria-label': 'Choix ' + (i + 1) + ' : ' + texte, on: { click: () => valider(texte, i) } },
          h('span', { class: 'touche', 'aria-hidden': 'true' }, String(i + 1)), h('span', null, texte), h('span', { class: 'marque', 'aria-hidden': 'true' })));
      });
    } else {
      const deSaisie = q.format === 'saisie-fr-de' || q.format === 'saisie-conj';
      const champ = h('input', { type: 'text', id: 'saisie', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', lang: deSaisie ? 'de' : 'fr', 'aria-label': deSaisie ? 'Ta réponse en allemand' : 'Ta réponse en français', enterkeyhint: 'done' });
      ui.actions.append(
        h('div', { class: 'saisie' }, champ, h('button', { class: 'btn principal', on: { click: () => { if (champ.value.trim()) valider(champ.value); else champ.focus(); } } }, 'Valider')),
        h('button', { class: 'passer', on: { click: () => valider('') } }, 'Je ne sais pas'));
      if (!matchMedia('(pointer: coarse)').matches) champ.focus();
    }
    majCombo();
    if (matchMedia('(pointer: coarse)').matches || q.choix) carte.focus({ preventScroll: true });
  }

  function valider(donnee) {
    if (!ses || ses.phase !== 'question') return;
    Sons.debloquer();
    const q = ses.q;
    const res = M.corriger(q, donnee);
    const juste = res.resultat !== 'faux';
    const r = R.appliquerReponse(ses.rs, juste);
    ses.rs = r.etat;
    ses.res = res;
    ses.note = M.noteImposee(ses.carte, res.resultat);
    if (r.niveauMonte) ses.niveauEnAttente = r.niveau;
    ses.phase = ses.note ? 'continuer' : 'note';

    // Marques sur les choix
    [].forEach.call(ui.actions.querySelectorAll('.choix'), (b, i) => {
      b.disabled = true;
      const m = b.querySelector('.marque');
      if (q.choix[i] === q.reponse) { b.classList.add('juste'); m.textContent = '✓'; }
      else if (q.choix[i] === donnee) { b.classList.add('faux'); m.textContent = '✗'; }
    });

    // Retour
    let badge, annonce;
    const fb = ui.feedback;
    fb.replaceChildren();
    if (res.resultat === 'juste') {
      badge = h('span', { class: 'badge juste' }, '✓ Juste', h('span', { class: 'gain num' }, '+' + r.gain));
      annonce = 'Juste. Plus ' + r.gain + ' points. Combo ' + ses.rs.combo + '.';
      fb.append(badge);
    } else if (res.resultat === 'faute_frappe') {
      badge = h('span', { class: 'badge presque' }, '✓ Presque : une faute de frappe', h('span', { class: 'gain num' }, '+' + r.gain));
      const e = res.exact;
      fb.append(badge, h('p', { class: 'reponse', lang: 'de' }, e.slice(0, res.marque), h('mark', null, e.charAt(res.marque)), e.slice(res.marque + 1)));
      annonce = 'Presque, une faute de frappe. L’orthographe exacte est : ' + e + '.';
    } else {
      badge = h('span', { class: 'badge faux' }, '✗ Faux');
      fb.append(badge, h('p', { class: 'reponse', lang: q.format === 'saisie-de-fr' || q.format === 'ecoute-fr' ? 'fr' : 'de' }, 'Réponse : ' + res.exact));
      annonce = 'Faux. La réponse était : ' + res.exact + '.';
    }
    if (ses.entree && ses.entree.exemple_de && q.type === 'vocab') {
      fb.append(h('p', { class: 'explication' }, ses.entree.exemple_de + ' – ' + ses.entree.exemple_fr));
    }
    // Grammaire : la traduction de la phrase, puis la fiche de la règle (SPEC section 2)
    // (la traduction est déjà sous la question : ici, la phrase allemande complète)
    if (q.type === 'gram' && ses.entree) {
      const regle = D.regle(ses.entree.regle);
      fb.append(h('p', { class: 'explication', lang: 'de' }, q.texteLecture));
      if (regle) fb.append(h('details', { class: 'fiche-regle', open: '' }, h('summary', null, 'Règle : ' + regle.titre_fr), ficheRegle(regle, null), boutonsEcoute(() => segmentsRegle(regle), true, 'les exemples de la règle')));
    }
    // Conjugaison : la forme avec son pronom, puis la fiche du verbe à ce temps
    if (q.type === 'conj' && ses.entree) {
      const fc = D.ficheConj(ses.entree.fiche);
      fb.append(h('p', { class: 'explication', lang: 'de' }, ses.entree.lecture));
      if (fc) fb.append(h('details', { class: 'fiche-regle' }, h('summary', null, 'Fiche : ' + fc.infinitif + ', ' + fc.titre_temps), ficheConjugaison(fc, null), boutonsEcoute(() => segmentsFicheConj(fc), true, 'la fiche')));
    }
    annoncer(annonce);
    if (ui.carte) ui.carte.querySelector('.ecoute').hidden = false;

    // Sons, vibrations, effets
    if (juste) Sons.juste();
    else Sons.faux();
    effets(r, juste);
    if (!q.lectureAvant && prog.reglages.lectureAuto) Voix.jouer(q.segments);

    // Actions suivantes
    ui.actions.replaceChildren();
    if (ses.phase === 'note') {
      const b = (note, libelle, touche, defaut) => h('button', { class: 'btn' + (defaut ? ' defaut' : ''), 'data-note': note, on: { click: () => suite(note) } }, libelle, h('small', null, 'touche ' + touche));
      ui.actions.append(h('div', { class: 'notes', role: 'group', 'aria-label': 'Comment était-ce ?' }, b('difficile', 'Difficile', '2'), b('correct', 'Correct', '3 ou Entrée', true), b('facile', 'Facile', '4')));
      ui.actions.querySelector('[data-note="correct"]').focus({ preventScroll: true });
    } else {
      ui.actions.append(h('button', { class: 'btn principal', on: { click: () => suite(ses.note) } }, 'Continuer'));
      ui.actions.firstChild.focus({ preventScroll: true });
    }
    majCombo();
  }

  function gainFlottant(gain) {
    const g = h('div', { class: 'gain-flottant num' }, '+' + gain);
    ui.zoneCarte.append(g);
    setTimeout(() => g.remove(), 1000);
  }

  function effets(r, juste) {
    if (!juste) {
      if (ui.carte && !reduit()) { ui.carte.classList.remove('tremble'); void ui.carte.offsetWidth; ui.carte.classList.add('tremble'); }
      return;
    }
    if (r.gain) gainFlottant(r.gain);
    if (reduit()) return;
    if (r.effets.particules) particules();
    if (r.effets.tremblement) {
      vibrer(90);
      document.body.classList.add('secoue');
      setTimeout(() => document.body.classList.remove('secoue'), 450);
    }
  }

  function particules() {
    const zone = document.getElementById('particules');
    const rect = ui.carte ? ui.carte.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * 2 * Math.PI + Math.random() * 0.4;
      const dist = 70 + Math.random() * 90;
      const p = h('span', { class: 'particule' });
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      zone.append(p);
      setTimeout(() => p.remove(), 1000);
    }
  }

  async function suite(note) {
    if (!ses || (ses.phase !== 'note' && ses.phase !== 'continuer') || !note) return;
    ses.phase = 'passage';
    const res = M.enregistrerReponse(prog, ses.carte, note, maintenant(), Math.random);
    ses.vues += 1;
    if (ses.res.resultat !== 'faux') ses.justes += 1;
    if (res.sortie) ses.sorties += 1;
    prog.points = ses.rs.pointsTotaux;
    sauver();
    ses.dernier = ses.carte.id;
    if (ses.res.resultat !== 'faux' && ui.carte && !reduit()) {
      ui.carte.classList.add('sort');
      await attendre(230);
    }
    if (ses.niveauEnAttente) {
      const n = ses.niveauEnAttente;
      ses.niveauEnAttente = null;
      await afficherNiveau(n);
    }
    questionSuivante();
  }

  async function afficherNiveau(n) {
    const o = document.getElementById('niveau');
    document.getElementById('niveau-nombre').textContent = String(n);
    o.hidden = false;
    annoncer('Niveau ' + n + ' atteint.');
    Sons.niveau();
    await new Promise((ok) => setTimeout(ok, 1500));
    o.hidden = true;
  }

  function clavierSession(e) {
    if (e.ctrlKey || e.metaKey) return false;
    if (ses && ses.q && (ses.phase !== 'question' || ses.q.lectureAvant) && lireTouche(e, () => ses.q.segments)) return true;
    if (!ses) return false;
    const q = ses.q;
    if (ses.phase === 'question') {
      if (q.choix && /^[1-4]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (q.choix[i] !== undefined) { e.preventDefault(); valider(q.choix[i]); return true; }
      }
      if (!q.choix && e.key === 'Enter') {
        const champ = document.getElementById('saisie');
        if (champ && champ.value.trim()) { e.preventDefault(); valider(champ.value); }
        return true;
      }
    } else if (ses.phase === 'note') {
      const map = { 2: 'difficile', 3: 'correct', 4: 'facile', Enter: 'correct' };
      if (map[e.key]) { e.preventDefault(); suite(map[e.key]); return true; }
    } else if (ses.phase === 'continuer') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); suite(ses.note); return true; }
    }
    return false;
  }

  // ---------- Fin de session ----------

  function finSession() {
    const s = ses;
    ses = null;
    ui = null;
    sauver();
    document.getElementById('fond-pulse').classList.remove('on');
    const pourcent = s.vues ? Math.round((100 * s.justes) / s.vues) : 0;
    const gagne = s.rs.points;
    const stat = (cle, valeur, suffixe, etiquette, large) => {
      const v = h('div', { class: 'v num', 'aria-hidden': 'true' }, '0');
      setTimeout(() => compter(v, valeur, suffixe, 1100), 0);
      return h('div', { class: 'stat' + (large ? ' large' : ''), role: 'group', 'aria-label': etiquette + ' : ' + nombre(valeur) + (suffixe || '') }, v, h('div', { class: 'l' }, etiquette));
    };
    const contenu = s.vues === 0
      ? [h('h1', null, 'Rien à réviser pour l’instant'), h('p', { class: 'vide' }, 'Reviens un peu plus tard : les prochaines cartes arrivent bientôt.')]
      : [h('h1', null, 'Session terminée'),
        h('div', { class: 'grille-stats' },
          stat('pts', gagne, '', 'points gagnés', true),
          stat('vues', s.vues, '', 'cartes vues'),
          stat('pct', pourcent, ' %', 'de réussite'),
          stat('combo', s.rs.meilleurCombo, '', 'plus long combo'),
          stat('sorties', s.sorties, '', 'sorties de l’apprentissage'))];
    afficher([h('section', { class: 'fin' }, contenu), barre(h('button', { class: 'btn principal', on: { click: vueAccueil } }, 'Retour à l’accueil'))], { barre: true });
    touches = (e) => (e.key === 'Enter' ? (vueAccueil(), true) : false);
    annoncer(s.vues ? 'Session terminée. ' + s.vues + ' cartes, ' + pourcent + ' pour cent de réussite, ' + gagne + ' points.' : 'Rien à réviser pour l’instant.');
  }

  // ---------- Sprint ----------

  let sp = null;

  function demarrerSprint() {
    Sons.debloquer();
    const cartes = M.cartesSprint(prog, catalogue, prog.reglages).filter((c) => D.entree(c));
    sp = { cartes, fin: performance.now() + C.SPRINT_DUREE_S * 1000, rs: R.sessionNeuve(prog.points), n: 0, justes: 0, dernier: null, verrou: false, q: null, timer: null, niveau0: R.niveau(prog.points) };
    const u = {
      temps: h('span', { class: 'temps num' }, String(C.SPRINT_DUREE_S)),
      barre: h('i'),
      mult: h('span', { class: 'mult num' }),
      detail: h('span', { class: 'detail num' }),
      pts: h('strong', { class: 'num' }),
      zone: h('div', { class: 'zone-carte' }),
      actions: h('div', { class: 'actions' }),
    };
    sp.ui = u;
    afficher(h('section', { class: 'session' },
      h('div', { class: 'haut' },
        h('button', { class: 'btn', on: { click: () => quitterSprint() } }, 'Quitter'),
        h('div', { class: 'combo', 'aria-label': 'Combo' }, u.mult, u.detail),
        h('div', { class: 'stat-pts' }, 'Points', u.pts)),
      h('div', { class: 'chrono', role: 'timer', 'aria-label': 'Temps restant' }, u.barre),
      h('div', { class: 'ligne-info', style: 'display:flex;justify-content:space-between' }, u.temps, h('span', { class: 'num' }, 'Record à battre : ' + nombre(prog.sprintRecord))),
      u.zone, u.actions));
    touches = clavierSprint;
    nettoyage = () => { if (sp && sp.timer) clearInterval(sp.timer); document.getElementById('fond-pulse').classList.remove('on'); sp = null; };
    majSprint();
    questionSprint();
    sp.timer = setInterval(() => {
      const reste = Math.max(0, sp.fin - performance.now());
      sp.ui.temps.textContent = String(Math.ceil(reste / 1000));
      sp.ui.barre.style.transform = 'scaleX(' + reste / (C.SPRINT_DUREE_S * 1000) + ')';
      if (reste <= 0) finSprint();
    }, 100);
  }

  function majSprint() {
    const c = sp.rs.combo;
    sp.ui.mult.textContent = '×' + virgule(R.multiplicateur(c));
    sp.ui.mult.classList.toggle('zero', c === 0);
    sp.ui.detail.textContent = c === 0 ? 'Combo : 0' : 'Combo : ' + c + ' d’affilée';
    sp.ui.pts.textContent = nombre(sp.rs.points);
    document.getElementById('fond-pulse').classList.toggle('on', c >= 20 && !reduit());
  }

  function questionSprint() {
    const autres = sp.cartes.filter((c) => c.id !== sp.dernier);
    const pool = autres.length ? autres : sp.cartes;
    const carte = pool[Math.floor(Math.random() * pool.length)];
    const entree = D.entree(carte);
    const format = carte.type === 'vocab' ? 'qcm-de-fr' : carte.type === 'gram' ? 'qcm-trou' : 'qcm-conj';
    sp.q = M.construireQuestion(entree, carte, format, D.vocabulaire, Math.random, contexteQuestion(entree, carte));
    sp.carte = carte;
    sp.dernier = carte.id;
    sp.verrou = false;
    const u = sp.ui;
    u.zone.replaceChildren(h('article', { class: 'carte' + (sp.rs.combo >= 3 ? ' lumiere' : ''), role: 'group', 'aria-label': 'Question' },
      h('div', { class: 'entree' + (sp.q.invite === 'sens' ? '' : ' phrase') }, sp.q.affiche),
      sp.q.traduction ? h('p', { class: 'traduction', lang: 'fr' }, sp.q.traduction) : null,
      h('p', { class: 'invite' }, texteInvite(sp.q)),
      sp.q.lectureAvant ? boutonsEcoute(() => sp.q.segments, true) : null));
    u.actions.replaceChildren();
    sp.q.choix.forEach((texte, i) => {
      u.actions.append(h('button', { class: 'choix', 'aria-label': 'Choix ' + (i + 1) + ' : ' + texte, on: { click: () => repondreSprint(texte, i) } },
        h('span', { class: 'touche', 'aria-hidden': 'true' }, String(i + 1)), h('span', null, texte), h('span', { class: 'marque', 'aria-hidden': 'true' })));
    });
  }

  async function repondreSprint(texte) {
    if (!sp || sp.verrou) return;
    sp.verrou = true;
    const q = sp.q;
    const juste = M.corriger(q, texte).resultat === 'juste';
    const r = R.appliquerReponse(sp.rs, juste);
    sp.rs = r.etat;
    sp.n += 1;
    if (juste) sp.justes += 1;
    prog.points = sp.rs.pointsTotaux;
    [].forEach.call(sp.ui.actions.querySelectorAll('.choix'), (b, i) => {
      b.disabled = true;
      const m = b.querySelector('.marque');
      if (q.choix[i] === q.reponse) { b.classList.add('juste'); m.textContent = '✓'; }
      else if (q.choix[i] === texte) { b.classList.add('faux'); m.textContent = '✗'; }
    });
    annoncer(juste ? 'Juste. Plus ' + r.gain + '.' : 'Faux. ' + q.reponse + '.');
    if (juste) Sons.juste(); else Sons.faux();
    majSprint();
    if (juste && r.gain) {
      const g = h('div', { class: 'gain-flottant num' }, '+' + r.gain);
      sp.ui.zone.append(g);
      setTimeout(() => g.remove(), 1000);
    }
    if (r.effets.tremblement && !reduit()) { vibrer(90); document.body.classList.add('secoue'); setTimeout(() => document.body.classList.remove('secoue'), 450); }
    await attendre(juste ? 380 : 800);
    if (sp) questionSprint();
  }

  function clavierSprint(e) {
    if (!sp || sp.verrou || !sp.q || e.ctrlKey || e.metaKey) return false;
    if (lireTouche(e, () => sp.q.texteLecture)) return true;
    if (/^[1-4]$/.test(e.key)) {
      const t = sp.q.choix[Number(e.key) - 1];
      if (t !== undefined) { e.preventDefault(); repondreSprint(t); return true; }
    }
    return false;
  }

  function quitterSprint() {
    if (sp) { sauver(); }
    vueAccueil();
  }

  function finSprint() {
    const s = sp;
    clearInterval(s.timer);
    s.timer = null;
    const nouveauRecord = s.rs.points > prog.sprintRecord;
    if (nouveauRecord) prog.sprintRecord = s.rs.points;
    prog.points = s.rs.pointsTotaux;
    sauver();
    const niveauMonte = R.niveau(prog.points) > s.niveau0;
    const niv = R.niveau(prog.points);
    sp = null;
    const stat = (valeur, suffixe, etiquette, large) => {
      const v = h('div', { class: 'v num', 'aria-hidden': 'true' }, '0');
      setTimeout(() => compter(v, valeur, suffixe, 1100), 0);
      return h('div', { class: 'stat' + (large ? ' large' : ''), role: 'group', 'aria-label': etiquette + ' : ' + nombre(valeur) + (suffixe || '') }, v, h('div', { class: 'l' }, etiquette));
    };
    afficher([h('section', { class: 'fin' },
      h('h1', null, nouveauRecord && s.rs.points > 0 ? 'Nouveau record !' : 'Sprint terminé'),
      h('div', { class: 'grille-stats' },
        stat(s.rs.points, '', 'points', true),
        stat(s.n, '', 'cartes'),
        stat(s.n ? Math.round((100 * s.justes) / s.n) : 0, ' %', 'de réussite'),
        stat(s.rs.meilleurCombo, '', 'plus long combo'),
        stat(prog.sprintRecord, '', 'meilleur Sprint')),
      h('p', { class: 'ligne-info' }, 'Le Sprint rapporte des points, mais ne change pas le calendrier de tes révisions.')),
    barre(h('button', { class: 'btn', on: { click: demarrerSprint } }, 'Rejouer'), h('button', { class: 'btn principal', on: { click: vueAccueil } }, 'Accueil'))], { barre: true });
    annoncer('Sprint terminé. ' + s.rs.points + ' points.');
    touches = (e) => (e.key === 'Enter' ? (vueAccueil(), true) : false);
    if (niveauMonte) afficherNiveau(niv);
  }

  // ---------- Réglages, sauvegarde ----------

  function reglageCase(cle, titre, aide) {
    const id = 'r-' + cle;
    const c = h('input', { type: 'checkbox', id, checked: prog.reglages[cle] ? true : null });
    c.checked = !!prog.reglages[cle];
    c.addEventListener('change', () => { prog.reglages[cle] = c.checked; sauver(); appliquerReglages(); });
    return h('div', { class: 'reglage' }, h('label', { for: id }, titre, aide ? h('small', null, aide) : null), c);
  }

  function reglageNombre(titre, lire, ecrire, min, max, aide) {
    const id = 'n-' + titre.replace(/\W+/g, '');
    const c = h('input', { type: 'number', id, min, max, inputmode: 'numeric', value: lire() });
    c.addEventListener('change', () => {
      const v = Math.max(min, Math.min(max, parseInt(c.value, 10) || min));
      c.value = v;
      ecrire(v);
      sauver();
    });
    return h('div', { class: 'reglage' }, h('label', { for: id }, titre, aide ? h('small', null, aide) : null), c);
  }

  function vueReglages() {
    const r = prog.reglages;
    const themes = D.themes.map((t) => {
      const id = 't-' + t.id;
      const c = h('input', { type: 'checkbox', id });
      c.checked = !r.themesActifs || r.themesActifs.indexOf(t.id) !== -1;
      c.addEventListener('change', () => {
        let actifs = r.themesActifs ? r.themesActifs.slice() : D.themes.map((x) => x.id);
        actifs = c.checked ? actifs.concat(t.id) : actifs.filter((x) => x !== t.id);
        if (!actifs.length) { c.checked = true; return toast('Garde au moins un thème actif.'); }
        r.themesActifs = actifs.length === D.themes.length ? null : actifs;
        sauver();
      });
      return h('div', { class: 'reglage' }, h('label', { for: id }, t.titre), c);
    });

    const panneauRaz = h('div');
    const remiseAZero = () => {
      panneauRaz.replaceChildren(h('div', { class: 'alerte', role: 'alert' },
        h('p', null, 'Étape 1 sur 2. Toute ta progression sera effacée : cartes, points, série, réglages. Pense à exporter une sauvegarde avant.'),
        h('div', { class: 'rangee' },
          h('button', { class: 'btn', on: { click: () => panneauRaz.replaceChildren() } }, 'Annuler'),
          h('button', { class: 'btn danger', on: { click: etape2 } }, 'Continuer'))));
    };
    const etape2 = () => {
      panneauRaz.replaceChildren(h('div', { class: 'alerte', role: 'alert' },
        h('p', null, 'Étape 2 sur 2. Dernière confirmation : effacer définitivement toute la progression ?'),
        h('div', { class: 'rangee' },
          h('button', { class: 'btn', on: { click: () => panneauRaz.replaceChildren() } }, 'Non, garder'),
          h('button', { class: 'btn danger', on: { click: () => { prog = S.progressionNeuve(); sauver(); appliquerReglages(); toast('Progression effacée.'); vueAccueil(); } } }, 'Oui, tout effacer'))));
    };

    const panneauImport = h('div');
    const fichier = h('input', { type: 'file', accept: 'application/json,.json', id: 'import-fichier', class: 'sr-only', tabindex: '-1' });
    fichier.addEventListener('change', () => {
      const f = fichier.files && fichier.files[0];
      if (!f) return;
      const lecteur = new FileReader();
      lecteur.onload = () => {
        const res = S.importer(String(lecteur.result));
        fichier.value = '';
        if (!res.ok) return panneauImport.replaceChildren(h('div', { class: 'alerte', role: 'alert' }, h('p', null, res.erreur)));
        const p = res.progression;
        panneauImport.replaceChildren(h('div', { class: 'alerte', role: 'alert' },
          h('p', null, 'Cette sauvegarde contient ' + Object.keys(p.cartes).length + ' cartes et ' + nombre(p.points) + ' points. Elle remplacera ta progression actuelle.'),
          h('div', { class: 'rangee' },
            h('button', { class: 'btn', on: { click: () => panneauImport.replaceChildren() } }, 'Annuler'),
            h('button', { class: 'btn principal', on: { click: () => { prog = p; sauver(); appliquerReglages(); toast('Progression restaurée.'); vueAccueil(); } } }, 'Remplacer'))));
      };
      lecteur.onerror = () => panneauImport.replaceChildren(h('div', { class: 'alerte', role: 'alert' }, h('p', null, 'Impossible de lire ce fichier.')));
      lecteur.readAsText(f);
    });

    afficher([
      h('div', { class: 'page' },
        h('h1', null, 'Réglages'),
        h('section', { class: 'bloc' }, h('h2', null, 'Thèmes actifs'), themes),
        h('section', { class: 'bloc' }, h('h2', null, 'Objectif et nouvelles cartes'),
          reglageNombre('Objectif du jour (cartes)', () => r.objectifJour, (v) => { r.objectifJour = v; }, 1, 500),
          reglageNombre('Nouvelles cartes de vocabulaire', () => r.repartition.vocab, (v) => { r.repartition.vocab = v; }, 0, 100, 'par jour'),
          reglageNombre('Nouvelles cartes de grammaire', () => r.repartition.gram, (v) => { r.repartition.gram = v; }, 0, 100, 'par jour'),
          reglageNombre('Nouvelles cartes de conjugaison', () => r.repartition.conj, (v) => { r.repartition.conj = v; }, 0, 100, 'par jour ; une part inutilisée passe aux autres')),
        h('section', { class: 'bloc' }, h('h2', null, 'Confort'),
          reglageCase('son', 'Son', 'coupe aussi la voix'),
          reglageCase('vibrations', 'Vibrations'),
          reglageCase('reduireAnimations', 'Réduire les animations', 'supprime aussi le tremblement'),
          reglageCase('lectureAuto', 'Lecture automatique de la voix'),
          reglageCase('formatEcoute', 'Format d’écoute', 'cartes mûres : le mot est lu sans être affiché')),
        h('section', { class: 'bloc' }, h('h2', null, 'Sauvegarde'),
          h('div', { class: 'liste-btn' },
            h('button', { class: 'btn', on: { click: exporter } }, 'Exporter ma progression'),
            h('label', { class: 'btn', for: 'import-fichier', role: 'button', tabindex: '0', on: { keydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fichier.click(); } } } }, 'Importer une sauvegarde'),
            fichier, panneauImport)),
        h('section', { class: 'bloc' }, h('h2', null, 'Autres'),
          h('div', { class: 'liste-btn' },
            h('button', { class: 'btn', on: { click: vueProblematiques } }, 'Cartes difficiles'),
            h('button', { class: 'btn', on: { click: vueAPropos } }, 'À propos'),
            h('button', { class: 'btn danger', on: { click: remiseAZero } }, 'Remise à zéro…'),
            panneauRaz))),
      barre(h('button', { class: 'btn principal', on: { click: vueAccueil } }, 'Retour')),
    ], { barre: true });
    touches = (e) => (e.key === 'Escape' ? (vueAccueil(), true) : false);
  }

  function exporter() {
    const d = new Date();
    const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const fs = plugin('Filesystem'), partage = plugin('Share');
    if (fs && partage) {
      // APK : fichier écrit dans le cache de l'application, puis le menu Partager (Drive, e-mail, Fichiers…)
      const nom = 'allemand-sauvegarde-' + date + '.json';
      fs.writeFile({ path: nom, data: S.exporter(prog), directory: 'CACHE', encoding: 'utf8' })
        .then((r) => partage.share({ title: 'Sauvegarde AMOR & Deutsch', files: [r.uri], dialogTitle: 'Enregistrer ou envoyer la sauvegarde' }))
        .then(() => toast('Sauvegarde prête.'))
        .catch((e) => { if (!/cancel/i.test(String(e && e.message))) toast("La sauvegarde n'a pas pu être partagée."); });
      return;
    }
    const blob = new Blob([S.exporter(prog)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: 'allemand-sauvegarde-' + date + '.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Sauvegarde téléchargée.');
  }

  function vueAPropos() {
    afficher([
      h('div', { class: 'page texte-long' },
        h('h1', null, 'À propos'),
        h('p', null, 'Application d’apprentissage de l’allemand (allemand standard d’Allemagne, de-DE) : cartes à répétition espacée avec un habillage de jeu. Tout fonctionne sans compte ni connexion.'),
        h('p', null, 'Le vocabulaire est contrôlé mécaniquement contre ces sources, puis relu par le modèle d’IA qui a aidé à le rédiger (aucun germanophone ne l’a relu) :'),
        h('ul', null,
          h('li', null, 'Listes Goethe-Institut A1, A2, B1 (via le DWDS) : servent à vérifier, ne sont pas recopiées.'),
          h('li', null, 'DWDS, Académie des sciences de Berlin-Brandebourg : liste des mots-vedettes.'),
          h('li', null, 'Wiktionnaire allemand et français, extractions Wiktextract (kaikki.org) : licences CC BY-SA et GFDL.'),
          h('li', null, 'Tatoeba (tatoeba.org), phrases allemandes et françaises traduites : licence CC BY 2.0 FR. Sert à confirmer les traductions, surtout des expressions.'),
          h('li', null, 'LanguageTool (LGPL) et dictionnaire Hunspell de_DE : orthographe et grammaire des phrases.'),
          h('li', null, 'Rat für deutsche Rechtschreibung (Amtliches Regelwerk 2024) et grammis (Institut für Deutsche Sprache).')),
        h('p', null, 'Polices : Inter et Space Grotesk, licence SIL Open Font License.'),
        h('p', null, 'Voix : fichiers enregistrés d’avance avec la voix « Killian » de Microsoft (edge-tts), intégrés à l’application ; à défaut, la synthèse vocale de l’appareil.'),
        h('p', null, 'Les sons de jeu sont générés par l’appareil (Web Audio).')),
      barre(h('button', { class: 'btn principal', on: { click: vueReglages } }, 'Retour')),
    ], { barre: true });
  }

  // ---------- Démarrage ----------

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('niveau').hidden) return;
    if (touches && touches(e)) return;
    if (e.key === 'Escape' && vue.classList.contains('avec-barre') && document.querySelector('.barre .btn.principal')) {
      // Échap = retour quand la vue le permet
    }
  });
  // Premier geste de l'utilisateur : le navigateur (Safari sur iPhone surtout) autorise ensuite le son.
  const GESTES = ['pointerup', 'touchend', 'keydown', 'click'];
  const premierGeste = () => {
    Sons.debloquer();
    Voix.debloquer();
    GESTES.forEach((t) => document.removeEventListener(t, premierGeste, true));
  };
  GESTES.forEach((t) => document.addEventListener(t, premierGeste, true));

  Voix.surAbsence = function () {
    toast('Voix allemande non installée : ce son manque. Windows : Paramètres > Heure et langue > Voix > Ajouter des voix. Android : Paramètres > Synthèse vocale > Allemand. iPhone : Réglages > Accessibilité > Contenu énoncé > Voix > Allemand.');
  };
  Voix.surCoupe = function () {
    toast('Le son est coupé. Pour écouter, active « Son » dans les réglages.');
  };

  // Version web servie par http(s) : service worker (hors connexion) ; rien en double-clic (file://) ni dans l'APK.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !plugin('Filesystem')) {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
      if (navigator.serviceWorker.controller) prechargerAudio();
      else navigator.serviceWorker.addEventListener('controllerchange', prechargerAudio, { once: true });
    }).catch(() => { /* sans service worker, l'application marche quand même en ligne */ });
  }

  appliquerReglages();
  if (window.matchMedia) {
    try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', appliquerReglages); } catch (e) { /* ancien navigateur */ }
  }
  vueAccueil();
})();
