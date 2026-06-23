package com.scoreo.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class TieBreakRule {
    NONE,              // L'égalité est conservée
    MANUAL_SELECTION,  // L'utilisateur choisit manuellement le vainqueur
    SECONDARY_SCORE;   // On utilise un score additionnel pour départager

    fun label() = when (this) {
        NONE -> "No tie-break"
        MANUAL_SELECTION -> "Manual selection"
        SECONDARY_SCORE -> "Secondary score"
    }
}
