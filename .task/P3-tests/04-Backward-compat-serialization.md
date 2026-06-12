# P3-04: Rétro-compat — désérialisation anciens formats

## Fichier
- `src/commonTest/kotlin/com/scoreo/domain/SerializationTest.kt`

## Problème
`SerializationTest` ne teste que le round-trip du format actuel ou avec un champ supplémentaire. Aucun test ne vérifie qu'un **ancien** format (sans `manualWinners`, sans `active`) se désérialise correctement avec les valeurs par défaut.

## Cas à tester
```kotlin
@Test
fun `match without manualWinners defaults to emptyList`() {
    val json = """{"id":"m1","date":1000,"gameTypeId":"gt1","playerScores":[]}"""
    val match = scoreoJson.decodeFromString<Match>(json)
    assertTrue(match.manualWinners.isEmpty())
}

@Test
fun `player without active defaults to true`() {
    val json = """{"id":"p1","name":"Alice"}"""
    val player = scoreoJson.decodeFromString<Player>(json)
    assertTrue(player.active)
}

@Test
fun `player with active=false is preserved`() {
    val json = """{"id":"p1","name":"Alice","active":false}"""
    val player = scoreoJson.decodeFromString<Player>(json)
    assertFalse(player.active)
}

@Test
fun `playerScore backward compat`() {
    val json = """{"playerId":"p1","score":10}"""
    val ps = scoreoJson.decodeFromString<PlayerScore>(json)
    assertEquals("p1", ps.playerId)
    assertEquals(10, ps.score)
}
```

## Effort
15 min.
