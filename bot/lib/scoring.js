"use strict";
/* Scoring d'une idee produit sur 100.
   Criteres (1-10) : demande, concurrence, marge, viral, facilite, risque, automatisation.
   Poids : demande et automatisation pesees plus lourd (objectif : business autonome). */

const W = {
  demande: 0.2,
  concurrence: 0.15,
  marge: 0.15,
  viral: 0.1,
  facilite: 0.15,
  risque: 0.1,
  automatisation: 0.15
};

function scoreIdea(idea) {
  idea = idea && typeof idea === "object" ? idea : {};
  let t = 0;
  for (const k in W) {
    const raw = Math.max(0, Math.min(10, Number(idea[k]) || 0));
    t += raw * W[k];
  }
  idea.score = Math.round(t * 10);
  return idea;
}

/* Retourne les idees >= seuil, triees de la meilleure a la moins bonne. */
function best(ideas, seuil) {
  const list = Array.isArray(ideas) ? ideas : [];
  const minimum = Number.isFinite(Number(seuil)) ? Number(seuil) : 0;
  return list.filter(i => i && typeof i === "object").map(scoreIdea).filter(i => i.score >= minimum)
    .sort((a, b) => b.score - a.score);
}

module.exports = { scoreIdea, best };
