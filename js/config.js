/* Constantes du projet (SPEC.md). Aucune valeur de réglage n'est écrite ailleurs. */
(function (root) {
  'use strict';

  const Config = {
    LANGUE: 'de', // paquet de langue : data/de/... (section 11)
    VERSION_STOCKAGE: 1, // numéro de version du format de progression
    CLE_STOCKAGE: 'allemand.progression',

    // Journée et étapes (section 5)
    HEURE_DEBUT_JOUR: 4,
    ETAPES_APPRENTISSAGE_MIN: [1, 10],
    ETAPE_REAPPRENTISSAGE_MIN: 10,
    ANTICIPATION_MIN: 20, // une carte en apprentissage peut venir un peu avant l'heure s'il n'y a rien d'autre
    FACTEUR_DEPART: 2.5,
    FACTEUR_MIN: 1.3,
    DELTA_FACTEUR: { encore: -0.2, difficile: -0.15, correct: 0, facile: 0.15 },
    INTERVALLE_SORTIE_JOURS: 1,
    INTERVALLE_SORTIE_FACILE_JOURS: 4,
    COEF_DIFFICILE: 1.2,
    COEF_FACILE: 1.3,
    VARIATION: 0.05,
    SEUIL_VARIATION_JOURS: 2,
    SEUIL_MURE_JOURS: 21,
    ECHECS_PROBLEMATIQUE: 8,

    // Plafonds par jour
    PLAFOND_NEUVES: 20,
    PLAFOND_REVISIONS: 200,
    REPARTITION_NEUVES: { vocab: 12, gram: 4, conj: 4 },

    // Récompenses (section 7)
    POINTS_BONNE_REPONSE: 10,
    PALIERS_COMBO: [
      { min: 20, mult: 3 },
      { min: 10, mult: 2.5 },
      { min: 5, mult: 2 },
      { min: 3, mult: 1.5 },
    ],
    POINTS_PAR_NIVEAU: 500,
    OBJECTIF_JOUR: 20,
    TOLERANCE_SERIE_PAR_SEMAINE: 2,
    JOURS_CALENDRIER: 30,
    PALIERS_COLLECTION_JOURS: [1, 7, 21], // gris < apprentissage < 1 j < 7 j < 21 j (doré)

    // Sprint (section 8)
    SPRINT_DUREE_S: 60,
    SPRINT_MIN_CARTES: 10,

    // Saisie en allemand (section 6)
    TYPO_LONGUEUR_MIN: 5,
    TYPO_LETTRES_FINALES_PROTEGEES: 2,

    // Voix (section 9)
    VITESSE_LENTE: 0.7,
    LANGUE_VOIX: 'de-DE',
    VITESSE_LENTE_FICHIER: 0.8, // fichier sans version lente (exercice, carte) joué ralenti
    FICHIERS_AUDIO: true, // audio/<id>.mp3 d'abord, voix de l'appareil en secours

    // Réglages par défaut (section 10)
    REGLAGES_DEFAUT: {
      themesActifs: null, // null = tous
      objectifJour: 20,
      repartition: { vocab: 12, gram: 4, conj: 4 },
      son: true,
      vibrations: true,
      reduireAnimations: false,
      lectureAuto: true,
      formatEcoute: false,
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Config;
  else root.Config = Config;
})(typeof window !== 'undefined' ? window : globalThis);
