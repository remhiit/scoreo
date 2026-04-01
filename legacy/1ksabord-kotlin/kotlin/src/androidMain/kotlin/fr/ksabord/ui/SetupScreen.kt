package fr.ksabord.ui

/**
 * Écran de configuration Compose — ajout des joueurs.
 */

// import androidx.compose.foundation.layout.*
// import androidx.compose.material3.*
// import androidx.compose.runtime.*
// import androidx.compose.ui.Alignment
// import androidx.compose.ui.Modifier
// import androidx.compose.ui.unit.dp
// import fr.ksabord.GameViewModel

// @Composable
// fun SetupScreen(viewModel: GameViewModel) {
//     val state by viewModel.uiState.collectAsState()
//     var nameInput by remember { mutableStateOf("") }
//
//     Column(modifier = Modifier.padding(16.dp)) {
//         Text("⚓ 1000 Sabords", style = MaterialTheme.typography.headlineMedium)
//         Spacer(Modifier.height(16.dp))
//
//         // Liste des joueurs ajoutés
//         state.players.forEachIndexed { index, name ->
//             Row(verticalAlignment = Alignment.CenterVertically) {
//                 Text(name, modifier = Modifier.weight(1f))
//                 IconButton(onClick = { viewModel.removePlayer(index) }) {
//                     Text("✕")
//                 }
//             }
//         }
//
//         Spacer(Modifier.height(8.dp))
//
//         // Ajout d'un joueur
//         if (state.players.size < 8) {
//             OutlinedTextField(
//                 value    = nameInput,
//                 onValueChange = { nameInput = it },
//                 label    = { Text("Nom du joueur") },
//                 modifier = Modifier.fillMaxWidth(),
//             )
//             Button(
//                 onClick  = { viewModel.addPlayer(nameInput); nameInput = "" },
//                 modifier = Modifier.fillMaxWidth(),
//             ) {
//                 Text("Ajouter")
//             }
//         }
//
//         Spacer(Modifier.height(16.dp))
//
//         Button(
//             onClick  = { viewModel.startGame() },
//             enabled  = state.players.size >= 2,
//             modifier = Modifier.fillMaxWidth(),
//         ) {
//             Text("Commencer la partie (${state.players.size}/8)")
//         }
//     }
// }
