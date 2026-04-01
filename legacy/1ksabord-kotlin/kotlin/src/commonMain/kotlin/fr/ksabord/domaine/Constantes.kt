package fr.ksabord.domaine

val COULEURS_JOUEURS = arrayOf(
    "#e6a817", "#e74c3c", "#2ecc71", "#3498db",
    "#9b59b6", "#e67e22", "#1abc9c", "#fd79a8"
)

val EMOJIS_RANG = arrayOf("🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣")

val BONUS_SÉRIES = mapOf(3 to 100, 4 to 200, 5 to 500, 6 to 1000, 7 to 2000, 8 to 4000, 9 to 4000)

data class TypeDé(val id: String, val icône: String, val label: String)

val TYPES_DÉS = arrayOf(
    TypeDé("skulls",   "💀", "Crâne"),
    TypeDé("diamonds", "💎", "Diamant"),
    TypeDé("gold",     "🪙", "Or"),
    TypeDé("monkeys",  "🐒", "Singe"),
    TypeDé("parrots",  "🦜", "Perroquet"),
    TypeDé("sabers",   "⚔️", "Sabre"),
)

data class DéfCarte(val id: String, val label: String)

val CARTES = arrayOf(
    DéfCarte("none",    "— Aucune carte —"),
    DéfCarte("captain", "👑 Capitaine (score ×2)"),
    DéfCarte("diamond", "💎 Diamant (+1 diamant)"),
    DéfCarte("gold",    "🪙 Pièce d'or (+1 pièce)"),
    DéfCarte("animals", "🐒🦜 Animaux (singes = perroquets)"),
    DéfCarte("witch",   "🧙 Sorcière (relancer 1 crâne)"),
    DéfCarte("sea2",    "⚔️⚔️ Combat (2 sabres)"),
    DéfCarte("sea3",    "⚔️⚔️⚔️ Combat (3 sabres)"),
    DéfCarte("sea4",    "⚔️⚔️⚔️⚔️ Combat (4 sabres)"),
    DéfCarte("skull1",  "💀 Tête de mort (×1)"),
    DéfCarte("skull2",  "💀💀 Tête de mort (×2)"),
)
