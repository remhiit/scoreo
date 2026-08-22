import { BONUS_SERIES } from './constantes'
import { totalDes, type LancerDes } from './lancerDes'
import type { ResultatScore } from './modeles'

interface EntreeSerie {
  readonly nom: string
  readonly compte: number
}

/**
 * Pure domain service: scores one turn under the full 1000 Sabords rules.
 * Reads and writes no global state.
 */
export function calculerScore(des: LancerDes, carte: string): ResultatScore {
  let totalCranes = des.cranes
  if (carte === 'skull1') totalCranes += 1
  if (carte === 'skull2') totalCranes += 2

  const diamantsScorants = des.diamants + (carte === 'diamond' ? 1 : 0)
  const orScorant = des.or + (carte === 'gold' ? 1 : 0)

  // Magie Pirate: 8 identical dice + the card's symbol = 9 symbols -> instant win.
  // Only reachable with the Diamant card (9 diamonds) or the Pièce d'Or card (9 coins).
  const estMagiePirate = diamantsScorants === 9 || orScorant === 9

  const estCombatNaval = carte === 'sea2' || carte === 'sea3' || carte === 'sea4'
  const sabresRequis = carte === 'sea2' ? 2 : carte === 'sea3' ? 3 : carte === 'sea4' ? 4 : 0
  const bonusCombat = carte === 'sea2' ? 300 : carte === 'sea3' ? 500 : carte === 'sea4' ? 1000 : 0

  // Bust (3+ cranes)
  if (totalCranes >= 3) {
    // A naval battle is settled before the Skull Island: it takes precedence
    // even at 4+ skulls, so the loss is the battle's, not the island's.
    if (estCombatNaval) {
      return {
        score: -bonusCombat,
        details: `💀 ${totalCranes} cranes — Défaite au combat! -${bonusCombat} pts`,
        bust: true,
        ileCranes: false,
        nombreCranes: 0,
        penaliteIle: 0,
        magiquePirate: false,
      }
    }
    if (totalCranes >= 4) {
      const penaliteParCrane = carte === 'captain' ? 200 : 100
      const penaliteBase = totalCranes * 100
      const penaliteFinale = totalCranes * penaliteParCrane
      let details = '☠️ Île de la Tête de Mort!\n'
      details += `${totalCranes} 💀 × 100 = -${penaliteBase}`
      if (carte === 'captain') {
        details += ' pts par adversaire'
        details += `\n👑 Capitaine: -${penaliteBase} × 2 = -${penaliteFinale} pts par adversaire`
      } else {
        details += ' pts par adversaire'
      }
      return {
        score: 0,
        details,
        bust: true,
        ileCranes: true,
        nombreCranes: totalCranes,
        penaliteIle: -penaliteFinale,
        magiquePirate: false,
      }
    }
    return {
      score: 0,
      details: `💀 ${totalCranes} cranes — Bust!`,
      bust: true,
      ileCranes: false,
      nombreCranes: 0,
      penaliteIle: 0,
      magiquePirate: false,
    }
  }

  let score = 0
  const ventilation: string[] = []

  // Diamonds and gold coins (100 pts each)
  if (diamantsScorants > 0) {
    score += diamantsScorants * 100
    ventilation.push(`${diamantsScorants}× 💎 = ${diamantsScorants * 100}`)
  }
  if (orScorant > 0) {
    score += orScorant * 100
    ventilation.push(`${orScorant}× 🪙 = ${orScorant * 100}`)
  }

  // Series
  const series: EntreeSerie[] = []
  if (carte === 'animals') {
    const animaux = des.singes + des.perroquets
    if (animaux > 0) series.push({ nom: '🐒🦜', compte: animaux })
  } else {
    if (des.singes > 0) series.push({ nom: '🐒', compte: des.singes })
    if (des.perroquets > 0) series.push({ nom: '🦜', compte: des.perroquets })
  }
  if (des.sabres > 0) series.push({ nom: '⚔️', compte: des.sabres })
  if (diamantsScorants > 0) series.push({ nom: '💎', compte: diamantsScorants })
  if (orScorant > 0) series.push({ nom: '🪙', compte: orScorant })

  for (const s of series) {
    const bonus = BONUS_SERIES.get(s.compte)
    if (s.compte >= 3 && bonus !== undefined) {
      score += bonus
      ventilation.push(`${s.compte}× ${s.nom} → +${bonus}`)
    }
  }

  // Full chest: all 8 dice contribute to the score.
  // Cranes (even 1 or 2) block it since they earn nothing, and so does any run
  // of 1 or 2 monkeys/parrots/sabers — under three, those dice score nothing.
  let toutScorant = des.cranes === 0
  if (carte === 'animals') {
    const animaux = des.singes + des.perroquets
    if (animaux >= 1 && animaux <= 2) toutScorant = false
  } else {
    if (des.singes >= 1 && des.singes <= 2) toutScorant = false
    if (des.perroquets >= 1 && des.perroquets <= 2) toutScorant = false
  }
  if (des.sabres >= 1 && des.sabres <= 2) toutScorant = false

  if (toutScorant && totalDes(des) === 8) {
    score += 500
    ventilation.push('🎁 Coffre plein! +500')
  }

  // Naval battle
  if (estCombatNaval) {
    if (des.sabres >= sabresRequis) {
      score += bonusCombat
      ventilation.push(`⚔️ Combat réussi! +${bonusCombat}`)
      return finaliser(score, ventilation, carte, estMagiePirate)
    }
    return {
      score: -bonusCombat,
      details: `⚔️ Combat échoué (${des.sabres}/${sabresRequis} sabres)\n-${bonusCombat} pts`,
      bust: false,
      ileCranes: false,
      nombreCranes: 0,
      penaliteIle: 0,
      magiquePirate: false,
    }
  }

  return finaliser(score, ventilation, carte, estMagiePirate)
}

function finaliser(
  score: number,
  ventilation: string[],
  carte: string,
  magiquePirate: boolean,
): ResultatScore {
  let s = score
  if (carte === 'captain') {
    const avant = s
    s *= 2
    ventilation.push(`👑 Capitaine: ${avant} × 2 = ${s}`)
  }
  if (magiquePirate) {
    ventilation.push('🪄 Magie Pirate — Victoire légendaire!')
  }
  return {
    score: s,
    details: ventilation.length === 0 ? 'Aucun point' : ventilation.join('\n'),
    bust: false,
    ileCranes: false,
    nombreCranes: 0,
    penaliteIle: 0,
    magiquePirate,
  }
}
