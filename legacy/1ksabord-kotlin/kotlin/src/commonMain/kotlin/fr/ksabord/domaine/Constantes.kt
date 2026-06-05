package fr.ksabord.domaine

val COULEURS_JOUEURS = arrayOf(
    "#e6a817", "#e74c3c", "#2ecc71", "#3498db",
    "#9b59b6", "#e67e22", "#1abc9c", "#fd79a8"
)

val EMOJIS_RANG = arrayOf("🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣")

val BONUS_SERIES = mapOf(3 to 100, 4 to 200, 5 to 500, 6 to 1000, 7 to 2000, 8 to 4000, 9 to 4000)

data class TypeDe(val id: String, val icone: String, val label: String)

val TYPES_DES = arrayOf(
    TypeDe("skulls",   "💀", "Crâne"),
    TypeDe("diamonds", "💎", "Diamant"),
    TypeDe("gold",     "🪙", "Or"),
    TypeDe("monkeys",  "🐒", "Singe"),
    TypeDe("parrots",  "🦜", "Perroquet"),
    TypeDe("sabers",   "⚔️", "Sabre"),
)

data class DefCarte(val id: String, val label: String)

val CARTES = arrayOf(
    DefCarte("none",    "— Aucune carte —"),
    DefCarte("captain", "👑 Capitaine (score ×2)"),
    DefCarte("diamond", "💎 Diamant (+1 diamant)"),
    DefCarte("gold",    "🪙 Pièce d'or (+1 pièce)"),
    DefCarte("animals", "🐒🦜 Animaux (singes = perroquets)"),
    DefCarte("witch",   "🧙 Sorcière (relancer 1 crâne)"),
    DefCarte("sea2",    "⚔️⚔️ Combat (2 sabres)"),
    DefCarte("sea3",    "⚔️⚔️⚔️ Combat (3 sabres)"),
    DefCarte("sea4",    "⚔️⚔️⚔️⚔️ Combat (4 sabres)"),
    DefCarte("skull1",  "💀 Tête de mort (×1)"),
    DefCarte("skull2",  "💀💀 Tête de mort (×2)"),
)
