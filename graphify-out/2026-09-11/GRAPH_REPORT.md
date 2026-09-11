# Graph Report - scoreo  (2026-09-04)

## Corpus Check
- 92 files · ~427,060 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2802 nodes · 6574 edges · 211 communities (158 shown, 53 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 470 edges (avg confidence: 0.84)
- Token cost: 55,000 input · 1,428,248 output

## Community Hubs (Navigation)
- ui / scoredetail
- ScoreCalculateurTest
- application
- .github / workflows
- ui / gametype
- ui / home
- ui / history
- module-mille-sabords / application
- ui / shared
- application
- doc / technical
- ui / stats
- Actions
- ui / module
- e2e / helpers
- application
- ui / halloffame
- EtatTest
- ui / module
- application
- getTrophiesUseCase
- application
- infrastructure / testing
- ui / sync
- fixtures
- LVDT_Rules-225x225mm_FR
- scripts
- application
- ui / theme
- domain / model
- ui / navigation
- moduleResult
- architecture
- ui / gametype
- application
- modules
- ui / scoredetail
- application
- ui / shared
- infrastructure / google
- objectifCard
- module-mille-sabords / domain
- ui / matchsetup
- Persistence
- module-api
- infrastructure / testing
- PersistenceTest
- doc / technique
- tsconfig.app
- scripts
- manifest
- infrastructure / localStorage
- package
- resources / objectif-cards
- migrate-automation-labels
- doc / fonctionnel
- resources / objectif-cards
- package
- Modeles
- infrastructure / google
- package
- inMemoryPlayerRepository
- infrastructure / events
- module-contract
- domain / model
- automation-dispatch
- inMemoryCloudSyncRepository
- tsconfig.node
- package
- googleDriveClient
- tsconfig.node
- _ds_bundle
- Partie
- Rendu
- package
- tsconfig.base
- package
- domain / model
- googleAuthService
- i18n
- package
- automation-log
- check-design-tokens
- package
- package
- manifest
- requeue-lost-events
- package
- apps/scoreo/src
- ModuleScoreScreen
- registry
- state-machine
- README
- tsconfig
- module-tori-valley / i18n
- dispatch-ready
- tsconfig.app
- doc / fonctionnel
- technique / domaine
- package
- partie
- package
- package
- package
- services
- routines.schema
- check-module-styles
- unblock-issues
- _ds / ludo-design-system-3f75603b-6f97-4099-a2bd-4112913e630a
- googleDriveClient
- readme
- tsconfig
- tsconfig
- legacy / 1ksabord-kotlin
- package
- sw
- sw.test
- moduleHostAdapter
- tsconfig.app
- glossary
- README
- Scoreo Screens.dc
- Stats
- module-tori-valley
- routines.schema
- routines.schema
- routines.schema
- sync-issue-dependencies
- shared-domain
- skill-contract
- README
- AGENTS
- LancerDes
- GoldenExportTest
- module-tori-valley
- check-doc-links
- README
- .prettierrc
- routines.schema
- routines.schema
- package
- gradlew
- routines.schema
- routines.schema
- routines.schema
- Dependabot npm daily updates
- i18next
- vite-env.d.ts
- scoreo/tsconfig.json
- Flavor
- Port
- Constantes.kt
- module-tori-valley/tsconfig.json
- setup-repo.sh
- import-json.spec.ts
- visual-in-container.sh
- session-start.sh
- Raw Token
- Glyph-Character Iconography (no icon system)
- Monospace Tabular Score Numerals
- resources/sw.js
- Carte Animaux (animals, singes + perroquets fusionnés)
- Carte Capitaine (captain, score ×2)
- Carte Diamant +1 (diamond)
- Carte Or +1 (gold)
- Cartes Tête de mort +1 / +2 (skull1, skull2)
- module-mille-sabords/src/styles.d.ts
- module-tori-valley/src/styles.d.ts
- 1000 Sabords - Calculateur (état vide, mobile)
- 1000 Sabords - Écran de fin de partie (desktop)
- 1000 Sabords - écran de fin de partie (phone)
- Mille Sabords - Partie en cours (dark, desktop)
- Mille Sabords In Progress (Desktop) Screenshot
- Mille Sabords In-Progress (Phone) Snapshot
- 1000 Sabords - Saisie rapide (manuel, desktop)
- 1000 Sabords - Saisie Manuelle (Phone) Snapshot
- Torī Score Create (Desktop) Snapshot
- Tori Score Create Screen (Phone) Baseline
- Torī Score Edit (Dark, Desktop) Snapshot
- Torī Valley Score Edit (Dark, Phone) Screenshot
- Torī Score Edit (Desktop, Linux)
- Torī Valley Score Edit (Phone, Linux) Snapshot
- Torī Valley Setup Screen (Default, Desktop) Snapshot
- Torī Valley Setup Screen (Phone, Default) Screenshot
- Torī Valley Setup Screen (Prefilled, Desktop)
- Torī Valley Setup Screen (Prefilled, Phone) — Visual Baseline
- Migration — Player Archive (active flag)
- Migration — scoreo_theme → scoreo_flavor + scoreo_accent
- Migration — SyncConfig token removal (#51)
- zod as the Serialization Engine
- Label: automation:in-progress
- Pre-guided matches open as hand-typed

## God Nodes (most connected - your core abstractions)
1. `GameType` - 92 edges
2. `Player` - 69 edges
3. `calculerScore()` - 69 edges
4. `Match` - 59 edges
5. `InMemoryMatchRepository` - 46 edges
6. `InMemoryGameTypeRepository` - 45 edges
7. `GameTypeRepository` - 41 edges
8. `MatchRepository` - 41 edges
9. `InMemoryPlayerRepository` - 40 edges
10. `ScoreCalculateurTest` - 38 edges

## Surprising Connections (you probably didn't know these)
- `GoogleIdentityService.kt (Kotlin-era OAuth adapter)` --semantically_similar_to--> `GoogleAuthService`  [INFERRED] [semantically similar]
  .opencode/plans/fix-gis-oauth2-mapping.md → apps/scoreo/src/infrastructure/google/googleAuthService.ts
- `calculerScore(dés, carte) — pure domain service` --semantically_similar_to--> `calculerScore()`  [INFERRED] [semantically similar]
  legacy/1ksabord-kotlin/AGENTS.md → packages/module-mille-sabords/src/domain/calculateurScore.ts
- `fr.ksabord.domaine — pure hexagon core` --semantically_similar_to--> `calculerScore()`  [INFERRED] [semantically similar]
  legacy/1ksabord-kotlin/kotlin/README.md → packages/module-mille-sabords/src/domain/calculateurScore.ts
- `Mock window.google/fetch Rather Than Tautologies` --references--> `GoogleDriveSyncAdapter`  [EXTRACTED]
  doc/technical/testing-google-drive.md → apps/scoreo/src/infrastructure/google/googleDriveSyncAdapter.ts
- `Migration — Match.rounds (#249)` --references--> `Match`  [EXTRACTED]
  doc/technical/migrations.md → apps/scoreo/src/domain/model/match.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **R1–R6 automation pipeline steps** — claude_skills_issue_to_spec_skill_issuetospec, claude_skills_implement_task_skill_implementtask, claude_skills_pr_review_skill_prreview, claude_skills_address_feedback_skill_addressfeedback, claude_skills_site_quality_skill_sitequality, claude_skills_weekly_report_skill_weeklyreport [EXTRACTED 1.00]
- **Claim-the-run label-race guard pattern across routines** — claude_skills_address_feedback_skill_addressfeedback, claude_skills_implement_task_skill_implementtask, claude_skills_pr_review_skill_prreview, concept_claim_the_run [INFERRED 0.85]
- **Automation label state machine (event bus)** — label_automation_ready, label_automation_needs_review, label_automation_needs_fix, label_automation_in_progress, label_automation_needs_human, label_automation_queued, label_automation_enabled, label_blocked, label_automation_review_pass, label_automation_attempt_n [EXTRACTED 1.00]
- **Scoreo R1-R6 Automation Pipeline** — concept_routine_r1_grooming, concept_routine_r2_implementation, concept_routine_r3_review, concept_routine_r4_fix, concept_routine_r5_hygiene, concept_routine_r6_report [EXTRACTED 0.95]
- **automation: Label State Machine** — concept_automation_label_automation_queued, concept_automation_label_automation_ready, concept_automation_label_automation_in_progress, concept_automation_label_automation_needs_review, concept_automation_label_automation_needs_fix, concept_automation_label_automation_needs_human, concept_automation_label_automation_enabled [EXTRACTED 0.95]
- **Modules Implementing the Scoreo Module Contract** — concept_module_contract, concept_module_host, concept_tori_valley_module, concept_mille_sabords_module [EXTRACTED 0.90]
- **Les trois variantes de l'objectif Bambou (A, B, C)** — packages_module_tori_valley_doc_resources_objectif_cards_bambou_a_bambou_a, packages_module_tori_valley_doc_resources_objectif_cards_bambou_b_bambou_b, packages_module_tori_valley_doc_resources_objectif_cards_bambou_c_bambou_c [EXTRACTED 1.00]
- **Les trois variantes de l'objectif Cerisier (A, B, C)** — packages_module_tori_valley_doc_resources_objectif_cards_cerisier_a_cerisier_a, packages_module_tori_valley_doc_resources_objectif_cards_cerisier_b_cerisier_b, packages_module_tori_valley_doc_resources_objectif_cards_cerisier_c_cerisier_c [EXTRACTED 1.00]
- **Flux de sauvegarde du tour en cours** — packages_module_mille_sabords_doc_technique_ui_reducteur_millesabordsstate, packages_module_mille_sabords_src_ui_module_millesabordsmodulereducer_versbrouillon, packages_module_mille_sabords_doc_technique_ui_etat_de_tour_millesabordsdraftschema, packages_module_mille_sabords_doc_technique_ui_etat_de_tour_trois_garde_fous [EXTRACTED 1.00]
- **Kotlin Legacy Hexagon: primary adapters → pure domain → localStorage adapter** — legacy_1ksabord_kotlin_kotlin_readme_adaptateurs_primaires, legacy_1ksabord_kotlin_kotlin_readme_domaine_hexagone, legacy_1ksabord_kotlin_kotlin_readme_persistence_adaptateur_secondaire, legacy_1ksabord_kotlin_readme_hexagonal_ddd [EXTRACTED 1.00]
- **Ludo DS Theming Stack: Catppuccin flavors + swappable accent + semantic tokens consumed by components** — ds_temp_design_handoff_scoreo_ds__ds_ludo_design_system_3f75603b_6f97_4099_a2bd_4112913e630a_readme_catppuccin_flavors, ds_temp_design_handoff_scoreo_ds__ds_ludo_design_system_3f75603b_6f97_4099_a2bd_4112913e630a_readme_swappable_accent, ds_temp_design_handoff_scoreo_ds__ds_ludo_design_system_3f75603b_6f97_4099_a2bd_4112913e630a_readme_semantic_token_layer, ds_temp_design_handoff_scoreo_ds_readme_semantic_css_root_scope_caveat, apps_scoreo_index_theme_color_catppuccin_mauve [EXTRACTED 1.00]
- **Les trois variantes de la carte Objectif Eau** — packages_module_tori_valley_doc_resources_objectif_cards_eau_a_eau_a [EXTRACTED 1.00]
- **Les trois variantes de la carte Objectif Montagne** — packages_module_tori_valley_doc_resources_objectif_cards_montagne_a_montagne_a [EXTRACTED 1.00]
- **Pipeline de calcul du score d'un tour** — packages_module_mille_sabords_doc_technique_domaine_lancer_des_lancerdes, packages_module_mille_sabords_doc_technique_domaine_constantes_cartes, packages_module_mille_sabords_doc_technique_domaine_calculateur_score_algorithme_de_calcul, packages_module_mille_sabords_doc_technique_domaine_constantes_bonus_series, packages_module_mille_sabords_doc_technique_domaine_modeles_resultatscore [EXTRACTED 1.00]
- **La preuve du portage Kotlin → TypeScript** — packages_module_mille_sabords_doc_technique_architecture_test_differentiel_golden, packages_module_mille_sabords_doc_technique_architecture_oracle_kotlin, packages_module_mille_sabords_src_application_exportscoreo_construireenveloppeexport, packages_module_mille_sabords_doc_technique_domaine_lancer_des_ids_des_en_anglais, packages_module_mille_sabords_doc_technique_domaine_partie_repli_a_zero [EXTRACTED 1.00]
- **Reworked Score Entry Flow: standings grid → round sheet → wrapping history** — ds_temp_design_handoff_scoreo_ds_readme_standings_grid, ds_temp_design_handoff_scoreo_ds_readme_round_entry_sheet, ds_temp_design_handoff_scoreo_ds_readme_round_history_cards, ds_temp_design_handoff_scoreo_ds_scoreo_screens_dc_score_entry_screen, apps_scoreo_src_ui_scoredetail_scoredetailscreen_scoredetailscreen [EXTRACTED 1.00]
- **Mécaniques résumées par la carte de référence Torī** — packages_module_tori_valley_doc_resources_objectif_cards_tori_reference_tori_reference, packages_module_tori_valley_doc_resources_objectif_cards_tori_reference_distinct_colour_series_table, packages_module_tori_valley_doc_resources_objectif_cards_tori_reference_torii_colour_iconography, packages_module_tori_valley_doc_resources_objectif_cards_tori_reference_multiple_series_allowed [EXTRACTED 1.00]
- **End-of-game scoring: the four addends of a player's VP total** — packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_decompte_des_points, packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_tori_series_scoring, packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_carte_objectif, packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_parchemin, packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_pinceau, packages_module_tori_valley_src_domain_model_match_scoreplayerresult [EXTRACTED 1.00]
- **Objectif entry strategy: guided counts, manual override, zero defaults, legacy fallback** — packages_module_tori_valley_doc_functional_features_scoring_guided_objectif_entry, packages_module_tori_valley_doc_functional_features_scoring_manual_override, packages_module_tori_valley_doc_functional_features_scoring_untouched_count_reads_as_zero, packages_module_tori_valley_doc_functional_features_scoring_legacy_matches_open_as_hand_typed, packages_module_tori_valley_doc_functional_features_objectif_cards_neighbour_dependent_cards, packages_module_tori_valley_doc_functional_features_objectif_cards_card_declared_counts [EXTRACTED 1.00]
- **Les trois variantes A/B/C de la carte Objectif Village** — packages_module_tori_valley_doc_resources_objectif_cards_village_a_village_a [EXTRACTED 1.00]
- **Objectifs marquant au comptage de tuiles individuelles** — packages_module_tori_valley_doc_resources_objectif_cards_bambou_c_diagonal_scoring, packages_module_tori_valley_doc_resources_objectif_cards_cerisier_a_per_tile_scoring, packages_module_tori_valley_doc_resources_objectif_cards_cerisier_c_village_multiplier [INFERRED 0.75]
- **Four PWA Icons Sharing One S-Monogram Silhouette, Two Palettes** — apps_scoreo_public_icon_192_scoreo_icon_192, apps_scoreo_public_icon_512_scoreo_icon_512, legacy_1ksabord_kotlin_kotlin_src_jsmain_resources_icon_192_legacy_sabords_icon_192, legacy_1ksabord_kotlin_kotlin_src_jsmain_resources_icon_512_legacy_sabords_icon_512, apps_scoreo_public_icon_192_shared_monogram_form_language [INFERRED 0.75]
- **Conditions de score de la famille Village** — packages_module_tori_valley_doc_resources_objectif_cards_village_a_three_points_per_village_tile, packages_module_tori_valley_doc_resources_objectif_cards_village_a_neighbour_bonus_four_per_lower_board, packages_module_tori_valley_doc_resources_objectif_cards_village_b_four_points_per_tile_of_largest_group, packages_module_tori_valley_doc_resources_objectif_cards_village_c_two_points_per_distinct_adjacent_type [INFERRED 0.75]
- **Mécanique commune : score par groupe de tuiles adjacentes** — packages_module_tori_valley_doc_resources_objectif_cards_eau_a_score_plus_grand_groupe_eau, packages_module_tori_valley_doc_resources_objectif_cards_eau_c_score_par_groupe_eau, packages_module_tori_valley_doc_resources_objectif_cards_montagne_b_score_groupe_deux_tuiles_montagne [INFERRED 0.85]

## Communities (211 total, 53 thin omitted)

### Community 0 - "ui / scoredetail"
Cohesion: 0.06
Nodes (53): CreateMatchUseCase, computeWinners(), buildInitialState(), combineDateWithTimeOfDay(), computeStandings(), computeTotals(), countRoundsPlayed(), freshState() (+45 more)

### Community 1 - "ScoreCalculateurTest"
Cohesion: 0.07
Nodes (6): LancerDes, calculerScore(), finaliser(), ReglesTest, ScoreCalculateurTest, ResultatScore

### Community 2 - "application"
Cohesion: 0.06
Nodes (42): asArray(), asRecord(), ImportGame, ImportMatchesUseCase, ImportPreview, ImportRankingEntry, ImportResult, ImportRoot (+34 more)

### Community 3 - ".github / workflows"
Cohesion: 0.07
Nodes (53): Routine entry: address-feedback (R4 trigger), Automation Routines Dispatcher Config, Routine entry: implement-task (R2 trigger), Routine entry: pr-review (R3 trigger), CLAUDE.md (repo root), Address Feedback skill (R4), Implement Task skill (R2), Issue to Spec skill (R1) (+45 more)

### Community 4 - "ui / gametype"
Cohesion: 0.12
Nodes (27): AddGameTypeUseCase, ArchiveGameTypeUseCase, CreateMatchOptions, FindGameTypeByIdUseCase, MergeGameTypesUseCase, UpdateGameTypeUseCase, DomainError, NotFoundError (+19 more)

### Community 5 - "ui / home"
Cohesion: 0.14
Nodes (31): AddPlayerUseCase, DeletePlayerUseCase, GetPlayerStatsUseCase, PlayerStats, GetPlayersUseCase, GetTrophiesUseCase, RenamePlayerUseCase, GameSelectModalHandle (+23 more)

### Community 6 - "ui / history"
Cohesion: 0.09
Nodes (29): DeleteMatchUseCase, GetMatchesUseCase, getWinners(), isTieBreakIndeterminate(), buildRoundBreakdown(), buildScoreSummary(), deleteMatch(), formatMatchDate() (+21 more)

### Community 7 - "module-mille-sabords / application"
Cohesion: 0.09
Nodes (30): assertRoundsSumToRanking(), CoupManuel, PartieTerminee, construireDetails(), construireEnveloppeExport(), EXPORT_GAME_NAME, EXPORT_VERSION, ExportClassement (+22 more)

### Community 8 - "ui / shared"
Cohesion: 0.09
Nodes (25): AddPlayerField(), AddPlayerFieldProps, CleanupConfirmModal(), CleanupConfirmModalProps, DeletePlayerModal(), DeletePlayerModalProps, RenamePlayerModal(), RenamePlayerModalProps (+17 more)

### Community 9 - "application"
Cohesion: 0.11
Nodes (10): ThrowingSaveAllMatchRepository, UpdateMatchUseCase, Match, MatchRepository, LocalStorageMatchRepository, MatchesSchema, readAll(), writeAll() (+2 more)

### Community 10 - "doc / technical"
Cohesion: 0.10
Nodes (37): Native Auto-Merge Mechanism, automation:enabled Label, automation:in-progress Label, automation:needs-fix Label, automation:needs-human Label, automation:needs-review Label, automation:queued Label, automation:ready Label (+29 more)

### Community 11 - "ui / stats"
Cohesion: 0.11
Nodes (22): GetHeadToHeadUseCase, HeadToHeadEntry, HeadToHeadTally, PlayerDetail, groupTrophiesByPlayer(), PlayerTrophyBadge, TROPHY_BADGE_ORDER, loadStats() (+14 more)

### Community 12 - "Actions"
Cohesion: 0.14
Nodes (35): HTMLElement, afficherDetailPartie(), afficherHistorique(), afficherModalExport(), afficherStats(), ajouterJoueur(), ajouterJoueurParNom(), annulerDernier() (+27 more)

### Community 13 - "ui / module"
Cohesion: 0.07
Nodes (30): Les 10 cartes du tirage, Carte Île au Trésor (dés réservés), 35 cartes Pirate, Gestion des cartes (effet appliqué avant le calcul), DefCarte / CARTES (les ids de cartes), Constantes du domaine, COULEURS_JOUEURS (--c0 à --c7), TypeDe / TYPES_DES (6 types de dés) (+22 more)

### Community 14 - "e2e / helpers"
Cohesion: 0.17
Nodes (18): archiveGameType(), createGameType(), CreateGameTypeOptions, deleteMatchFromHistory(), editMatchScore(), openMatchFromHistory(), enterRoundScore(), finishMatch() (+10 more)

### Community 15 - "application"
Cohesion: 0.09
Nodes (11): BindModuleUseCase, manifest, MergeGameTypesPreview, sameScoringRules(), GameType, GameTypeRepository, MergeGameTypesModal(), MergeGameTypesModalProps (+3 more)

### Community 16 - "ui / halloffame"
Cohesion: 0.11
Nodes (22): GetGameTypesUseCase, Trophy, TrophyHolder, TrophyHolderDetail, TrophyPeriod, HallOfFameAction, hallOfFameReducer(), loadHallOfFame() (+14 more)

### Community 17 - "EtatTest"
Cohesion: 0.09
Nodes (3): CoupIleCranes, CoupManuel, EtatTest

### Community 18 - "ui / module"
Cohesion: 0.12
Nodes (30): MilleSabordsDraftSchema (le brouillon complet), Les actions du réducteur, Les dérivations (rien n'est stocké), Le réducteur MVI de 1000 Sabords, MilleSabordsState, avecValeur(), LANCER_DES_VIDE, LancerDesSchema (+22 more)

### Community 19 - "application"
Cohesion: 0.10
Nodes (9): calculator, gt1, gt2, RankingEntry, rankingToMatch(), RankingToMatchInput, base, MatchModuleData (+1 more)

### Community 20 - "getTrophiesUseCase"
Cohesion: 0.10
Nodes (21): EloCalculator, EloSnapshot, bestRatioHolders(), compareMatchesChronologically(), eloPeakHolders(), gameRecordHolders(), isSameLocalMonth(), kingOfTheHillHolders() (+13 more)

### Community 21 - "application"
Cohesion: 0.12
Nodes (8): CleanupInactivePlayersUseCase, PlayerRepository, PlayersSchema, RoundHistoryList(), RoundHistoryListProps, alice, bob, Player

### Community 22 - "infrastructure / testing"
Cohesion: 0.11
Nodes (16): setup(), buildUseCase(), buildGameType(), buildUseCase(), buildUseCase(), InMemoryGameTypeRepository, gameType(), match() (+8 more)

### Community 23 - "ui / sync"
Cohesion: 0.15
Nodes (23): formatDate(), isSameState(), sortedById(), stableStringify(), SyncConflict, SyncOutcome, SyncResult, SyncSnapshot (+15 more)

### Community 24 - "fixtures"
Cohesion: 0.10
Nodes (23): seed, expectScreenshot(), Flavor, KEYS, openApp(), routes, SeededState, MATCH_ONE_ID (+15 more)

### Community 25 - "LVDT_Rules-225x225mm_FR"
Cohesion: 0.09
Nodes (32): Objectif Cards Transcription, Card-declared input counts, Neighbour-dependent cards stay manual, Torī Valley Scoring Rules, Guided Objectif entry, Per-landscape manual override, Rules deliberately not modeled, An untouched count reads as zero (+24 more)

### Community 26 - "scripts"
Cohesion: 0.11
Nodes (28): Copilot Instructions — Scoreo, Workflow: Deploy to GitHub Pages, Deploy job: smoke-test of the deployed site, Workflow: Kotlin legacy (oracle test suite), Workflow: Project Status Sync, pnpm monorepo (host app + modules), Pre-commit Checklist, CLAUDE.md — repo guide for Claude Code (+20 more)

### Community 27 - "application"
Cohesion: 0.13
Nodes (11): countMembersInMatch(), MergePlayersUseCase, referencesPlayer(), remapScores(), MatchDraft, MatchDraftSchema, MatchDraftRepository, LocalStorageMatchDraftRepository (+3 more)

### Community 28 - "ui / theme"
Cohesion: 0.15
Nodes (20): ThemePanel(), ThemeContext, ThemeProvider(), ThemeState, Accent, ACCENTS, applyTheme(), Flavor (+12 more)

### Community 29 - "domain / model"
Cohesion: 0.11
Nodes (24): emptyObjectifPoints(), ObjectifPoints, emptyPlayerResult(), Match, matchWinners(), CardInputsSchema, ManualFlagSchema, MatchSchema (+16 more)

### Community 30 - "ui / navigation"
Cohesion: 0.15
Nodes (21): AppShell(), BurgerItemProps, ScoreDetailRouteProps, screenTitle(), parseHash(), screenToHash(), GAMES_SCREEN, HALL_OF_FAME_SCREEN (+13 more)

### Community 31 - "moduleResult"
Cohesion: 0.12
Nodes (23): buildModuleRanking(), buildModuleRounds(), DRAFT_VERSION, MODULE_DATA_VERSION, ModuleMatchInput, readDraft(), samePlayerSet(), SCORE_CATEGORIES (+15 more)

### Community 32 - "architecture"
Cohesion: 0.13
Nodes (28): assertRoundsSumToRanking Invariant, AutoSyncCoordinator, Backward Compatibility Rule, DataChangeNotifier Port, Design Tokens CI Guard, Differential Golden-Test Harness, Playwright E2E Test Suite, Google Drive Cloud Sync (+20 more)

### Community 33 - "ui / gametype"
Cohesion: 0.15
Nodes (21): AddGameTypeOptions, TieBreakRule, tieBreakRuleLabel(), TieBreakRuleSchema, WinCondition, winConditionLabel(), WinConditionSchema, GameTypeFields() (+13 more)

### Community 34 - "application"
Cohesion: 0.12
Nodes (6): AutoSyncCoordinator, ConnectivityChecker, BrowserConnectivityChecker, InMemoryConnectivityChecker, useAutoSync(), Debounced Auto-Sync After Local Changes

### Community 35 - "modules"
Cohesion: 0.13
Nodes (9): CloudSyncRepository, ModuleDraftRepository, OAUTH_CLIENT_ID, keyFor(), LocalStorageModuleDraftRepository, InMemoryModuleDraftRepository, result, CreateServicesOptions (+1 more)

### Community 36 - "ui / scoredetail"
Cohesion: 0.18
Nodes (18): ObjectifCardSelection, ParcheminValue, PlayerResult, stateWith(), buildInitialState(), computeLandscapePoints(), scoreDetailReducer(), updateResult() (+10 more)

### Community 37 - "application"
Cohesion: 0.14
Nodes (5): now(), SyncUseCase, SyncScreenProps, Import Merges and Never Deletes, Sync Conflict Resolution

### Community 38 - "ui / shared"
Cohesion: 0.13
Nodes (16): MergePlayersPreview, MergePlayersModal(), MergePlayersModalProps, PlayerListSection(), PlayerListSectionProps, ManualSelectionDialog(), ManualSelectionDialogProps, ListContainer() (+8 more)

### Community 39 - "infrastructure / google"
Cohesion: 0.17
Nodes (8): GoogleDriveSyncAdapter, gisCalls, clearSyncConfig(), defaultConfig(), loadSyncConfig(), saveSyncConfig(), SyncConfig, SyncConfigSchema

### Community 40 - "objectifCard"
Cohesion: 0.12
Nodes (16): DomainError, NotFoundError, ValidationError, LandscapeType, ObjectifVariant, BAMBOO_A_TABLE, FieldSpec, objectifCard() (+8 more)

### Community 41 - "module-mille-sabords / domain"
Cohesion: 0.15
Nodes (19): Gradle Kotlin/JS Build Targets (jsNodeTest, jsBrowserDistribution), Kotlin Test Suite (91 domain + 13 JS tests) — port oracle, Les six faces de dés (crâne, diamant, or, singe, perroquet, sabre), 8 dés Corsaires, Oracle Kotlin legacy/1ksabord-kotlin, Test différentiel golden (preuve du portage), CalculateurScore — calculerScore(), Ids de dés en anglais ('skulls', 'diamonds', …) (+11 more)

### Community 42 - "ui / matchsetup"
Cohesion: 0.18
Nodes (11): defaultObjectifCardSelection(), LANDSCAPE_TYPES, OBJECTIF_VARIANTS, MatchSetupAction, matchSetupReducer(), MatchSetupScreen(), MatchSetupScreenProps, buildInitialMatchSetupState() (+3 more)

### Community 43 - "Persistence"
Cohesion: 0.14
Nodes (17): compresserLZW(), decompresserLZW(), construireEnveloppeExport(), effacerHistoriqueParties(), ExportClassement, exporterHistorique(), exporterHistoriqueJson(), ExportPartie (+9 more)

### Community 44 - "module-api"
Cohesion: 0.19
Nodes (9): ModuleHost, ScoringModuleManifest, ModuleMatchResult, ModulePlayer, ModuleRankingEntry, ModuleRound, ModuleMatchEdit, ScoringModule (+1 more)

### Community 45 - "infrastructure / testing"
Cohesion: 0.30
Nodes (6): SyncException, DriveClient, MockGoogleDriveClient, err(), ok(), Result

### Community 46 - "PersistenceTest"
Cohesion: 0.24
Nodes (5): ExportSabords, genererUuid(), construireExportJson(), PartieTerminee, PersistenceTest

### Community 47 - "doc / technique"
Cohesion: 0.12
Nodes (17): Documentation fonctionnelle 1000 Sabords, Règles du jeu 1000 Sabords, Documentation 1000 Sabords, Règles officielles Piraten Kapern / 1000 Sabords (AMIGO), Relancer les dés Corsaires, Architecture du module 1000 Sabords, index.ts n'exporte que le manifeste et le module, Les trois couches (hôte / écran / domaine) (+9 more)

### Community 48 - "tsconfig.app"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, jsx, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 49 - "scripts"
Cohesion: 0.17
Nodes (13): Workflow: Close Linked Issues, closeIssue(), CLOSING_REF_REGEX, extractClosedIssueNumbers(), headers, main(), resolvePullRequest(), CATCHUP_WINDOW_DAYS (+5 more)

### Community 50 - "manifest"
Cohesion: 0.15
Nodes (18): Scoreo PWA Icon 192 (purple rounded square, white lowercase s), Shared Monogram Form Language: Rounded Square, Bold Lowercase S, Scoreo Brand Identity: Mauve and White Monogram, Scoreo PWA Icon 512 (purple rounded square, white lowercase s), background_color, description, display, icons (+10 more)

### Community 51 - "infrastructure / localStorage"
Cohesion: 0.23
Nodes (6): LocalStorageGameTypeRepository, readAll(), writeAll(), LocalStoragePlayerRepository, readAll(), writeAll()

### Community 52 - "package"
Cohesion: 0.11
Nodes (18): name, packageManager, private, scripts, build, check:design-tokens, check:doc-links, dev (+10 more)

### Community 53 - "resources / objectif-cards"
Cohesion: 0.17
Nodes (19): Bonus +1 par tuile du groupe touchant les bords haut et bas du tableau, Carte Objectif Eau A, 3 points par tuile Eau d'un de vos plus grands groupes, 4 points par tuile Eau isolée touchant le bord du plateau, Bonus +10 si l'un de vos groupes (texte coupé, comparaison aux tableaux voisins), 3 points par groupe d'au moins 1 tuile Eau, Carte Objectif Montagne A, 3 points par tuile Montagne seule dans sa ligne, sinon 0 (+11 more)

### Community 54 - "migrate-automation-labels"
Cohesion: 0.21
Nodes (16): addLabel(), apiGet(), detectConflicts(), effectiveLabel(), getLabels(), headers, labelNamesOf(), listOpenItems() (+8 more)

### Community 55 - "doc / fonctionnel"
Cohesion: 0.12
Nodes (18): Buste (3 crânes ou plus), Carte Sorcière (witch, désactive le buste), Coffre plein (+500 pts), Combat naval (2, 3 ou 4 sabres), Dé non scorant vs dé scorant, Île de la Tête de Mort, Séries (3+ dés identiques), Bonus coffre au trésor plein (+500) (+10 more)

### Community 56 - "resources / objectif-cards"
Cohesion: 0.16
Nodes (18): Bambou A, Un groupe de plus de 2 tuiles n'est pas pris en compte, Score par palier selon le nombre de groupes de 2 tuiles bambou (1/2/3/4/5 groupes = 4/9/15/22/30 points), Bambou B, 4 points par groupe de 2 tuiles, 10 par groupe de 3, 16 par groupe de 4 (formes bambou indiquees), Un groupe doit strictement respecter les formes indiquees, Bambou C, +1 point si la tuile est dans un des quatre coins (+10 more)

### Community 57 - "package"
Cohesion: 0.12
Nodes (17): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+9 more)

### Community 58 - "Modeles"
Cohesion: 0.18
Nodes (11): CoupCalculateur, CoupIleCranes, CoupManuel, EvenementCoup, PartieTerminee, ResultatJoueur, ResultatScore, archiverPartieTerminee() (+3 more)

### Community 59 - "infrastructure / google"
Cohesion: 0.15
Nodes (11): GIS oauth2 Namespace Mapping Bug (missing `accounts` level), GoogleIdentityService.kt (Kotlin-era OAuth adapter), Content-Security-Policy meta (issue #51 defense-in-depth), Deferred Google Identity Services Script Tag, registerSw.js Service Worker Bootstrap (external, keeps script-src inline-free), GoogleAuthService, loginAsync(), Silent GIS Session Restore (+3 more)

### Community 60 - "package"
Cohesion: 0.12
Nodes (15): name, private, scripts, build, dev, preview, test, test:e2e (+7 more)

### Community 62 - "infrastructure / events"
Cohesion: 0.18
Nodes (3): DataChangeListener, DataChangeNotifier, InMemoryDataChangeNotifier

### Community 63 - "module-contract"
Cohesion: 0.28
Nodes (16): BindModuleUseCase, Landing After Module Exit, 1000 Sabords Scoring Module, module-api Package, Scoring Module Contract, ModuleHost Interface, ModuleScoreScreen, Module Style Scoping/Prefix Isolation (+8 more)

### Community 64 - "domain / model"
Cohesion: 0.17
Nodes (14): Torī reference card (the 16th card), Greedy Torī series grouping, Torī (jeton porte coloré), Barème des séries de Torī (0/2/4/7/10), Table de score des séries de Torī de couleurs différentes (1→0, 2→2, 3→4, 4→7, 5→10), Plusieurs séries de Torī peuvent être marquées, Carte de référence Torī, Iconographie des cinq couleurs de Torī (vert triangle, rouge losange, bleu goutte, jaune étoile, violet spirale) (+6 more)

### Community 65 - "automation-dispatch"
Cohesion: 0.20
Nodes (14): CLAIM_LABEL, KNOWN_ROUTINE_FIELDS, KNOWN_TOP_LEVEL_FIELDS, loadRoutinesConfig(), main(), OPTIONAL_ROUTINE_FIELDS, parseRoutinesYaml(), parseScalar() (+6 more)

### Community 66 - "inMemoryCloudSyncRepository"
Cohesion: 0.21
Nodes (4): SyncData, SyncStatus, InMemoryCloudSyncRepository, notAuthenticated()

### Community 67 - "tsconfig.node"
Cohesion: 0.13
Nodes (15): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 68 - "package"
Cohesion: 0.14
Nodes (14): @testing-library/react, @types/react-dom, @testing-library/react, @types/react-dom, devDependencies, jsdom, @testing-library/react, @types/react-dom (+6 more)

### Community 70 - "tsconfig.node"
Cohesion: 0.14
Nodes (12): compilerOptions, lib, extends, include, ES2023, vitest.config.ts, include, e2e (+4 more)

### Community 71 - "_ds_bundle"
Cohesion: 0.18
Nodes (6): Button(), _extends(), Input(), Modal(), ScoreCounterApp(), variantStyle()

### Community 73 - "Rendu"
Cohesion: 0.27
Nodes (13): boutonQR(), escHtml(), groupeQR(), iconeTheme(), EvenementCoup, PartieTerminee, renduCelluleCoup(), renduEcranConfig() (+5 more)

### Community 74 - "package"
Cohesion: 0.14
Nodes (13): react, exports, react, name, peerDependencies, react, private, scripts (+5 more)

### Community 75 - "tsconfig.base"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch, noUnusedLocals (+5 more)

### Community 76 - "package"
Cohesion: 0.15
Nodes (13): @types/node, @vitejs/plugin-react, @types/node, @vitejs/plugin-react, @types/node, devDependencies, jsdom, @types/node (+5 more)

### Community 77 - "domain / model"
Cohesion: 0.27
Nodes (6): GameTypeSchema, MatchModuleDataSchema, MatchSchema, PlayerScoreSchema, SyncFileSchema, GameTypesSchema

### Community 78 - "googleAuthService"
Cohesion: 0.17
Nodes (8): GisOAuth2, GisTokenClient, GisTokenClientConfig, GisTokenError, GisTokenResponse, LoginResult, UserInfoResponse, Window

### Community 79 - "i18n"
Cohesion: 0.23
Nodes (9): detectInitialLanguage(), isSupportedLanguage(), LANG_STORAGE_KEY, SUPPORTED_LANGUAGES, SupportedLanguage, LANGUAGE_FLAG, LANGUAGE_LABEL_KEY, LanguagePickerDialog() (+1 more)

### Community 80 - "package"
Cohesion: 0.15
Nodes (12): dependencies, zod, exports, zod, name, private, scripts, test (+4 more)

### Community 81 - "automation-log"
Cohesion: 0.24
Nodes (9): findAutomationLogComment(), headers, listComments(), main(), markerFor(), parseAutomationLog(), renderAutomationLog(), ROUTINE_LABELS (+1 more)

### Community 82 - "check-design-tokens"
Cohesion: 0.22
Nodes (11): DURATION_MS, DURATION_PROPS, findCssFiles(), findViolations(), main(), RADIUS_PX, SPACING_PROPS, SPACING_PX (+3 more)

### Community 83 - "package"
Cohesion: 0.17
Nodes (12): dependencies, react, react-i18next, @scoreboards/module-mille-sabords, @scoreboards/module-tori-valley, zod, react, react-i18next (+4 more)

### Community 84 - "package"
Cohesion: 0.17
Nodes (12): devDependencies, jsdom, @playwright/test, @testing-library/jest-dom, vite, vitest, jsdom, @testing-library/jest-dom (+4 more)

### Community 85 - "manifest"
Cohesion: 0.17
Nodes (11): background_color, description, display, icons, lang, name, orientation, scope (+3 more)

### Community 86 - "requeue-lost-events"
Cohesion: 0.36
Nodes (11): addLabel(), apiGet(), headers, labelNamesOf(), listOpenWithLabel(), main(), minutesSinceLabeled(), removeLabel() (+3 more)

### Community 87 - "package"
Cohesion: 0.18
Nodes (11): lucide-react, @scoreboards/shared-domain, lucide-react, @scoreboards/shared-domain, dependencies, lucide-react, react, @scoreboards/shared-domain (+3 more)

### Community 88 - "apps/scoreo/src"
Cohesion: 0.22
Nodes (5): App(), migrateMilleSabordsKeys(), MILLE_SABORDS_KEYS, container, Migration — 1kSaBord keys under sabords_ prefix

### Community 89 - "ModuleScoreScreen"
Cohesion: 0.27
Nodes (5): ModuleErrorBoundary, ModuleScoreRouteProps, ModuleScoreScreen(), renderFakeModule(), resolveEditing()

### Community 90 - "registry"
Cohesion: 0.29
Nodes (7): findManifest(), findManifestByGameName(), findModule(), MODULE_MANIFESTS, MODULES, milleSabordsManifest, milleSabordsModule

### Community 91 - "state-machine"
Cohesion: 0.18
Nodes (11): 1. Entities, 2. Labels: six categories, 3. Components: versioned routines vs. deterministic actions, 4. Complete transition table, 5. The R3 ↔ R4 loop, 6. Recovery, failure and retry rules, 7. Special cases, Automation state machine (+3 more)

### Community 92 - "README"
Cohesion: 0.20
Nodes (11): calculerScore(dés, carte) — pure domain service, EtatTour — top-level UI turn state, Magic Pirate Instant Win (9 diamonds or 9 gold), Singleton `val partie` — mutable top-level state, Primary Adapters (fr.ksabord.ui web, GameViewModel Android), Dormant Android Compose Target, fr.ksabord.domaine — pure hexagon core, LancerDés — immutable dice value object (+3 more)

### Community 93 - "tsconfig"
Cohesion: 0.18
Nodes (10): compilerOptions, jsx, lib, types, extends, include, DOM, ES2022 (+2 more)

### Community 94 - "module-tori-valley / i18n"
Cohesion: 0.31
Nodes (6): registerTranslations(), SUPPORTED_LANGUAGES, SupportedLanguage, TORI_VALLEY_NS, en, fr

### Community 95 - "dispatch-ready"
Cohesion: 0.31
Nodes (10): addLabel(), apiGet(), headers, labelNamesOf(), listOpenWithLabel(), main(), pickNextQueued(), PRIORITY_ORDER (+2 more)

### Community 96 - "tsconfig.app"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, noUncheckedSideEffectImports, resolveJsonModule, useDefineForClassFields, extends, include, src (+1 more)

### Community 97 - "doc / fonctionnel"
Cohesion: 0.20
Nodes (10): Diamants et Or (100 pts l'unité), Pirate magique (9 identiques, victoire immédiate), Seuil des 6000 pts et dernier tour, Magie pirate (9 symboles identiques), Seuil des 6000 points et dernière manche, Invariants de Partie, Sérialisation zod avec .default() par champ, Le bug d'origine (EtatTour.kt non persisté) (+2 more)

### Community 98 - "technique / domaine"
Cohesion: 0.22
Nodes (10): contributionPour(coup, nom), CoupCalculateur, EvenementCoup (union discriminée), Partie (racine d'agrégat), Repli à zéro (Math.max(0, acc + contribution)), Une instance par état, pas un singleton, Event sourcing (journal d'EvenementCoup), assertRoundsSumToRanking (invariant de sortie) (+2 more)

### Community 99 - "package"
Cohesion: 0.20
Nodes (9): exports, name, private, scripts, test, test:watch, typecheck, type (+1 more)

### Community 101 - "package"
Cohesion: 0.20
Nodes (9): exports, name, private, scripts, test, test:watch, typecheck, type (+1 more)

### Community 102 - "package"
Cohesion: 0.22
Nodes (9): react-dom, react-dom, dependencies, react, react-dom, zod, react, zod (+1 more)

### Community 103 - "package"
Cohesion: 0.22
Nodes (9): @types/react, @types/react, devDependencies, @types/react, typescript, vitest, vitest, @types/react (+1 more)

### Community 104 - "services"
Cohesion: 0.33
Nodes (7): createDefaultCloudSyncRepository(), createServices(), ServicesContext, ServicesProvider(), Probe(), useServices(), ServicesContext

### Community 105 - "routines.schema"
Cohesion: 0.22
Nodes (8): routines, version, additionalProperties, description, required, $schema, title, type

### Community 106 - "check-module-styles"
Cohesion: 0.47
Nodes (7): classNames(), findViolations(), hostClasses(), main(), moduleStylesheets(), selectors(), HOST

### Community 107 - "unblock-issues"
Cohesion: 0.42
Nodes (8): addLabel(), apiGet(), BLOCKING_LABELS, getLabels(), headers, main(), removeLabel(), tryUnblock()

### Community 108 - "_ds / ludo-design-system-3f75603b-6f97-4099-a2bd-4112913e630a"
Cohesion: 0.32
Nodes (8): Static theme-color #8839ef (Catppuccin Latte / Mauve), Catppuccin Flavors (latte/frappe/macchiato/mocha via data-theme), Semantic Token Layer (--color-primary, --surface-card, --text-body), Independently Swappable Accent (data-accent, 14 hues, mauve default), Ludo DS Design Tokens (colors-*, semantic, typography, spacing, radius-shadow), semantic.css Only Maps Tokens on :root (element-scoped data-theme caveat), COULEURS_JOUEURS mirrored in CSS --c0..--c7, Legacy CSS Custom Properties (--bg, --surface, --primary, --text, --c0..)

### Community 109 - "googleDriveClient"
Cohesion: 0.25
Nodes (4): FileInfo, FileResponse, FilesResponse, sleep()

### Community 110 - "readme"
Cohesion: 0.25
Nodes (8): DS Button (primary/secondary/ghost/danger, icon-only stepper mode), Content Fundamentals (utilitarian voice, sentence case, no emoji), Ludo Design System, DS Modal (centered dialog with scrim), Screen → Repo File Map (remhiit/scoreo, branch main), Phone Frame Modal Containment (.device translateZ(0)), Scoreo × Ludo DS Design Handoff, .device Phone Artboard Frame

### Community 111 - "tsconfig"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, extends, include, DOM, ES2022, src

### Community 112 - "tsconfig"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, extends, include, DOM, ES2022, src

### Community 113 - "legacy / 1ksabord-kotlin"
Cohesion: 0.29
Nodes (7): Scoreo PWA Head (manifest.json, icon-192, apple-mobile-web-app), Splash Loader (#splash), Single Click Delegate on document (data-action dispatch), escHtml() — HTML escaping for user-provided names, Full innerHTML Re-render (no virtual DOM), Legacy App Shell (#app + app.js), Legacy PWA Head (manifest, theme-color #e6a817, apple-touch-icon)

### Community 114 - "package"
Cohesion: 0.29
Nodes (7): typescript, typescript, typescript, devDependencies, typescript, vitest, vitest

### Community 115 - "sw"
Cohesion: 0.38
Nodes (5): ASSETS, CACHE_PREFIX, cacheFirst(), networkFirst(), putInCache()

### Community 118 - "tsconfig.app"
Cohesion: 0.29
Nodes (7): lib, DOM, DOM.Iterable, ES2022, lib, DOM, ES2022

### Community 119 - "glossary"
Cohesion: 0.29
Nodes (7): Action, MVI-style, Reducer, State, MVI-style unidirectional flow, Reducer, State

### Community 120 - "README"
Cohesion: 0.33
Nodes (7): DS Input (text + number with −/+ stepper), Native Number Spinner Suppression (.no-spin), Round Entry Bottom Sheet (.sheet), Wrapping Round History Cards (.hist-round / .hist-cells), Score Entry Rework (replaces the wide one-table layout), Standings Card Grid (.gs-grid / .gs-card), Score Entry Artboards (standings / round sheet / history / final decision / discard)

### Community 121 - "Scoreo Screens.dc"
Cohesion: 0.29
Nodes (7): Design Reference, Not Production Code, Scoreo Screens Design Canvas, Games Artboards (manage / edit / detail), Home & Players Artboards (first launch / roster / select a game), Import Artboards (pick a file / preview / result), Stats Artboards (leaderboard / player detail / empty), Sync Artboards (disconnected / conflict / complete)

### Community 122 - "Stats"
Cohesion: 0.57
Nodes (6): renduModalStats(), calculerFaceAFace(), calculerStatsJoueurs(), calculerToutesPaires(), StatsFaceAFace, StatsJoueur

### Community 123 - "module-tori-valley"
Cohesion: 0.38
Nodes (5): Host (ModuleHost), Match (recorded playthrough), Module (scoring module), toriValleyManifest, toriValleyModule

### Community 124 - "routines.schema"
Cohesion: 0.33
Nodes (7): issue, pull_request, enum, description, enum, type, entity

### Community 125 - "routines.schema"
Cohesion: 0.29
Nodes (7): additionalProperties, type, routines, additionalProperties, description, minProperties, type

### Community 126 - "routines.schema"
Cohesion: 0.29
Nodes (7): properties, description, type, description, type, concurrency_key, deduplicate_by

### Community 127 - "sync-issue-dependencies"
Cohesion: 0.53
Nodes (5): Workflow: Sync Issue Dependencies (blocked_by), api(), extractBlockerNumbers(), linkBlockedBy(), main()

### Community 129 - "skill-contract"
Cohesion: 0.33
Nodes (6): 1. Common `SKILL.md` template, 2. Common structured output format (R2/R3/R4), 3. Conditions de passage à `automation:needs-human`, 4. Conformity checklist, 5. Worked example — `implement-task` (R2), unmodified, Skill contract

### Community 130 - "README"
Cohesion: 0.33
Nodes (6): Score Counter UI Kit (flagship demo), DS Table (scoreboard grid, pinned totals row), deploy-pages.yml GitHub Pages Deployment, Hexagonal Architecture + DDD (Kotlin legacy), French Ubiquitous Language, 1000 Sabords — Kotlin Multiplatform App (legacy)

### Community 131 - "AGENTS"
Cohesion: 0.33
Nodes (6): LZW Compression → .sabords Export Format, ÉvénementCoup sealed hierarchy (CoupCalculateur / CoupManuel / CoupÎleCrânes), Event Sourcing of Turns (`coups` list), localStorage Keys (partie, joueurs_connus, historique_parties), Persistence.kt — secondary localStorage adapter, Game History Archive (last 20 games)

### Community 134 - "module-tori-valley"
Cohesion: 0.40
Nodes (6): Torī Valley Package Guidance (CLAUDE.md), Card scans kept local, never committed, Torī Valley Documentation Index, Tori Valley Reference Doc, La Vallée des Torī — Règles du jeu (Origames), Torī Valley Module README

### Community 136 - "README"
Cohesion: 0.40
Nodes (5): Card ID Vocabulary (none, captain, diamond, gold, animals, witch, sea2/3/4, skull1/2), Bust Rule (3+ skulls), Turn Cards (captain, diamond, gold, animals, witch, sea battle, skulls), Scoring Elements (diamonds, gold, series, skulls, full chest), Île de la Tête de Mort (Skull Island penalty)

### Community 137 - ".prettierrc"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 138 - "routines.schema"
Cohesion: 0.40
Nodes (5): concurrency_key, entity, skill, trigger_label, required

### Community 139 - "routines.schema"
Cohesion: 0.40
Nodes (5): properties, version, const, description, type

### Community 140 - "package"
Cohesion: 0.50
Nodes (4): @scoreboards/module-api, @scoreboards/module-api, @scoreboards/module-api, @scoreboards/module-api

### Community 141 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 142 - "routines.schema"
Cohesion: 0.50
Nodes (4): description, minimum, type, max_iterations

### Community 143 - "routines.schema"
Cohesion: 0.50
Nodes (4): skill, description, minLength, type

### Community 144 - "routines.schema"
Cohesion: 0.50
Nodes (4): trigger_label, description, minLength, type

### Community 145 - "Dependabot npm daily updates"
Cohesion: 0.67
Nodes (3): Dependabot npm daily updates, Dependabot 2-day cooldown vs pnpm minimumReleaseAge, TypeScript >=7 pinned out of Dependabot

### Community 146 - "i18next"
Cohesion: 0.67
Nodes (3): i18next, i18next, i18next

### Community 149 - "Flavor"
Cohesion: 0.67
Nodes (3): Theme Feature, Accent, Flavor

### Community 150 - "Port"
Cohesion: 0.67
Nodes (3): Adapter, Port, Use Case

## Ambiguous Edges - Review These
- `themeManager.ts` → `1000 Sabords calculator - empty state (desktop, Linux baseline)`  [AMBIGUOUS]
  apps/scoreo/tests/visual/milleSabordsModule.visual.spec.ts-snapshots/sabords-calc-empty-desktop-linux.png · relation: conceptually_related_to
- `Torī reference card (the 16th card)` → `Torī Valley Glossary`  [AMBIGUOUS]
  packages/module-tori-valley/doc/functional/features/objectif-cards.md · relation: references
- `Bonus +10 si l'un de vos groupes (texte coupé, comparaison aux tableaux voisins)` → `Carte Objectif Eau A`  [AMBIGUOUS]
  packages/module-tori-valley/doc/resources/objectif-cards/eau-c.jpg · relation: references
- `Relancer les dés Corsaires` → `Module de comptage (pas une application)`  [AMBIGUOUS]
  packages/module-mille-sabords/doc/resources/new-rules_piraten-final-bdef.pdf · relation: conceptually_related_to
- `Les 10 cartes du tirage` → `Carte Île au Trésor (dés réservés)`  [AMBIGUOUS]
  packages/module-mille-sabords/doc/resources/new-rules_piraten-final-bdef.pdf · relation: conceptually_related_to
- `Carte Sorcière (witch, désactive le buste)` → `Carte Gardienne (relancer une tête de mort)`  [AMBIGUOUS]
  packages/module-mille-sabords/doc/fonctionnel/regles-du-jeu.md · relation: cites
- `Scoreo Brand Identity: Mauve and White Monogram` → `Legacy 1000 Sabords Icon 192 (navy rounded square, gold lowercase s)`  [AMBIGUOUS]
  legacy/1ksabord-kotlin/kotlin/src/jsMain/resources/icon-192.png · relation: references
- `Chaque tuile cerisier vaut autant de points que le nombre de tuiles village du tableau (produit cerisiers x villages)` → `Cerisier C`  [AMBIGUOUS]
  packages/module-tori-valley/doc/resources/objectif-cards/cerisier-c.jpg · relation: references
- `Plusieurs séries de Torī peuvent être marquées` → `Carte de référence Torī`  [AMBIGUOUS]
  packages/module-tori-valley/doc/resources/objectif-cards/tori-reference.jpg · relation: references
- `EtatTour — top-level UI turn state` → `Singleton `val partie` — mutable top-level state`  [AMBIGUOUS]
  legacy/1ksabord-kotlin/AGENTS.md · relation: shares_data_with
- `new-scoring-module Skill` → `SKILL.md Common Template`  [AMBIGUOUS]
  doc/automation/skill-contract.md · relation: references

## Knowledge Gaps
- **578 isolated node(s):** `ImportGame`, `ImportRankingEntry`, `ImportRoot`, `ImportRound`, `ImportRoundScore` (+573 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `themeManager.ts` and `1000 Sabords calculator - empty state (desktop, Linux baseline)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Torī reference card (the 16th card)` and `Torī Valley Glossary`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Bonus +10 si l'un de vos groupes (texte coupé, comparaison aux tableaux voisins)` and `Carte Objectif Eau A`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Relancer les dés Corsaires` and `Module de comptage (pas une application)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Les 10 cartes du tirage` and `Carte Île au Trésor (dés réservés)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Carte Sorcière (witch, désactive le buste)` and `Carte Gardienne (relancer une tête de mort)`?**
  _Edge tagged AMBIGUOUS (relation: cites) - confidence is low._
- **What is the exact relationship between `Scoreo Brand Identity: Mauve and White Monogram` and `Legacy 1000 Sabords Icon 192 (navy rounded square, gold lowercase s)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._