package fr.ksabord.ui

/**
 * Écran de jeu Compose — scoreboard + calculateur.
 */

// import androidx.compose.foundation.layout.*
// import androidx.compose.material3.*
// import androidx.compose.runtime.*
// import androidx.compose.ui.Modifier
// import androidx.compose.ui.unit.dp
// import fr.ksabord.GameViewModel
// import fr.ksabord.getPlayerTotal

// @Composable
// fun GameScreen(viewModel: GameViewModel) {
//     val state by viewModel.uiState.collectAsState()
//
//     Column(modifier = Modifier.padding(16.dp)) {
//         // Scoreboard
//         Text("Manche ${state.history.size / state.players.size + 1}",
//              style = MaterialTheme.typography.titleMedium)
//
//         state.players.forEachIndexed { i, name ->
//             val score = getPlayerTotal(i)
//             val active = i == state.currentPlayerIndex
//             Row {
//                 Text(
//                     text = "${if (active) "▶ " else ""}$name",
//                     modifier = Modifier.weight(1f),
//                     color = if (active) MaterialTheme.colorScheme.primary
//                             else        MaterialTheme.colorScheme.onSurface,
//                 )
//                 Text("$score pts")
//             }
//         }
//
//         Spacer(Modifier.height(16.dp))
//
//         // Calculateur de dés (simplifié)
//         DICE_TYPES.forEach { dt ->
//             val value = when (dt.id) {
//                 "skulls"   -> state.dSkulls
//                 "diamonds" -> state.dDiamonds
//                 "gold"     -> state.dGold
//                 "monkeys"  -> state.dMonkeys
//                 "parrots"  -> state.dParrots
//                 "sabers"   -> state.dSabers
//                 else       -> 0
//             }
//             Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
//                 Text("${dt.icon} ${dt.label}", modifier = Modifier.weight(1f))
//                 IconButton(onClick = { viewModel.changeDice(dt.id, -1) }) { Text("−") }
//                 Text("$value")
//                 IconButton(onClick = { viewModel.changeDice(dt.id, +1) }) { Text("+") }
//             }
//         }
//
//         Spacer(Modifier.height(8.dp))
//
//         Button(
//             onClick  = { viewModel.submitCalcScore("none") },
//             enabled  = state.dSkulls + state.dDiamonds + state.dGold +
//                        state.dMonkeys + state.dParrots + state.dSabers == 8,
//             modifier = Modifier.fillMaxWidth(),
//         ) {
//             Text("Valider le score")
//         }
//
//         OutlinedButton(
//             onClick  = { viewModel.undoLast() },
//             modifier = Modifier.fillMaxWidth(),
//         ) {
//             Text("↩ Annuler le dernier tour")
//         }
//     }
// }
