/* Effets sonores courts, générés avec l'API Web Audio (aucun fichier) : note qui monte (juste),
   son mat et discret (faux), petit arpège (niveau). Coupés par le réglage « son ». */
(function (root) {
  'use strict';

  let ctx = null;
  const Sons = { actif: true };

  function contexte() {
    if (!Sons.actif) return null;
    try {
      if (!ctx) {
        const A = root.AudioContext || root.webkitAudioContext;
        if (!A) return null;
        ctx = new A();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function note(c, freq, debut, duree, type, volume) {
    const o = c.createOscillator();
    const g = c.createGain();
    const t0 = c.currentTime + debut;
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + duree + 0.02);
  }

  Sons.juste = function () {
    const c = contexte();
    if (!c) return;
    note(c, 523.25, 0, 0.12, 'sine', 0.18); // do
    note(c, 783.99, 0.09, 0.2, 'sine', 0.18); // sol
  };

  Sons.faux = function () {
    const c = contexte();
    if (!c) return;
    note(c, 146.83, 0, 0.2, 'triangle', 0.14); // ré grave, mat
  };

  Sons.niveau = function () {
    const c = contexte();
    if (!c) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(c, f, i * 0.13, 0.28, 'sine', 0.16));
  };

  /** À appeler lors d'un geste de l'utilisateur, pour que le navigateur autorise le son. */
  Sons.debloquer = function () {
    contexte();
  };

  root.Sons = Sons;
})(typeof window !== 'undefined' ? window : globalThis);
