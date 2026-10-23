/* Conteneur des données de langue. Les fichiers data/<langue>/... y ajoutent leurs entrées.
   Doit être chargé avant eux. Le catalogue donne au moteur la liste ordonnée des cartes. */
(function (root) {
  'use strict';

  const D = root.DONNEES || (root.DONNEES = {});
  D.themes = D.themes || []; // {id, titre}
  D.vocabulaire = D.vocabulaire || []; // entrées de la section 1
  D.regles = D.regles || []; // fiches de grammaire (étape 3)
  D.grammaire = D.grammaire || []; // exercices : {id, regle, phrase, choix[4], reponse}
  D.verbes = D.verbes || []; // verbes de la conjugaison : {id, infinitif, fr, ...} (étape 4)
  D.fichesConj = D.fichesConj || []; // fiches : un verbe à un temps {id, verbe, temps, formes[], exemples[2], lecture}
  D.conjugaison = D.conjugaison || []; // cartes : {id, fiche, personne, question, reponse, acceptes, leurres[3], lecture}

  /** Catalogue ordonné : vocabulaire, puis grammaire, puis conjugaison (ordre des fichiers). */
  D.catalogue = function () {
    const cat = [];
    D.vocabulaire.forEach((e) => cat.push({ id: e.id, type: 'vocab', fiche: e.id, theme: e.theme }));
    D.grammaire.forEach((e) => cat.push({ id: e.id, type: 'gram', fiche: e.regle }));
    D.conjugaison.forEach((e) => cat.push({ id: e.id, type: 'conj', fiche: e.fiche }));
    return cat;
  };

  /** Entrée de données correspondant à une carte. */
  D.entree = function (carte) {
    const liste = carte.type === 'vocab' ? D.vocabulaire : carte.type === 'gram' ? D.grammaire : D.conjugaison;
    return liste.find((e) => e.id === carte.id) || null;
  };

  /** Fiche de grammaire (règle) d'après son id. */
  D.regle = function (id) {
    return D.regles.find((r) => r.id === id) || null;
  };

  /** Fiche de conjugaison (un verbe à un temps) et son verbe. */
  D.ficheConj = function (id) {
    return D.fichesConj.find((f) => f.id === id) || null;
  };
  D.verbe = function (id) {
    return D.verbes.find((v) => v.id === id) || null;
  };

  D.titreTheme = function (id) {
    const t = D.themes.find((x) => x.id === id);
    return t ? t.titre : id;
  };
})(typeof window !== 'undefined' ? window : globalThis);
