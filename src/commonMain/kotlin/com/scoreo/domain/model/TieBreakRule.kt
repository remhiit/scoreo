package com.scoreo.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class TieBreakRule {
    NONE,              // L'égalité est conservée
    MANUAL_SELECTION,  // L'utilisateur choisit manuellement le vainqueur
    SECONDARY_SCORE;   // On utilise un score additionnel pour départager

    fun label() = when (this) {
        NONE -> "Aucun"
        MANUAL_SELECTION -> "Sélection manuelle"
        SECONDARY_SCORE -> "Score secondaire"
    }
}
