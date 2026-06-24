package com.scoreo.ui.player

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.AddPlayerUseCase
import com.scoreo.application.DeletePlayerUseCase
import com.scoreo.application.GetPlayerStatsUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.application.RenamePlayerUseCase
import com.scoreo.domain.DomainError

class PlayerHandler(
    private val addPlayer: AddPlayerUseCase,
    private val getPlayers: GetPlayersUseCase,
    private val getPlayerStats: GetPlayerStatsUseCase,
    private val deletePlayer: DeletePlayerUseCase,
    private val renamePlayerUseCase: RenamePlayerUseCase,
) {
    var state by mutableStateOf(
        PlayerState(players = getPlayers(), stats = getPlayerStats())
    )
        private set

    fun handle(intent: PlayerIntent) {
        when (intent) {
            is PlayerIntent.UpdateInput -> state = state.copy(inputName = intent.name, error = null)
            is PlayerIntent.AddPlayer -> {
                val name = state.inputName.trim()
                try {
                    addPlayer(name)
                    state = state.copy(
                        players = getPlayers(),
                        stats = getPlayerStats(),
                        inputName = "",
                        error = null,
                    )
                } catch (e: DomainError) {
                    state = state.copy(error = e.message)
                }
            }
            is PlayerIntent.ShowDeleteConfirm -> state = state.copy(deleteConfirmPlayerId = intent.id)
            is PlayerIntent.DismissDeleteConfirm -> state = state.copy(deleteConfirmPlayerId = null)
            is PlayerIntent.DeletePlayer -> {
                deletePlayer(intent.id, intent.anonymize)
                state = state.copy(
                    players = getPlayers(),
                    stats = getPlayerStats(),
                    deleteConfirmPlayerId = null,
                )
            }
            is PlayerIntent.StartRename -> {
                val player = state.players.find { it.id == intent.playerId }
                if (player != null) {
                    state = state.copy(
                        renamingPlayerId = intent.playerId,
                        renameInput = player.name
                    )
                }
            }
            is PlayerIntent.UpdateRenameInput -> {
                state = state.copy(renameInput = intent.name)
            }
            is PlayerIntent.ConfirmRename -> {
                val playerId = state.renamingPlayerId ?: return
                val newName = state.renameInput.trim()

                try {
                    renamePlayerUseCase(playerId, newName)
                    state = state.copy(
                        renamingPlayerId = null,
                        renameInput = "",
                        error = null,
                        players = getPlayers(),
                        stats = getPlayerStats()
                    )
                } catch (e: DomainError) {
                    state = state.copy(error = e.message)
                }
            }
            is PlayerIntent.CancelRename -> {
                state = state.copy(
                    renamingPlayerId = null,
                    renameInput = ""
                )
            }
        }
    }

    fun refresh() {
        state = state.copy(players = getPlayers(), stats = getPlayerStats())
    }
}
