package com.scoreo.di

import com.scoreo.infrastructure.InMemoryCloudSyncRepository
import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class SyncDependenciesTest {

    private val playerRepo = InMemoryPlayerRepository()
    private val gameTypeRepo = InMemoryGameTypeRepository()
    private val matchRepo = InMemoryMatchRepository()

    @Test
    fun `syncHandler is null when no cloud repository`() {
        val handler = createSyncHandlerIfAvailable(null, playerRepo, gameTypeRepo, matchRepo)
        assertNull(handler)
    }

    @Test
    fun `syncHandler is created when cloud repository provided`() {
        val handler = createSyncHandlerIfAvailable(
            InMemoryCloudSyncRepository(), playerRepo, gameTypeRepo, matchRepo
        )
        assertNotNull(handler)
    }
}
