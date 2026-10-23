/* Progression : localStorage, version du format, migrations, export et import JSON. */
(function (root) {
  'use strict';

  const C = typeof require === 'function' ? require('./config.js') : root.Config;

  function progressionNeuve() {
    return {
      version: C.VERSION_STOCKAGE,
      cartes: {},
      points: 0,
      joursActifs: [],
      jour: null,
      sprintRecord: 0,
      reglages: copie(C.REGLAGES_DEFAUT),
    };
  }

  function copie(x) {
    return JSON.parse(JSON.stringify(x));
  }

  /**
   * Migrations : MIGRATIONS[n] transforme un objet de version n en version n + 1.
   * Vide pour l'instant (la version 1 est la première) ; à remplir quand le format changera.
   */
  const MIGRATIONS = {};

  function estProgression(p) {
    return !!p && typeof p === 'object' && typeof p.version === 'number' && p.cartes && typeof p.cartes === 'object' &&
      Array.isArray(p.joursActifs) && typeof p.points === 'number';
  }

  /** Remet une progression à la version courante et complète les champs manquants. Renvoie null si illisible. */
  function migrer(p) {
    if (!estProgression(p)) return null;
    let o = copie(p);
    if (o.version > C.VERSION_STOCKAGE) return null; // fichier d'une version plus récente de l'application
    while (o.version < C.VERSION_STOCKAGE) {
      const f = MIGRATIONS[o.version];
      if (!f) return null;
      o = f(o);
    }
    o.reglages = Object.assign(copie(C.REGLAGES_DEFAUT), o.reglages || {});
    o.reglages.repartition = Object.assign(copie(C.REGLAGES_DEFAUT.repartition), o.reglages.repartition || {});
    if (typeof o.sprintRecord !== 'number') o.sprintRecord = 0;
    if (!('jour' in o)) o.jour = null;
    return o;
  }

  /** Mémoire de repli quand localStorage est indisponible (navigation privée, par exemple). */
  function stockageMemoire() {
    const m = {};
    return {
      getItem: (k) => (k in m ? m[k] : null),
      setItem: (k, v) => { m[k] = String(v); },
      removeItem: (k) => { delete m[k]; },
    };
  }

  function stockageNavigateur() {
    try {
      const s = root.localStorage;
      const t = '__test__';
      s.setItem(t, t);
      s.removeItem(t);
      return s;
    } catch (e) {
      return stockageMemoire();
    }
  }

  function charger(stockage) {
    try {
      const brut = stockage.getItem(C.CLE_STOCKAGE);
      if (!brut) return progressionNeuve();
      return migrer(JSON.parse(brut)) || progressionNeuve();
    } catch (e) {
      return progressionNeuve();
    }
  }

  function sauver(stockage, prog) {
    try {
      stockage.setItem(C.CLE_STOCKAGE, JSON.stringify(prog));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Texte JSON de la sauvegarde. */
  function exporter(prog, maintenant) {
    return JSON.stringify(
      { application: 'app-allemand', langue: C.LANGUE, exporteLe: new Date(maintenant || Date.now()).toISOString(), progression: prog },
      null,
      2
    );
  }

  /** Lit une sauvegarde. Renvoie {ok: true, progression} ou {ok: false, erreur}. */
  function importer(texte) {
    let o;
    try {
      o = JSON.parse(texte);
    } catch (e) {
      return { ok: false, erreur: "Ce fichier n'est pas une sauvegarde lisible." };
    }
    if (!o || o.application !== 'app-allemand' || !o.progression) {
      return { ok: false, erreur: "Ce fichier n'est pas une sauvegarde de cette application." };
    }
    if (o.langue && o.langue !== C.LANGUE) {
      return { ok: false, erreur: 'Cette sauvegarde est pour une autre langue (' + o.langue + ').' };
    }
    const p = migrer(o.progression);
    if (!p) return { ok: false, erreur: 'Cette sauvegarde est illisible ou vient d’une version plus récente.' };
    return { ok: true, progression: p };
  }

  const api = { progressionNeuve, migrer, MIGRATIONS, stockageMemoire, stockageNavigateur, charger, sauver, exporter, importer };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Stockage = api;
})(typeof window !== 'undefined' ? window : globalThis);
