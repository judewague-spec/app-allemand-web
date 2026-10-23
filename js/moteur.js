/* Moteur de révision : répétition espacée, choix des formats, correction des saisies.
   Aucun accès au DOM, au temps réel ni au hasard global : l'heure (ms) et le tirage (rng) sont passés en paramètres. */
(function (root) {
  'use strict';

  const C = typeof require === 'function' ? require('./config.js') : root.Config;
  const MIN = 60000;
  const JOUR_MS = 86400000;

  // ---------- Hasard et temps ----------

  /** Générateur à graine (mulberry32), pour des tests reproductibles. */
  function rngGraine(graine) {
    let a = graine >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Numéro du jour (jours depuis 1970), la journée changeant à 4 h, heure locale. */
  function numeroJour(ms) {
    const d = new Date(ms);
    let n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / JOUR_MS);
    if (d.getHours() < C.HEURE_DEBUT_JOUR) n -= 1;
    return n;
  }

  /** Instant (ms) où commence le jour n, soit 4 h locale. */
  function debutJour(n) {
    const u = new Date(n * JOUR_MS);
    return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), C.HEURE_DEBUT_JOUR).getTime();
  }

  function melanger(tab, rng) {
    const t = tab.slice();
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const x = t[i];
      t[i] = t[j];
      t[j] = x;
    }
    return t;
  }

  // ---------- Cartes ----------

  function nouvelleCarte(id, type, fiche) {
    return {
      id,
      type, // 'vocab' | 'gram' | 'conj'
      fiche: fiche || id,
      etat: 'neuve', // neuve | apprentissage | reapprentissage | revision
      etape: 0,
      facteur: C.FACTEUR_DEPART,
      intervalle: 0, // jours, pour l'état revision
      intervalleApres: 0, // jours, mémorisé pendant le réapprentissage
      echeance: 0, // ms
      echecs: 0, // échecs en révision
      reps: 0,
      problematique: false,
    };
  }

  /** État affiché : neuve, apprentissage, reapprentissage, en_cours (< 21 j) ou mure (≥ 21 j). */
  function etatAffiche(carte) {
    if (carte.etat === 'revision') return carte.intervalle >= C.SEUIL_MURE_JOURS ? 'mure' : 'en_cours';
    return carte.etat;
  }

  const arrondi2 = (x) => Math.round(x * 100) / 100;

  function changerFacteur(facteur, note) {
    return Math.max(C.FACTEUR_MIN, arrondi2(facteur + C.DELTA_FACTEUR[note]));
  }

  /** Intervalles possibles (jours) d'une carte en révision : calcul, variation, arrondi, planchers, dans cet ordre. */
  function intervallesRevision(carte, rng) {
    const a = carte.intervalle;
    const f = carte.facteur;
    const varier = (x) => (x >= C.SEUIL_VARIATION_JOURS ? x * (1 + (2 * rng() - 1) * C.VARIATION) : x);
    const difficile = Math.max(Math.round(varier(a * C.COEF_DIFFICILE)), a + 1);
    const correct = Math.max(Math.round(varier(a * f)), difficile + 1);
    const facile = Math.max(Math.round(varier(a * f * C.COEF_FACILE)), correct + 1);
    return { difficile, correct, facile };
  }

  function sortirDeLApprentissage(c, jours, now) {
    c.etat = 'revision';
    c.etape = 0;
    c.intervalle = jours;
    c.echeance = debutJour(numeroJour(now) + jours);
  }

  /**
   * Applique une note ('encore' | 'difficile' | 'correct' | 'facile') et renvoie {carte, sortie}.
   * La carte d'origine n'est pas modifiée. `sortie` vaut true quand la carte quitte l'apprentissage pour la première fois.
   */
  function repondre(carte, note, now, rng) {
    const c = Object.assign({}, carte);
    const avant = c.etat;
    let sortie = false;
    c.reps += 1;

    if (avant === 'neuve' || avant === 'apprentissage') {
      c.etat = 'apprentissage';
      if (note === 'encore') c.etape = 0;
      else if (note === 'correct') c.etape += 1;
      else if (note === 'facile') {
        sortirDeLApprentissage(c, C.INTERVALLE_SORTIE_FACILE_JOURS, now);
        sortie = true;
      }
      // difficile : même étape, même délai
      if (c.etat === 'apprentissage') {
        if (c.etape >= C.ETAPES_APPRENTISSAGE_MIN.length) {
          sortirDeLApprentissage(c, C.INTERVALLE_SORTIE_JOURS, now);
          sortie = true;
        } else {
          c.echeance = now + C.ETAPES_APPRENTISSAGE_MIN[c.etape] * MIN;
        }
      }
    } else if (avant === 'revision') {
      if (note === 'encore') {
        c.facteur = changerFacteur(c.facteur, 'encore');
        c.echecs += 1;
        if (c.echecs >= C.ECHECS_PROBLEMATIQUE) c.problematique = true;
        c.intervalleApres = Math.max(1, Math.round(c.intervalle / 2));
        c.etat = 'reapprentissage';
        c.echeance = now + C.ETAPE_REAPPRENTISSAGE_MIN * MIN;
      } else {
        const iv = intervallesRevision(c, rng)[note];
        c.facteur = changerFacteur(c.facteur, note); // l'intervalle utilise le facteur d'avant la réponse
        c.intervalle = iv;
        c.echeance = debutJour(numeroJour(now) + iv);
      }
    } else if (avant === 'reapprentissage') {
      if (note === 'encore' || note === 'difficile') {
        c.echeance = now + C.ETAPE_REAPPRENTISSAGE_MIN * MIN;
      } else {
        const jours = c.intervalleApres + (note === 'facile' ? 1 : 0);
        c.etat = 'revision';
        c.intervalle = jours;
        c.echeance = debutJour(numeroJour(now) + jours);
      }
    } else {
      throw new Error('État de carte inconnu : ' + avant);
    }
    return { carte: c, sortie };
  }

  /**
   * Note imposée par le résultat de la réponse, ou null si l'apprenant choisit.
   * faux → encore ; faute de frappe → difficile en révision, correct en apprentissage et réapprentissage.
   */
  function noteImposee(carte, resultat) {
    if (resultat === 'faux') return 'encore';
    if (resultat === 'faute_frappe') return carte.etat === 'revision' ? 'difficile' : 'correct';
    return null;
  }

  // ---------- Plafonds et file du jour ----------

  function etatDuJour(prog, now) {
    const n = numeroJour(now);
    if (!prog.jour || prog.jour.numero !== n) {
      prog.jour = { numero: n, nouvelles: { vocab: 0, gram: 0, conj: 0 }, revisions: 0, reponses: 0 };
    }
    return prog.jour;
  }

  /** Nombre de cartes neuves à proposer par catégorie ; une part inutilisée passe aux autres. */
  function allotissement(dispo, faites, repartition) {
    const cats = ['vocab', 'gram', 'conj'];
    const total = cats.reduce((s, k) => s + repartition[k], 0);
    const dejaFaites = cats.reduce((s, k) => s + (faites[k] || 0), 0);
    const restantTotal = Math.max(0, total - dejaFaites);
    const part = {};
    let somme = 0;
    cats.forEach((k) => {
      part[k] = Math.min(Math.max(0, repartition[k] - (faites[k] || 0)), dispo[k] || 0);
      somme += part[k];
    });
    let reste = restantTotal - somme;
    cats.forEach((k) => {
      if (reste <= 0) return;
      const extra = Math.min(reste, (dispo[k] || 0) - part[k]);
      if (extra > 0) {
        part[k] += extra;
        reste -= extra;
      }
    });
    return part;
  }

  function entreeActive(entree, reglages) {
    if (entree.type !== 'vocab' || !reglages.themesActifs) return true;
    return reglages.themesActifs.indexOf(entree.theme) !== -1;
  }

  function parEcheance(a, b) {
    return a.echeance - b.echeance || (a.id < b.id ? -1 : 1);
  }

  /** Premier élément du tableau qui n'est pas la dernière carte vue (ou le premier si `permis`). */
  function eviter(tab, dernier, permis) {
    return tab.find((c) => c.id !== dernier) || (permis ? tab[0] : null) || null;
  }

  /**
   * Prochaine carte à présenter, ou null.
   * `catalogue` : [{id, type, fiche, theme?}] dans l'ordre des fichiers. Renvoie {carte, neuve}.
   */
  function prochaineCarte(prog, catalogue, now, reglages, dernier) {
    const jour = etatDuJour(prog, now);
    const index = new Map(catalogue.map((e) => [e.id, e]));
    const vues = Object.keys(prog.cartes)
      .filter((id) => index.has(id) && entreeActive(index.get(id), reglages))
      .map((id) => prog.cartes[id]);

    const enApprentissage = vues.filter((c) => c.etat === 'apprentissage' || c.etat === 'reapprentissage');
    const echues = enApprentissage.filter((c) => c.echeance <= now).sort(parEcheance);
    const revisions = vues
      .filter((c) => c.etat === 'revision' && c.echeance <= now)
      .sort(parEcheance);

    // Ordre : apprentissage échu, révision échue, carte neuve, apprentissage proche.
    // La dernière carte vue ne revient qu'en dernier recours, quand rien d'autre n'est possible.
    const bientot = enApprentissage
      .filter((c) => c.echeance <= now + C.ANTICIPATION_MIN * MIN)
      .sort(parEcheance);
    const revisionsPermises = jour.revisions < C.PLAFOND_REVISIONS ? revisions : [];

    const jamaisVues = catalogue.filter((e) => !prog.cartes[e.id] && entreeActive(e, reglages));
    const dispo = { vocab: 0, gram: 0, conj: 0 };
    jamaisVues.forEach((e) => (dispo[e.type] += 1));
    const part = allotissement(dispo, jour.nouvelles, reglages.repartition);
    const choix = ['vocab', 'gram', 'conj']
      .filter((k) => part[k] > 0)
      .sort((a, b) => jour.nouvelles[a] / reglages.repartition[a] - jour.nouvelles[b] / reglages.repartition[b])[0];
    const neuve = choix ? jamaisVues.find((x) => x.type === choix) : null;

    for (const permis of [false, true]) {
      const e = eviter(echues, dernier, permis);
      if (e) return { carte: e, neuve: false };
      const r = eviter(revisionsPermises, dernier, permis);
      if (r) return { carte: r, neuve: false };
      if (neuve) return { carte: nouvelleCarte(neuve.id, neuve.type, neuve.fiche), neuve: true };
      const p = eviter(bientot, dernier, permis);
      if (p) return { carte: p, neuve: false };
    }
    return null;
  }

  /**
   * Cartes probables d'aujourd'hui, pour garder leur audio d'avance hors connexion : les cartes vues dont
   * l'échéance tombe dans les prochaines 24 heures, puis les cartes neuves que la répartition permet encore.
   */
  function cartesDuJour(prog, catalogue, now, reglages) {
    const jour = etatDuJour(prog, now);
    const actives = catalogue.filter((e) => entreeActive(e, reglages));
    const vues = actives.filter((e) => prog.cartes[e.id] && prog.cartes[e.id].echeance <= now + 24 * 60 * MIN);
    const jamaisVues = actives.filter((e) => !prog.cartes[e.id]);
    const dispo = { vocab: 0, gram: 0, conj: 0 };
    jamaisVues.forEach((e) => (dispo[e.type] += 1));
    const part = allotissement(dispo, jour.nouvelles, reglages.repartition);
    const neuves = ['vocab', 'gram', 'conj'].flatMap((k) => jamaisVues.filter((e) => e.type === k).slice(0, part[k]));
    return vues.concat(neuves);
  }

  /** Enregistre une réponse dans la progression (carte, compteurs du jour, jour actif). Renvoie {carte, sortie}. */
  function enregistrerReponse(prog, carte, note, now, rng) {
    const jour = etatDuJour(prog, now);
    const res = repondre(carte, note, now, rng);
    if (carte.etat === 'neuve') jour.nouvelles[carte.type] += 1;
    else if (carte.etat === 'revision') jour.revisions += 1;
    jour.reponses += 1;
    prog.cartes[carte.id] = res.carte;
    if (prog.joursActifs.indexOf(jour.numero) === -1) prog.joursActifs.push(jour.numero);
    return res;
  }

  // ---------- Sprint ----------

  /** Cartes du sprint : sorties de l'apprentissage (état revision), actives. */
  function cartesSprint(prog, catalogue, reglages) {
    const index = new Map(catalogue.map((e) => [e.id, e]));
    return Object.keys(prog.cartes)
      .filter((id) => index.has(id) && entreeActive(index.get(id), reglages))
      .map((id) => prog.cartes[id])
      .filter((c) => c.etat === 'revision');
  }

  function sprintDisponible(prog, catalogue, reglages) {
    const n = cartesSprint(prog, catalogue, reglages).length;
    return { ok: n >= C.SPRINT_MIN_CARTES, nombre: n, manque: Math.max(0, C.SPRINT_MIN_CARTES - n) };
  }

  // ---------- Formats ----------

  /**
   * Format de la question (section 6).
   * Vocabulaire : neuve/apprentissage → QCM allemand→français ; en cours/réapprentissage → saisie français→allemand ;
   * mûre → saisie allemand→français (ou écoute si le réglage est actif).
   * Grammaire : QCM à trou. Conjugaison : QCM en apprentissage, saisie ensuite.
   */
  function choisirFormat(carte, reglages) {
    const apprend = carte.etat === 'neuve' || carte.etat === 'apprentissage';
    if (carte.type === 'gram') return 'qcm-trou';
    if (carte.type === 'conj') return apprend ? 'qcm-conj' : 'saisie-conj';
    if (apprend) return 'qcm-de-fr';
    const e = etatAffiche(carte);
    if (e === 'mure') return reglages && reglages.formatEcoute ? 'ecoute-fr' : 'saisie-de-fr';
    return 'saisie-fr-de';
  }

  // ---------- Normalisation et correction ----------

  function espaces(s) {
    return s.normalize('NFC').replace(/\s+/g, ' ').trim();
  }

  /** Français : accents, majuscules, espaces et article initial ignorés. */
  function normFr(s) {
    let t = s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[’`]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    t = t.replace(/^(?:(?:le|la|les|un|une) +|l')/, '');
    return t.trim();
  }

  /** ae/oe/ue/ss tiennent lieu de ä/ö/ü/ß. */
  function replierAllemand(s) {
    return s
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
      .replace(/ß/g, 'ss').replace(/ẞ/g, 'SS');
  }

  const CONFUSIONS = new Set(['aä', 'oö', 'uü', 'sß']);
  function confusionVoyelleOuEsset(x, y) {
    const k = [x.toLowerCase(), y.toLowerCase()].sort().join('');
    return CONFUSIONS.has(k);
  }

  /**
   * Écart d'une seule lettre (faute de frappe) entre la saisie `s` et le mot attendu `a`.
   * Renvoie {marque} (position de la lettre fautive dans `a`) ou null. Règles de la section 6 :
   * mot de 5 lettres ou plus, jamais sur les deux dernières lettres, jamais une confusion a/ä, o/ö, u/ü, s/ß,
   * jamais une simple différence de majuscule.
   */
  function ecartUneLettre(s, a) {
    const L = a.length;
    if (L < C.TYPO_LONGUEUR_MIN) return null;
    const protege = L - C.TYPO_LETTRES_FINALES_PROTEGEES;
    if (s.length === L) {
      let i = -1;
      for (let k = 0; k < L; k++) {
        if (s[k] !== a[k]) {
          if (i >= 0) return null;
          i = k;
        }
      }
      if (i < 0 || i >= protege) return null;
      if (s[i].toLowerCase() === a[i].toLowerCase()) return null;
      if (confusionVoyelleOuEsset(s[i], a[i])) return null;
      return { marque: i };
    }
    if (s.length === L - 1) {
      const cand = [];
      for (let i = 0; i < L; i++) if (a.slice(0, i) + a.slice(i + 1) === s) cand.push(i);
      if (!cand.length || cand.some((i) => i >= protege)) return null;
      return { marque: cand[0] };
    }
    if (s.length === L + 1) {
      const cand = [];
      for (let j = 0; j <= L; j++) if (s.slice(0, j) + s.slice(j + 1) === a) cand.push(j);
      if (!cand.length || cand.some((j) => j > protege)) return null;
      return { marque: Math.min(cand[0], L - 1) };
    }
    return null;
  }

  /**
   * Corrige une saisie en allemand.
   * @param {string} saisie
   * @param {string} attendu    forme complète (« der Tisch »)
   * @param {{nature?: string, typoOk?: boolean}} opts  typoOk : vocabulaire seulement
   * @returns {{resultat: 'juste'|'faute_frappe'|'faux', exact: string, marque?: number}}
   */
  function verifierSaisieAllemand(saisie, attendu, opts) {
    const o = opts || {};
    const s = espaces(saisie);
    const a = espaces(attendu);
    const faux = { resultat: 'faux', exact: a };
    if (!s) return faux;
    if (s === a || replierAllemand(s) === replierAllemand(a)) return { resultat: 'juste', exact: a };
    if (!o.typoOk) return faux;

    let debutMot = 0;
    if (o.nature === 'nom') {
      const ia = a.indexOf(' ');
      const is = s.indexOf(' ');
      if (ia < 0 || is < 0) return faux;
      if (replierAllemand(s.slice(0, is)) !== replierAllemand(a.slice(0, ia))) return faux; // jamais de tolérance sur l'article
      debutMot = ia + 1;
      const e = ecartUneLettre(s.slice(is + 1), a.slice(debutMot));
      return e ? { resultat: 'faute_frappe', exact: a, marque: debutMot + e.marque } : faux;
    }
    const e = ecartUneLettre(s, a);
    return e ? { resultat: 'faute_frappe', exact: a, marque: e.marque } : faux;
  }

  /**
   * Nombres écrits en français (règle générale, pour toute entrée de nature « nombre ») :
   * - graphie traditionnelle ou de 1990 : traits d'union et espaces se valent (« vingt et un » = « vingt-et-un »,
   *   « deux cents » = « deux-cents ») ;
   * - écriture en chiffres, groupés ou non par des espaces (« 21 », « 2 000 », « 1 000 000 »).
   */
  function normNombreFr(s) {
    return normFr(s).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function chiffresFr(s) {
    const t = String(s).replace(/\s+/g, ' ').trim(); // \s couvre aussi les espaces insécables
    return /^\d{1,3}( \d{3})*$|^\d+$/.test(t) ? parseInt(t.replace(/ /g, ''), 10) : null;
  }

  /**
   * Corrige une saisie en français : `attendus` = fr et fr_acceptes.
   * `opts.valeur` : valeur d'une entrée de nature « nombre » (voir normNombreFr).
   */
  function verifierSaisieFrancais(saisie, attendus, opts) {
    const s = normFr(saisie);
    const exact = attendus[0];
    if (s && attendus.some((x) => normFr(x) === s)) return { resultat: 'juste', exact };
    const valeur = opts && Number.isInteger(opts.valeur) ? opts.valeur : null;
    if (s && valeur !== null) {
      if (chiffresFr(saisie) === valeur) return { resultat: 'juste', exact };
      const n = normNombreFr(saisie);
      if (attendus.some((x) => normNombreFr(x) === n)) return { resultat: 'juste', exact };
    }
    return { resultat: 'faux', exact };
  }

  // ---------- Leurres et questions ----------

  function textesFr(e) {
    return [e.fr].concat(e.fr_acceptes || []).map(normFr);
  }

  /**
   * Leurres de vocabulaire : même thème et même nature ; à défaut même nature ; à défaut même thème ;
   * à défaut n'importe quelle autre entrée. Jamais deux leurres de même sens, ni de même sens que la réponse.
   */
  function choisirLeurres(entree, pool, n, rng) {
    const pris = [];
    const vus = new Set(textesFr(entree));
    const niveaux = [
      (e) => e.theme === entree.theme && e.nature === entree.nature,
      (e) => e.nature === entree.nature,
      (e) => e.theme === entree.theme,
      () => true,
    ];
    for (const accepte of niveaux) {
      if (pris.length >= n) break;
      for (const e of melanger(pool.filter((x) => x.id !== entree.id && accepte(x)), rng)) {
        if (pris.length >= n) break;
        const t = textesFr(e);
        if (t.some((x) => vus.has(x))) continue;
        t.forEach((x) => vus.add(x));
        pris.push(e);
      }
    }
    return pris;
  }

  function aUnPluriel(e) {
    return !!e.pluriel && e.pluriel !== 'sans pluriel' && e.pluriel !== 'seulement au pluriel';
  }

  /** Le pluriel d'un nom de matière (Wasser, Zucker…) est rare : il s'affiche comme tel, n'est pas lu et ne fait jamais l'objet d'une question. */
  function pluralInterrogeable(e) {
    return aUnPluriel(e) && !e.pluriel_rare;
  }

  /** Texte affiché pour le pluriel d'un nom (null s'il n'y a rien à afficher). */
  function libellePluriel(e) {
    if (!e.pluriel) return null;
    if (e.pluriel_rare) return 'Pluriel rare';
    return 'Pluriel : ' + e.pluriel + (e.pluriel_familier ? ' (familier)' : '');
  }

  /** Texte lu à voix haute pour une entrée : mot (avec pluriel), puis exemple. Le français n'est jamais lu. */
  function texteLecture(entree, type) {
    if (type === 'vocab') {
      const mot = pluralInterrogeable(entree) ? entree.de + ', ' + entree.pluriel : entree.de;
      return entree.exemple_de ? mot + '. ' + entree.exemple_de : mot;
    }
    // exercice de grammaire : la phrase complète (lue après la réponse) ; fiche de règle : ses deux exemples
    // (la formule n'est pas faite pour être lue)
    if (type === 'gram') return entree.phrase.replace('___', entree.reponse);
    if (type === 'regle') return entree.exemples.map((x) => x.de).join(' ');
    return entree.lecture || '';
  }

  /**
   * Morceaux à écouter, dans l'ordre (section 9) : {id, texte, lent}. `id` nomme le fichier audio/<id>.mp3
   * (audio/<id>-lent.mp3 pour la version lente, sauf lent: false) ; `texte` sert à la voix de secours.
   * type : 'vocab', 'gram' (exercice), 'conj' (carte), 'regle', 'fiche-conj' (avec `cartes`, celles de la fiche).
   */
  function segmentsAudio(entree, type, cartes) {
    const exemples = (liste) => liste.map((x, i) => ({ id: entree.id + '-ex' + (i + 1), texte: x.de, lent: true }));
    if (type === 'vocab') {
      const mot = { id: entree.id, texte: pluralInterrogeable(entree) ? entree.de + ', ' + entree.pluriel : entree.de, lent: true };
      return entree.exemple_de ? [mot].concat(exemples([{ de: entree.exemple_de }])) : [mot];
    }
    if (type === 'gram') return [{ id: entree.id, texte: texteLecture(entree, 'gram'), lent: false }];
    if (type === 'conj') return [{ id: entree.id, texte: entree.lecture, lent: false }];
    if (type === 'regle') return exemples(entree.exemples);
    if (type === 'fiche-conj') {
      const formes = (cartes || []).map((c) => c.lecture.replace(/!$/, ''));
      return [{ id: entree.id, texte: [entree.infinitif].concat(formes).join('. ') + '.', lent: true }].concat(exemples(entree.exemples));
    }
    return [];
  }

  /**
   * Question d'une carte de conjugaison, avec le sens du verbe et le nom français du temps (section 3) :
   * « gehen (aller), Perfekt (passé composé) : ich ___ ». Sans fiche, la question des données.
   */
  function questionConj(entree, fiche, verbe) {
    if (!fiche || !fiche.titre_temps_fr) return entree.question;
    const tete = fiche.infinitif + ', ' + fiche.titre_temps;
    if (entree.question.indexOf(tete) !== 0) return entree.question;
    const sens = (fiche.sens || (verbe && verbe.fr) || '').replace(/[()]/g, '');
    const reste = entree.question.slice(tete.length).replace(/^ \(([^)]+)\) :/, ', $1 :'); // impératif : « , du : ___ ! »
    return fiche.infinitif + (sens ? ' (' + sens + ')' : '') + ', ' + fiche.titre_temps + ' (' + fiche.titre_temps_fr + ')' + reste;
  }

  /**
   * Construit la question à poser.
   * `entree` : l'entrée de données ; `pool` : toutes les entrées de vocabulaire (pour les leurres) ;
   * `ctx` (conjugaison, facultatif) : {fiche, verbe}, pour rappeler le sens du verbe et le temps en français.
   */
  function construireQuestion(entree, carte, format, pool, rng, ctx) {
    const q = {
      format,
      carteId: carte.id,
      type: carte.type,
      nature: entree.nature || null,
      valeur: entree.nature === 'nombre' && Number.isInteger(entree.valeur) ? entree.valeur : null,
      affiche: null,
      invite: '',
      choix: null,
      attendus: [],
      reponse: '',
      typoOk: false,
      lectureAvant: false, // l'allemand est la question : lu dès l'affichage
      texteLecture: texteLecture(entree, carte.type),
      segments: segmentsAudio(entree, carte.type),
      traduction: null, // grammaire : la phrase en français, affichée dès la question
      masque: false,
    };
    const qcm = (bonne, fausses) => {
      q.choix = melanger([bonne].concat(fausses), rng);
      q.reponse = bonne;
      q.attendus = [bonne];
    };

    if (format === 'qcm-de-fr') {
      q.affiche = entree.de;
      q.invite = 'sens';
      q.lectureAvant = true;
      qcm(entree.fr, choisirLeurres(entree, pool, 3, rng).map((e) => e.fr));
    } else if (format === 'saisie-fr-de') {
      q.affiche = entree.fr;
      q.invite = 'allemand';
      q.reponse = entree.de;
      q.attendus = [entree.de];
      q.typoOk = true;
    } else if (format === 'saisie-de-fr') {
      q.affiche = entree.de;
      q.invite = 'sens';
      q.lectureAvant = true;
      q.attendus = [entree.fr].concat(entree.fr_acceptes || []);
      q.reponse = entree.fr;
    } else if (format === 'ecoute-fr') {
      q.affiche = null;
      q.masque = true;
      q.invite = 'ecoute';
      q.lectureAvant = true;
      q.attendus = [entree.fr].concat(entree.fr_acceptes || []);
      q.reponse = entree.fr;
    } else if (format === 'qcm-trou') {
      q.affiche = entree.phrase;
      q.traduction = entree.fr || null;
      q.invite = 'trou';
      qcm(entree.reponse, entree.choix.filter((x) => x !== entree.reponse));
    } else if (format === 'qcm-conj') {
      q.affiche = questionConj(entree, ctx && ctx.fiche, ctx && ctx.verbe);
      q.invite = 'conjuguer';
      qcm(entree.reponse, entree.leurres);
    } else if (format === 'saisie-conj') {
      q.affiche = questionConj(entree, ctx && ctx.fiche, ctx && ctx.verbe);
      q.invite = 'conjuguer';
      q.reponse = entree.reponse;
      q.attendus = [entree.reponse].concat(entree.acceptes || []); // autres formes justes (« geh » ou « gehe »)
    } else {
      throw new Error('Format inconnu : ' + format);
    }
    return q;
  }

  /** Corrige la réponse donnée à une question. `donnee` : choix cliqué ou texte saisi. */
  function corriger(q, donnee) {
    if (q.choix) return { resultat: donnee === q.reponse ? 'juste' : 'faux', exact: q.reponse };
    if (q.format === 'saisie-conj') {
      // Une forme admise est juste ; la correction affiche alors la forme saisie, sinon la forme principale.
      for (const a of q.attendus) {
        const r = verifierSaisieAllemand(donnee, a, { typoOk: false });
        if (r.resultat === 'juste') return r;
      }
      return { resultat: 'faux', exact: q.reponse };
    }
    if (q.format === 'saisie-fr-de') {
      return verifierSaisieAllemand(donnee, q.reponse, { nature: q.nature, typoOk: q.typoOk });
    }
    return verifierSaisieFrancais(donnee, q.attendus, { valeur: q.valeur });
  }

  const api = {
    MIN, JOUR_MS,
    rngGraine, numeroJour, debutJour, melanger,
    nouvelleCarte, etatAffiche, intervallesRevision, repondre, noteImposee,
    etatDuJour, allotissement, prochaineCarte, enregistrerReponse,
    cartesSprint, sprintDisponible, cartesDuJour,
    choisirFormat, normFr, replierAllemand, ecartUneLettre,
    verifierSaisieAllemand, verifierSaisieFrancais,
    choisirLeurres, texteLecture, segmentsAudio, questionConj, pluralInterrogeable, libellePluriel, construireQuestion, corriger,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Moteur = api;
})(typeof window !== 'undefined' ? window : globalThis);
