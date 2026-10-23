/* Points, combo, niveaux, série, paliers de la collection (section 7). Fonctions pures. */
(function (root) {
  'use strict';

  const C = typeof require === 'function' ? require('./config.js') : root.Config;

  function multiplicateur(combo) {
    for (const p of C.PALIERS_COMBO) if (combo >= p.min) return p.mult;
    return 1;
  }

  function niveau(points) {
    return Math.floor(points / C.POINTS_PAR_NIVEAU) + 1;
  }

  /** État de session neuf. */
  function sessionNeuve(pointsTotaux) {
    return { combo: 0, meilleurCombo: 0, points: 0, pointsTotaux: pointsTotaux || 0 };
  }

  /**
   * Applique une réponse à l'état de session. Renvoie le nouvel état et ce qu'il faut déclencher.
   * Bonne réponse : 10 × multiplicateur du combo atteint. Erreur : combo à zéro.
   */
  function appliquerReponse(etat, juste) {
    const e = Object.assign({}, etat);
    const comboAvant = etat.combo;
    const niveauAvant = niveau(etat.pointsTotaux);
    let gain = 0;
    if (juste) {
      e.combo = comboAvant + 1;
      gain = Math.round(C.POINTS_BONNE_REPONSE * multiplicateur(e.combo));
      e.points += gain;
      e.pointsTotaux += gain;
      e.meilleurCombo = Math.max(e.meilleurCombo, e.combo);
    } else {
      e.combo = 0;
    }
    return {
      etat: e,
      gain,
      niveauMonte: niveau(e.pointsTotaux) > niveauAvant,
      niveau: niveau(e.pointsTotaux),
      effets: effetsCombo(comboAvant, e.combo),
    };
  }

  /** Effets visuels selon le combo : contour dès 3, particules dès 5, tremblement et vibration à 10, fond qui pulse dès 20. */
  function effetsCombo(comboAvant, combo) {
    return {
      contour: combo >= 3,
      particules: combo >= 5,
      tremblement: combo === 10 && comboAvant < 10,
      pulsation: combo >= 20,
    };
  }

  // ---------- Série ----------

  const jourSemaine = (n) => (n + 3) % 7; // 0 = lundi (le jour 0 est un jeudi)
  const numeroSemaine = (n) => Math.floor((n + 3) / 7);

  /**
   * Série en cours et calendrier des 30 derniers jours.
   * Un jour compte dès qu'une carte est révisée. Deux jours manqués par semaine (lundi à dimanche) sont tolérés,
   * non reportables. Le jour courant n'est jamais compté comme manqué tant qu'il n'est pas fini.
   * Statuts du calendrier : 'actif', 'tolere', 'manque', 'libre' (aujourd'hui, pas encore joué).
   */
  function serie(joursActifs, aujourdhui) {
    const actifs = new Set(joursActifs);
    const premier = joursActifs.length ? Math.min.apply(null, joursActifs) : Infinity;
    const tolereParSemaine = new Map();
    const tolere = new Set();
    let longueur = 0;
    let debutChaine = Infinity; // plus ancien jour actif de la série
    let d = actifs.has(aujourdhui) ? aujourdhui : aujourdhui - 1;
    for (; d >= premier; d--) {
      if (actifs.has(d)) {
        longueur += 1;
        debutChaine = d;
      } else {
        const w = numeroSemaine(d);
        const utilises = tolereParSemaine.get(w) || 0;
        if (utilises >= C.TOLERANCE_SERIE_PAR_SEMAINE) break;
        tolereParSemaine.set(w, utilises + 1);
        tolere.add(d);
      }
    }
    // Un jour toléré plus ancien que le premier jour actif de la série n'en fait pas partie.
    const jours = [];
    for (let k = C.JOURS_CALENDRIER - 1; k >= 0; k--) {
      const n = aujourdhui - k;
      let statut;
      if (actifs.has(n)) statut = 'actif';
      else if (n === aujourdhui) statut = 'libre';
      else if (tolere.has(n) && n > debutChaine) statut = 'tolere';
      else statut = 'manque';
      jours.push({ jour: n, statut });
    }
    return { longueur, jours };
  }

  // ---------- Collection ----------

  /**
   * Palier d'une carte : 0 grise (neuve), 1 en apprentissage, 2 intervalle ≥ 1 jour, 3 ≥ 7 jours, 4 dorée (≥ 21 jours).
   */
  function palierCarte(carte) {
    if (!carte || carte.etat === 'neuve') return 0;
    if (carte.etat === 'apprentissage' || carte.etat === 'reapprentissage') return 1;
    const [un, sept, vingtEtUn] = C.PALIERS_COLLECTION_JOURS;
    if (carte.intervalle >= vingtEtUn) return 4;
    if (carte.intervalle >= sept) return 3;
    if (carte.intervalle >= un) return 2;
    return 1;
  }

  /** Palier d'une fiche : celui de sa carte la moins avancée (une carte jamais vue compte pour 0). */
  function palierFiche(idsCartes, cartes) {
    if (!idsCartes.length) return 0;
    return Math.min.apply(null, idsCartes.map((id) => palierCarte(cartes[id])));
  }

  const api = { multiplicateur, niveau, sessionNeuve, appliquerReponse, effetsCombo, serie, palierCarte, palierFiche, numeroSemaine, jourSemaine };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Recompenses = api;
})(typeof window !== 'undefined' ? window : globalThis);
