/* Voix allemande (SPEC.md section 9). Pour chaque morceau à écouter ({id, texte, lent}), dans l'ordre :
   1. le fichier enregistré d'avance audio/<id>.mp3, ou audio/<id>-lent.mp3 pour la version lente
      (un morceau sans version lente est joué ralenti) ;
   2. à défaut, la synthèse vocale de l'appareil en de-DE (dans l'APK, par @capacitor-community/text-to-speech) ;
   3. à défaut, un message clair « voix allemande non installée ».
   Certains navigateurs (Safari sur iPhone) refusent le son tant que l'utilisateur n'a pas touché l'écran :
   Voix.debloquer() est appelé au premier geste. Une lecture refusée s'arrête sans bruit.
   L'application ne plante jamais et ne bloque jamais une révision faute de voix : Voix.jouer ne lève
   jamais d'erreur et sa promesse est toujours tenue. */
(function (root) {
  'use strict';

  const C = typeof require === 'function' ? require('./config.js') : root.Config;
  const Voix = {
    actif: true, // le réglage « son » coupe aussi la voix
    fichiers: C.FICHIERS_AUDIO,
    dossier: 'audio/',
    surAbsence: null, // (manuel) : aucune voix ; appelé à chaque demande de l'utilisateur, une fois en lecture automatique
    surCoupe: null, // l'utilisateur demande à écouter alors que le son est coupé
    absenceSignalee: false,
    debloquee: false,
  };

  let lecteur = null; // un seul élément audio, réutilisé : Safari n'autorise ensuite que celui débloqué par un geste
  let jeton = 0; // chaque lecture a son numéro ; une lecture plus récente ou Voix.arreter() annule la précédente
  let finCourante = null;

  function synthese() {
    return root.speechSynthesis && root.SpeechSynthesisUtterance ? root.speechSynthesis : null;
  }

  // Dans l'APK (Capacitor), la voix de l'appareil passe par le plugin : la WebView d'Android n'a pas speechSynthesis.
  function ttsNatif() {
    const c = root.Capacitor;
    return c && typeof c.isNativePlatform === 'function' && c.isNativePlatform() && c.Plugins && c.Plugins.TextToSpeech
      ? c.Plugins.TextToSpeech : null;
  }

  function element() {
    if (!lecteur && typeof root.Audio === 'function') {
      try { lecteur = new root.Audio(); lecteur.preload = 'auto'; } catch (e) { lecteur = null; }
    }
    return lecteur;
  }

  function absente(manuel) {
    if (!manuel && Voix.absenceSignalee) return;
    Voix.absenceSignalee = true;
    if (typeof Voix.surAbsence === 'function') Voix.surAbsence(!!manuel);
  }

  /** Voix allemande installée ? true, false, ou null si la liste n'est pas encore chargée. */
  Voix.disponible = function () {
    const s = synthese();
    if (!s) return false;
    const voix = s.getVoices();
    if (!voix.length) return null;
    return voix.some((v) => /^de(-|_|$)/i.test(v.lang));
  };

  /** Nom du fichier d'un morceau : audio/<id>.mp3 ou audio/<id>-lent.mp3. */
  Voix.fichier = function (seg, lent) {
    return Voix.dossier + seg.id + (lent && seg.lent !== false ? '-lent' : '') + '.mp3';
  };

  /** Joue un fichier. Résultat : 'fini', 'erreur' (absent ou illisible), 'bloque' (son refusé), 'arrete'. */
  function jouerFichier(src, vitesse) {
    return new Promise((ok) => {
      const a = element();
      if (!a) return ok('erreur');
      let fini = false;
      const fin = (r) => {
        if (fini) return;
        fini = true;
        a.onended = a.onerror = null;
        finCourante = null;
        ok(r);
      };
      finCourante = () => fin('arrete');
      a.onended = () => fin('fini');
      a.onerror = () => fin('erreur');
      try {
        a.src = src;
        a.defaultPlaybackRate = vitesse;
        a.playbackRate = vitesse;
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch((e) => fin(e && e.name === 'NotAllowedError' ? 'bloque' : 'erreur'));
      } catch (e) {
        fin('erreur');
      }
    });
  }

  /** Voix de l'appareil dans l'APK. Mêmes résultats que parler(). */
  function parlerNatif(tts, texte, lent) {
    return new Promise((ok) => {
      let fini = false;
      const fin = (r) => {
        if (fini) return;
        fini = true;
        finCourante = null;
        ok(r);
      };
      finCourante = () => fin('arrete');
      Promise.resolve(tts.isLanguageSupported({ lang: C.LANGUE_VOIX })).then((r) => {
        if (fini) return;
        if (!r || !r.supported) return fin('absente');
        return Promise.resolve(tts.speak({ text: texte, lang: C.LANGUE_VOIX, rate: lent ? C.VITESSE_LENTE : 1, category: 'playback' }))
          .then(() => fin('fini'));
      }).catch(() => fin('absente'));
    });
  }

  /** Lit un texte avec la voix de l'appareil. Résultat : 'fini', 'absente', 'arrete'. */
  function parler(texte, lent) {
    const tts = ttsNatif();
    if (tts) return parlerNatif(tts, texte, lent);
    return new Promise((ok) => {
      const s = synthese();
      if (!s || Voix.disponible() === false) return ok('absente');
      let fini = false;
      let garde = null;
      const fin = (r) => {
        if (fini) return;
        fini = true;
        clearTimeout(garde);
        finCourante = null;
        ok(r);
      };
      finCourante = () => fin('arrete');
      try {
        s.cancel();
        const u = new root.SpeechSynthesisUtterance(texte);
        u.lang = C.LANGUE_VOIX;
        u.rate = lent ? C.VITESSE_LENTE : 1;
        const voix = s.getVoices().filter((v) => /^de(-|_|$)/i.test(v.lang));
        const choisie = voix.find((v) => /^de[-_]DE$/i.test(v.lang)) || voix[0];
        if (choisie) u.voice = choisie;
        u.onend = () => fin('fini');
        u.onerror = (e) => {
          const manque = e && (e.error === 'language-unavailable' || e.error === 'voice-unavailable' || e.error === 'synthesis-unavailable');
          fin(manque ? 'absente' : 'fini');
        };
        // certains navigateurs n'envoient jamais « fin » : on n'attend pas plus que la durée probable
        garde = setTimeout(() => fin('fini'), 3000 + texte.length * (lent ? 160 : 110));
        s.speak(u);
      } catch (e) {
        fin('absente');
      }
    });
  }

  Voix.arreter = function () {
    jeton++;
    if (finCourante) finCourante();
    if (lecteur) {
      try { lecteur.pause(); } catch (e) { /* sans effet */ }
    }
    const s = synthese();
    if (s) {
      try { s.cancel(); } catch (e) { /* sans effet */ }
    }
    const tts = ttsNatif();
    if (tts) {
      try { Promise.resolve(tts.stop()).catch(() => {}); } catch (e) { /* sans effet */ }
    }
  };

  /**
   * Joue les morceaux l'un après l'autre. opts.lent : version lente ; opts.manuel : demandé par
   * l'utilisateur (bouton, touche V), et non par la lecture automatique. Ne lève jamais d'erreur.
   */
  Voix.jouer = async function (segments, opts) {
    const lent = !!(opts && opts.lent);
    const manuel = !!(opts && opts.manuel);
    if (!Voix.actif) {
      if (manuel && typeof Voix.surCoupe === 'function') Voix.surCoupe();
      return;
    }
    if (!segments || !segments.length) return;
    Voix.arreter();
    const j = jeton;
    try {
      for (const seg of segments) {
        if (j !== jeton) return;
        let r = 'erreur';
        if (Voix.fichiers && !(opts && opts.sansFichier)) {
          const ralenti = lent && seg.lent === false;
          r = await jouerFichier(Voix.fichier(seg, lent), ralenti ? C.VITESSE_LENTE_FICHIER : 1);
          // version lente absente (hors connexion, pas encore gardée) : la version normale, ralentie
          if (r === 'erreur' && lent && !ralenti && j === jeton) r = await jouerFichier(Voix.fichier(seg, false), C.VITESSE_LENTE_FICHIER);
        }
        if (r === 'arrete' || j !== jeton) return;
        if (r === 'bloque') return; // le navigateur attend un geste : on n'insiste pas
        if (r === 'erreur') {
          const t = await parler(seg.texte, lent);
          if (t === 'arrete' || j !== jeton) return;
          if (t === 'absente') return absente(manuel);
        }
      }
    } catch (e) {
      absente(manuel);
    }
  };

  /** Lecture d'un texte seul, par la voix de l'appareil (sans fichier). Conservée pour les essais. */
  Voix.lire = function (texte, opts) {
    return Voix.jouer([{ id: '', texte: texte, lent: true }], Object.assign({}, opts, { sansFichier: true }));
  };

  // Un son WAV muet de 50 ms, joué au premier geste pour débloquer l'élément audio (Safari sur iPhone).
  function wavMuet() {
    const n = 400, octets = 44 + n;
    const b = new Uint8Array(octets);
    const ecrire = (pos, txt) => { for (let i = 0; i < txt.length; i++) b[pos + i] = txt.charCodeAt(i); };
    const u32 = (pos, v) => { b[pos] = v & 255; b[pos + 1] = (v >> 8) & 255; b[pos + 2] = (v >> 16) & 255; b[pos + 3] = (v >> 24) & 255; };
    const u16 = (pos, v) => { b[pos] = v & 255; b[pos + 1] = (v >> 8) & 255; };
    ecrire(0, 'RIFF'); u32(4, octets - 8); ecrire(8, 'WAVEfmt '); u32(16, 16); u16(20, 1); u16(22, 1);
    u32(24, 8000); u32(28, 8000); u16(32, 1); u16(34, 8); ecrire(36, 'data'); u32(40, n);
    b.fill(128, 44);
    let s = '';
    b.forEach((x) => { s += String.fromCharCode(x); });
    return 'data:audio/wav;base64,' + root.btoa(s);
  }

  /** À appeler lors d'un geste de l'utilisateur : le navigateur autorise ensuite la lecture automatique. */
  Voix.debloquer = function () {
    if (Voix.debloquee) return;
    Voix.debloquee = true;
    try {
      const a = element();
      if (a && Voix.fichiers && !finCourante && root.btoa) {
        a.src = wavMuet();
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => { Voix.debloquee = false; });
      }
    } catch (e) { Voix.debloquee = false; }
    try {
      const s = synthese();
      if (s && !s.speaking) {
        const u = new root.SpeechSynthesisUtterance(' ');
        u.volume = 0;
        s.speak(u);
      }
    } catch (e) { /* sans effet */ }
  };

  root.Voix = Voix;
})(typeof window !== 'undefined' ? window : globalThis);
