# P3-05: Migration edge-cases

## Fichier
- `src/commonTest/kotlin/com/scoreo/infrastructure/MatchMigrationTest.kt`

## Problème
Des edge-cases importants ne sont pas testés :
- UUID avec hex majuscule
- Date invalide (chaîne aléatoire, vide, format non ISO)
- Absence de champ `id` ou `date`
- Idempotence : appelée 2x → pas de changement au 2e appel

## Cas à tester

```kotlin
@Test
fun `uppercase uuid is recognized as uuid`() {
    assertTrue(isUuid("550E8400-E29B-41D4-A716-446655440000"))
}

@Test
fun `invalid date string is left unchanged`() {
    val json = """[{"id":"m1","date":"not-a-date","gameTypeId":"gt1","playerScores":[]}]"""
    val result = migrateMatchesJson(json, scoreoJson) { "new-id" }
    // Still has same data (date string isn't changed, id isn't changed)
    assertNull(result) // no change needed
}

@Test
fun `empty date string is left unchanged`() {
    // Similar to above
}

@Test
fun `migration is idempotent`() {
    val json = """[{"id":"old-id","date":"2024-01-15","gameTypeId":"gt1","playerScores":[]}]"""
    val first = migrateMatchesJson(json, scoreoJson) { "new-id" }
    assertNotNull(first) // was changed
    val second = migrateMatchesJson(first!!, scoreoJson) { "another-id" }
    assertNull(second) // no further change needed (id is now uuid, date is long)
}

@Test
fun `extra fields in playerscores are preserved`() {
    val json = """[{"id":"m1","date":1000,"gameTypeId":"gt1","playerScores":[{"playerId":"p1","score":10,"extra":"keep"}]}]"""
    val result = migrateMatchesJson(json, scoreoJson) { "new-id" }
    assertNull(result) // already uuid, long date → no migration needed
}
```

## Effort
30 min.
