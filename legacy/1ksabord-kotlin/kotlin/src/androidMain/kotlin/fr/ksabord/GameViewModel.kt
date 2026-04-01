package fr.ksabord

import fr.ksabord.domaine.*

/**
 * ViewModel Android pour le jeu 1000 Sabords.
 * Utilise l'agrégat Partie et le service CalculateurScore de commonMain via des StateFlow.
 *
 * Nécessite : androidx.lifecycle:lifecycle-viewmodel-ktx
 */
// import androidx.lifecycle.ViewModel
// import kotlinx.coroutines.flow.MutableStateFlow
// import kotlinx.coroutines.flow.StateFlow
// import kotlinx.coroutines.flow.asStateFlow

// class GameViewModel : ViewModel() {
//
//     data class EtatUI(
//         val joueurs: List<String> = emptyList(),
//         val historique: List<Tour> = emptyList(),
//         val indexJoueurActuel: Int = 0,
//         val commencée: Boolean = false,
//         val dernierTour: Boolean = false,
//         val numéroDernierTour: Int = -1,
//         val dés: LancerDés = LancerDés(),
//     )
//
//     private val _etatUI = MutableStateFlow(EtatUI())
//     val etatUI: StateFlow<EtatUI> = _etatUI.asStateFlow()
//
//     fun ajouterJoueur(nom: String) {
//         if (nom.isBlank() || partie.joueurs.size >= 8 || partie.joueurs.contains(nom)) return
//         partie.joueurs.add(nom)
//         _etatUI.value = instantané()
//     }
//
//     fun démarrerPartie() {
//         if (partie.joueurs.size < 2) return
//         partie.commencer()
//         _etatUI.value = instantané()
//     }
//
//     fun changerDé(type: String, delta: Int) {
//         val d = _etatUI.value.dés
//         val actuel = d.valeur(type)
//         val nouvel = actuel + delta
//         val total  = d.total + delta
//         if (nouvel < 0 || nouvel > 8 || total > 8 || total < 0) return
//         _etatUI.value = _etatUI.value.copy(dés = d.avecValeur(type, nouvel))
//     }
//
//     fun soumettreScoreCalcul(carte: String) {
//         val résultat = calculerScore(_etatUI.value.dés, carte)
//         enregistrerTour(Tour(
//             indexJoueur  = partie.indexJoueurActuel,
//             score        = résultat.score,
//             carte        = carte,
//             îleCrânes    = résultat.îleCrânes,
//             pénalitéÎle  = résultat.pénalitéÎle,
//             détails      = résultat.détails,
//         ))
//     }
//
//     fun soumettreScoreManuel(score: Int, avecDouble: Boolean = false) {
//         val scoreFinal = if (avecDouble) score * 2 else score
//         enregistrerTour(Tour(
//             indexJoueur  = partie.indexJoueurActuel,
//             score        = scoreFinal,
//             carte        = if (avecDouble) "captain" else "none",
//             îleCrânes    = false,
//             pénalitéÎle  = 0,
//             détails      = if (avecDouble) "Saisie manuelle ($score ×2 🎩)" else "Saisie manuelle",
//         ))
//     }
//
//     fun annulerDernier() {
//         if (partie.historique.isEmpty()) return
//         partie.annulerDernier()
//         _etatUI.value = instantané()
//     }
//
//     fun réinitialiserPartie() {
//         partie.réinitialiser()
//         _etatUI.value = EtatUI()
//     }
//
//     private fun enregistrerTour(tour: Tour) {
//         partie.ajouterTour(tour)
//         _etatUI.value = instantané()
//     }
//
//     private fun instantané() = EtatUI(
//         joueurs            = partie.joueurs.toList(),
//         historique         = partie.historique.toList(),
//         indexJoueurActuel  = partie.indexJoueurActuel,
//         commencée          = partie.commencée,
//         dernierTour        = partie.dernierTour,
//         numéroDernierTour  = partie.numéroDernierTour,
//         dés                = LancerDés(),
//     )
// }
