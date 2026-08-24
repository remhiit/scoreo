import { contributionPour, type EvenementCoup } from './modeles'

/**
 * Aggregate root of the game.
 * Holds a game's whole state: players, move history, current turn and last-round flag.
 */
export class Partie {
  readonly joueurs: string[] = []
  readonly historique: EvenementCoup[] = []
  indexJoueurActuel = 0
  dernierTour = false
  numeroDernierTour = -1
  commencee = false
  magiquePirate = false

  // ==================== Queries ====================

  /**
   * The zero clamp applies at every step of the fold, not to the final sum:
   * a player driven below zero restarts from 0 and never repays that debt.
   */
  private totalJoueurParNom(nom: string): number {
    return this.historique.reduce((acc, ev) => Math.max(0, acc + contributionPour(ev, nom)), 0)
  }

  totalJoueur(index: number): number {
    return this.totalJoueurParNom(this.joueurs[index])
  }

  mancheActuelle(): number {
    if (this.joueurs.length === 0) return 0
    return Math.floor(this.historique.length / this.joueurs.length)
  }

  totalMax(): number {
    if (this.joueurs.length === 0) return 0
    return this.joueurs.reduce((max, _, i) => Math.max(max, this.totalJoueur(i)), 0)
  }

  manches(): EvenementCoup[][] {
    const resultat: EvenementCoup[][] = []
    const n = this.joueurs.length
    let i = 0
    while (i < this.historique.length) {
      resultat.push(this.historique.slice(i, Math.min(i + n, this.historique.length)))
      i += n
    }
    return resultat
  }

  // ==================== Commands ====================

  commencer(): void {
    this.commencee = true
    this.indexJoueurActuel = 0
    this.historique.length = 0
    this.dernierTour = false
    this.numeroDernierTour = -1
    this.magiquePirate = false
  }

  ajouterCoup(coup: EvenementCoup): void {
    this.historique.push(coup)
    if (!this.dernierTour) {
      for (const nom of this.joueurs) {
        if (this.totalJoueurParNom(nom) >= 6000) {
          this.dernierTour = true
          this.numeroDernierTour = this.mancheActuelle()
          break
        }
      }
    }
    this.indexJoueurActuel = (this.indexJoueurActuel + 1) % this.joueurs.length
  }

  annulerDernier(): void {
    if (this.historique.length === 0) return
    this.historique.pop()
    this.indexJoueurActuel =
      this.indexJoueurActuel === 0 ? this.joueurs.length - 1 : this.indexJoueurActuel - 1
    this.dernierTour = false
    this.numeroDernierTour = -1
    this.magiquePirate = false
    // Replays the history to find the first move that crossed 6000, re-clamping
    // at zero on every step exactly as totalJoueurParNom does.
    for (let h = 0; h < this.historique.length; h++) {
      if (!this.dernierTour) {
        const depasseSeuil = this.joueurs.some((nom) => {
          let t = 0
          for (let j = 0; j <= h; j++) {
            t = Math.max(0, t + contributionPour(this.historique[j], nom))
          }
          return t >= 6000
        })
        if (depasseSeuil) {
          this.dernierTour = true
          this.numeroDernierTour = Math.floor((h + 1) / this.joueurs.length)
        }
      }
    }
  }

  /** Triggers an immediate Magie Pirate win, without waiting for the round to end. */
  terminerParMagiePirate(): void {
    this.magiquePirate = true
  }

  /** True once every round of the last turn has been played, or on Magie Pirate. */
  estTerminee(): boolean {
    if (this.magiquePirate) return true
    if (!this.dernierTour || this.joueurs.length === 0) return false
    return (
      this.mancheActuelle() > this.numeroDernierTour &&
      this.historique.length % this.joueurs.length === 0
    )
  }
}
