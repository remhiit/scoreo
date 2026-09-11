# Graph Report - scoreo  (2026-08-25)

## Corpus Check
- Large corpus: 518 files · ~406,373 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2787 nodes · 6645 edges · 175 communities (148 shown, 27 thin omitted)
- Extraction: 91% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 564 edges (avg confidence: 0.84)
- Token cost: 672,687 input · 0 output

## Community Hubs (Navigation)
- 1000 Sabords Kotlin Score Tests
- Game Type Model & Repository
- Game Type Screen
- Module Result & Export
- Tori Valley Documentation
- Shared Ludo UI Components
- Tori Valley Package Manifest
- Hash Routing & Navigation
- Stats & Head-to-Head Screen
- Player List & Home Screen
- Root Workspace Tooling
- Player Store & Round Entry
- Hall of Fame Trophies
- Kotlin Legacy Action Dispatch
- Auto-Sync Coordination
- Match History Screen
- Kotlin Legacy State Tests
- 1000 Sabords Package Manifest
- Tori Match Model & Scoring
- Trophies & Elo Calculator
- End-to-End Behaviour Specs
- Visual Test Harness
- Module API Host Contract
- Host Score Detail Reducer
- Tori Score Detail Reducer
- Score Detail Test Harness
- 1000 Sabords Phone Baselines
- 1000 Sabords Calculator Screen
- Match Model & Repository
- Match Import Flow
- Tori Phone Baselines
- Tori Landscape & Match Setup
- 1000 Sabords Domain Docs
- 1000 Sabords Module Reducer
- CI & Site Quality Guards
- In-Memory Test Doubles
- LocalStorage Match Adapter
- Theme Manager & Context
- Google Drive Sync Adapter
- Tori TypeScript Config
- Match Creation Dependencies
- Player Repository Port
- Match Score Model
- Result Type & Sync Errors
- Google Drive Client
- Tori Desktop Baselines
- Kotlin Legacy Persistence
- 1000 Sabords Module Docs
- Review & Fix Automation Skills
- Merged PR Sweeper Scripts
- App Runtime Dependencies
- Test Tooling Dependencies
- Merge Game Types
- Module Registry & Manifests
- Sync Screen
- LocalStorage Player & Game Adapters
- 1000 Sabords Desktop Baselines
- Kotlin Legacy Persistence Tests
- Module API Package Manifest
- 1000 Sabords Domain Constants
- Tori Module Result Bridge
- Google Auth Service
- Skull Island & Quick Entry
- Repo Conventions & Skills
- PWA Manifest & Icons
- GitHub Project Sync Script
- Import Matches Use Case
- Service Container Wiring
- Match Draft Repository
- Localization & Language Picker
- Bamboo & Cherry Objectif Cards
- Tori Node TypeScript Config
- Shared Domain Package Manifest
- Sync Use Case
- Merge Players
- Zod Schemas & Serialization Contract
- Kotlin Legacy Domain Models
- Village, Mountain & Tori Cards
- Objectif Card Definitions
- Services Context & DI Root
- 1000 Sabords Hexagon Concepts
- Tori Score Detail Types
- Match Update & Edit Harness
- Tori i18n Namespace
- Player Use Cases & Validation
- App Bootstrap & Key Migration
- Module Host Contract Concepts
- Scoreo TypeScript Config
- Design System Bundle
- Kotlin Legacy Partie Aggregate
- Kotlin Legacy HTML Rendering
- Base TypeScript Config
- Import Screen Tests
- Cloud Sync Repository Port
- Scoreo Node TypeScript Config
- Design Token Guard Script
- Legacy PWA Manifest
- 1000 Sabords TypeScript Config
- Lost Event Requeue Script
- Issue Grooming & Dependencies
- Build Script Definitions
- Stats Screen Tests
- Implementation Pipeline Stages
- Ready Queue Dispatcher
- Module Score Screen Host
- Google Identity OAuth Client
- Quick Score Shortcut Groups
- Scoreo Design Canvas Artboards
- Module API TypeScript Config
- 1000 Sabords Draft Schemas
- Shared Domain TypeScript Config
- Module Style Isolation Guard
- Issue Unblock Script
- Catppuccin Semantic Tokens
- Sync Snapshot Helpers
- Ludo Design System Handoff
- Legacy App Shell & Splash
- Service Worker Caching
- Service Worker Tests
- History Screen Tests
- Auto-Merge & Deployment Policy
- Score Entry Redesign Artboards
- Kotlin Legacy Statistics
- Legacy App & UI Kit Demos
- Kotlin Event Sourcing & Storage
- Kotlin Legacy Turn State
- Kotlin Golden Export Test
- Scoreo App Package Manifest
- Prettier Configuration
- In-Memory Module Draft Store
- MVI Vocabulary (Tori)
- Design Token Vocabulary
- Gradle Wrapper Script
- MVI Vocabulary (Scoreo)
- Vite Environment Types
- Scoreo TS Project References
- Kotlin Legacy Constants
- Tori TS Project References
- Repo Label Bootstrap Script
- Import JSON E2E Spec
- Vitest Runner
- Containerized Visual Runner
- Session Start Hook
- CI as Merge Barrier
- No Self-Approval Policy
- Issue & Project Workflows
- Icon Rendering Approaches
- Visual Foundations & Numerals
- Legacy Service Worker
- Animals Card
- Captain Card
- Diamond Card
- Gold Card
- Skull Cards
- 1000 Sabords CSS Typings
- Tori CSS Typings

## God Nodes (most connected - your core abstractions)
1. `GameType` - 95 edges
2. `Player` - 73 edges
3. `calculerScore()` - 69 edges
4. `Match` - 62 edges
5. `InMemoryMatchRepository` - 46 edges
6. `InMemoryGameTypeRepository` - 45 edges
7. `MatchRepository` - 42 edges
8. `GameTypeRepository` - 41 edges
9. `InMemoryPlayerRepository` - 40 edges
10. `PlayerRepository` - 38 edges

## Surprising Connections (you probably didn't know these)
- `assertRoundsSumToRanking` --semantically_similar_to--> `ImportMatchesUseCase`  [INFERRED] [semantically similar]
  doc/technical/module-contract.md → apps/scoreo/src/application/importMatchesUseCase.ts
- `GoogleIdentityService.kt (Kotlin-era OAuth adapter)` --semantically_similar_to--> `GoogleAuthService`  [INFERRED] [semantically similar]
  .opencode/plans/fix-gis-oauth2-mapping.md → apps/scoreo/src/infrastructure/google/googleAuthService.ts
- `calculerScore(dés, carte) — pure domain service` --semantically_similar_to--> `calculerScore()`  [INFERRED] [semantically similar]
  legacy/1ksabord-kotlin/AGENTS.md → packages/module-mille-sabords/src/domain/calculateurScore.ts
- `fr.ksabord.domaine — pure hexagon core` --semantically_similar_to--> `calculerScore()`  [INFERRED] [semantically similar]
  legacy/1ksabord-kotlin/kotlin/README.md → packages/module-mille-sabords/src/domain/calculateurScore.ts
- `Component: Scoreo host top bar around the module (back arrow, title, menu)` --references--> `ToriValleyModuleScreen()`  [AMBIGUOUS]
  apps/scoreo/tests/visual/toriModule.visual.spec.ts-snapshots/tori-score-create-desktop-linux.png → packages/module-tori-valley/src/ui/module/ToriValleyModuleScreen.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Hexagonal Layering of a Write Path** — apps_scoreo_src_ui_scoredetail_scoredetailreducer_scoredetailreducer, apps_scoreo_src_application_creatematchusecase_creatematchusecase, apps_scoreo_src_domain_port_matchrepository_matchrepository, apps_scoreo_src_infrastructure_localstorage_localstoragematchrepository_localstoragematchrepository, doc_technical_architecture_hexagonal_architecture [INFERRED 0.85]
- **Label-Driven Automation Pipeline (R1→R6)** — doc_technical_automation_plan_r1_grooming, doc_technical_automation_plan_r2_implementation, doc_technical_automation_plan_r3_review, doc_technical_automation_plan_r4_fix, doc_technical_automation_plan_r5_hygiene, doc_technical_automation_plan_r6_report, doc_technical_automation_plan_labels_event_bus, doc_technical_automation_plan_dispatcher [EXTRACTED 1.00]
- **Host ↔ Module Boundary** — doc_technical_module_contract_scoringmodulemanifest, doc_technical_module_contract_modulehost, doc_technical_module_contract_modulematchresult, doc_technical_module_contract_scoringmodulescreenprops, doc_technical_module_contract_assertroundssumtoranking, apps_scoreo_src_modules_registry_modules, apps_scoreo_src_application_bindmoduleusecase_bindmoduleusecase [EXTRACTED 1.00]
- **Pipeline de calcul du score d'un tour** — packages_module_mille_sabords_doc_technique_domaine_lancer_des_lancerdes, packages_module_mille_sabords_doc_technique_domaine_constantes_cartes, packages_module_mille_sabords_doc_technique_domaine_calculateur_score_algorithme_de_calcul, packages_module_mille_sabords_doc_technique_domaine_constantes_bonus_series, packages_module_mille_sabords_doc_technique_domaine_modeles_resultatscore [EXTRACTED 1.00]
- **Flux de sauvegarde du tour en cours** — packages_module_mille_sabords_doc_technique_ui_reducteur_millesabordsstate, packages_module_mille_sabords_src_ui_module_millesabordsmodulereducer_versbrouillon, packages_module_mille_sabords_doc_technique_ui_etat_de_tour_millesabordsdraftschema, packages_module_mille_sabords_doc_technique_ui_etat_de_tour_trois_garde_fous, packages_module_mille_sabords_doc_fonctionnel_guide_utilisation_reprise_apres_fermeture [EXTRACTED 1.00]
- **La preuve du portage Kotlin → TypeScript** — packages_module_mille_sabords_doc_technique_architecture_test_differentiel_golden, packages_module_mille_sabords_doc_technique_architecture_oracle_kotlin, packages_module_mille_sabords_src_application_exportscoreo_construireenveloppeexport, packages_module_mille_sabords_doc_technique_domaine_lancer_des_ids_des_en_anglais, packages_module_mille_sabords_doc_technique_domaine_partie_repli_a_zero [EXTRACTED 1.00]
- **End-of-game scoring: the four addends of a player's VP total** — packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_decompte_des_points, packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_tori_series_scoring, packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_carte_objectif, packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_parchemin, packages_module_tori_valley_doc_resources_lvdt_rules_225x225mm_fr_pinceau, packages_module_tori_valley_src_domain_model_match_scoreplayerresult [EXTRACTED 1.00]
- **Objectif entry strategy: guided counts, manual override, zero defaults, legacy fallback** — packages_module_tori_valley_doc_functional_features_scoring_guided_objectif_entry, packages_module_tori_valley_doc_functional_features_scoring_manual_override, packages_module_tori_valley_doc_functional_features_scoring_untouched_count_reads_as_zero, packages_module_tori_valley_doc_functional_features_scoring_legacy_matches_open_as_hand_typed, packages_module_tori_valley_doc_functional_features_objectif_cards_neighbour_dependent_cards, packages_module_tori_valley_doc_functional_features_objectif_cards_card_declared_counts [EXTRACTED 1.00]
- **Module isolation contract: no storage, scoped styles, namespaced strings, inward deps** — packages_module_tori_valley_doc_technical_architecture_no_persistence, packages_module_tori_valley_doc_technical_architecture_style_scoping, packages_module_tori_valley_doc_reference_i18n_namespace, packages_module_tori_valley_doc_technical_architecture_inward_dependency, packages_module_tori_valley_doc_glossary_host, packages_module_tori_valley_doc_reference_hosted_module_exports [INFERRED 0.85]
- **Labels as the event bus between LLM routines and deterministic Actions** — label_queued, label_ready, label_in_progress, label_needs_review, label_review_pass, label_needs_fix, label_auto, label_needs_human, _github_workflows_requeue_lost_events_requeue, _github_workflows_review_status_sync_sync, _github_workflows_auto_merge_sync_sync, _github_workflows_needs_review_label_label [EXTRACTED 1.00]
- **R1→R6 automation routine chain** — doc_technical_automation_plan_r1, doc_technical_automation_plan_r2, doc_technical_automation_plan_r3, doc_technical_automation_plan_r4, doc_technical_automation_plan_r5, doc_technical_automation_plan_r6, doc_technical_automation_plan [EXTRACTED 1.00]
- **CI quality gate on every PR** — _github_workflows_ci_lint, _github_workflows_ci_test, _github_workflows_ci_build, _github_workflows_ci_e2e, _github_workflows_ci_visual, _github_workflows_ci_doc_links, _github_workflows_ci_design_tokens, _github_workflows_ci_lighthouse [EXTRACTED 1.00]
- **Kotlin Legacy Hexagon: primary adapters → pure domain → localStorage adapter** — legacy_1ksabord_kotlin_kotlin_readme_adaptateurs_primaires, legacy_1ksabord_kotlin_kotlin_readme_domaine_hexagone, legacy_1ksabord_kotlin_kotlin_readme_persistence_adaptateur_secondaire, legacy_1ksabord_kotlin_readme_hexagonal_ddd [EXTRACTED 1.00]
- **Reworked Score Entry Flow: standings grid → round sheet → wrapping history** — ds_temp_design_handoff_scoreo_ds_readme_standings_grid, ds_temp_design_handoff_scoreo_ds_readme_round_entry_sheet, ds_temp_design_handoff_scoreo_ds_readme_round_history_cards, ds_temp_design_handoff_scoreo_ds_scoreo_screens_dc_score_entry_screen, apps_scoreo_src_ui_scoredetail_scoredetailscreen_scoredetailscreen [EXTRACTED 1.00]
- **Ludo DS Theming Stack: Catppuccin flavors + swappable accent + semantic tokens consumed by components** — ds_temp_design_handoff_scoreo_ds__ds_ludo_design_system_3f75603b_6f97_4099_a2bd_4112913e630a_readme_catppuccin_flavors, ds_temp_design_handoff_scoreo_ds__ds_ludo_design_system_3f75603b_6f97_4099_a2bd_4112913e630a_readme_swappable_accent, ds_temp_design_handoff_scoreo_ds__ds_ludo_design_system_3f75603b_6f97_4099_a2bd_4112913e630a_readme_semantic_token_layer, ds_temp_design_handoff_scoreo_ds_readme_semantic_css_root_scope_caveat, apps_scoreo_index_theme_color_catppuccin_mauve [EXTRACTED 1.00]
- **Les trois variantes de l'objectif Bambou (A, B, C)** — packages_module_tori_valley_doc_resources_objectif_cards_bambou_a_bambou_a, packages_module_tori_valley_doc_resources_objectif_cards_bambou_b_bambou_b, packages_module_tori_valley_doc_resources_objectif_cards_bambou_c_bambou_c [EXTRACTED 1.00]
- **Les trois variantes de l'objectif Cerisier (A, B, C)** — packages_module_tori_valley_doc_resources_objectif_cards_cerisier_a_cerisier_a, packages_module_tori_valley_doc_resources_objectif_cards_cerisier_b_cerisier_b, packages_module_tori_valley_doc_resources_objectif_cards_cerisier_c_cerisier_c [EXTRACTED 1.00]
- **Objectifs marquant au comptage de tuiles individuelles** — packages_module_tori_valley_doc_resources_objectif_cards_bambou_c_diagonal_scoring, packages_module_tori_valley_doc_resources_objectif_cards_cerisier_a_per_tile_scoring, packages_module_tori_valley_doc_resources_objectif_cards_cerisier_c_village_multiplier [INFERRED 0.75]
- **Les trois variantes de la carte Objectif Eau** — packages_module_tori_valley_doc_resources_objectif_cards_eau_a_eau_a, packages_module_tori_valley_doc_resources_objectif_cards_eau_b_eau_b, packages_module_tori_valley_doc_resources_objectif_cards_eau_c_eau_c [EXTRACTED 1.00]
- **Les trois variantes de la carte Objectif Montagne** — packages_module_tori_valley_doc_resources_objectif_cards_montagne_a_montagne_a, packages_module_tori_valley_doc_resources_objectif_cards_montagne_b_montagne_b, packages_module_tori_valley_doc_resources_objectif_cards_montagne_c_montagne_c [EXTRACTED 1.00]
- **Mécanique commune : score par groupe de tuiles adjacentes** — packages_module_tori_valley_doc_resources_objectif_cards_eau_a_score_plus_grand_groupe_eau, packages_module_tori_valley_doc_resources_objectif_cards_eau_c_score_par_groupe_eau, packages_module_tori_valley_doc_resources_objectif_cards_montagne_b_score_groupe_deux_tuiles_montagne [INFERRED 0.85]
- **Les trois variantes A/B/C de la carte Objectif Village** — packages_module_tori_valley_doc_resources_objectif_cards_village_a_village_a, packages_module_tori_valley_doc_resources_objectif_cards_village_b_village_b, packages_module_tori_valley_doc_resources_objectif_cards_village_c_village_c [EXTRACTED 1.00]
- **Conditions de score de la famille Village** — packages_module_tori_valley_doc_resources_objectif_cards_village_a_three_points_per_village_tile, packages_module_tori_valley_doc_resources_objectif_cards_village_a_neighbour_bonus_four_per_lower_board, packages_module_tori_valley_doc_resources_objectif_cards_village_b_four_points_per_tile_of_largest_group, packages_module_tori_valley_doc_resources_objectif_cards_village_c_two_points_per_distinct_adjacent_type [INFERRED 0.75]
- **Mécaniques résumées par la carte de référence Torī** — packages_module_tori_valley_doc_resources_objectif_cards_tori_reference_tori_reference, packages_module_tori_valley_doc_resources_objectif_cards_tori_reference_distinct_colour_series_table, packages_module_tori_valley_doc_resources_objectif_cards_tori_reference_torii_colour_iconography, packages_module_tori_valley_doc_resources_objectif_cards_tori_reference_multiple_series_allowed [EXTRACTED 1.00]
- **The five baselines that together pin the 1000 Sabords screen state machine** — apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_desktop_linux_screenshot, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_manual_desktop_linux_screenshot, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_in_progress_desktop_linux_screenshot, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_in_progress_dark_desktop_linux_screenshot, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_finished_desktop_linux_screenshot [EXTRACTED 1.00]
- **Shell shared by every playing state: scoreboard, turn banner, tab switcher, match actions** — apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_desktop_linux_component_scoreboard_table, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_desktop_linux_component_turn_banner, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_desktop_linux_component_tab_switcher, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_desktop_linux_component_match_actions [EXTRACTED 1.00]
- **Two interchangeable scoring paths for one turn: dice calculator vs quick entry** — apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_desktop_linux_component_dice_counter_grid, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_desktop_linux_component_card_select, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_manual_desktop_linux_component_score_shortcut_chips, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_manual_desktop_linux_component_score_input [INFERRED 0.85]
- **The five phone baselines that together pin 1000 Sabords' responsive behaviour** — apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_phone_linux_image, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_in_progress_phone_linux_image, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_in_progress_dark_phone_linux_image, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_manual_phone_linux_image, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_finished_phone_linux_image, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_phone_stacked_layout [EXTRACTED 1.00]
- **Playing screen: scoreboard plus the two entry tabs it switches between** — apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_state, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_manual_state, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_in_progress_state, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_tab_switcher, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_scoreboard_region [EXTRACTED 1.00]
- **Module screen and reducer implement every photographed UI state** — packages_module_mille_sabords_src_ui_module_millesabordsmodulescreen_millesabordsmodulescreen, packages_module_mille_sabords_src_ui_module_millesabordsmodulereducer_millesabordsmodulereducer, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_calc_empty_state, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_in_progress_state, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_manual_state, apps_scoreo_tests_visual_millesabordsmodule_visual_spec_ts_snapshots_sabords_finished_state [INFERRED 0.85]
- **Baselines pinning the Torī Valley module's two-step state machine** — apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_setup_default_desktop_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_setup_prefilled_desktop_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_create_desktop_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_edit_desktop_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_edit_dark_desktop_linux_screenshot [EXTRACTED 1.00]
- **Controls that make up one player's Torī Valley scoring card** — apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_create_desktop_linux_component_player_total_heading, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_create_desktop_linux_component_torii_colour_counters, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_create_desktop_linux_component_objectif_landscape_entry, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_create_desktop_linux_component_village_manual_total, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_create_desktop_linux_component_parchemin_select [EXTRACTED 1.00]
- **Controls of the Objectif card dealing step** — apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_setup_default_desktop_linux_component_objectif_card_variant_radios, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_setup_default_desktop_linux_component_torii_always_in_play_row, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_setup_default_desktop_linux_component_setup_footer_actions [EXTRACTED 1.00]
- **Torī card-dealing step pinned on phone: default and pre-filled** — apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_setup_default_phone_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_setup_prefilled_phone_linux_screenshot, packages_module_tori_valley_src_ui_matchsetup_matchsetupscreen_matchsetupscreen [EXTRACTED 1.00]
- **Torī scoring screen pinned on phone: create, edit, edit dark** — apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_create_phone_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_edit_phone_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_edit_dark_phone_linux_screenshot, packages_module_tori_valley_src_ui_scoredetail_scoredetailscreen_scoredetailscreen [EXTRACTED 1.00]
- **Phone viewport responsive behaviour of the Torī module** — apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_setup_default_phone_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_setup_prefilled_phone_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_create_phone_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_edit_phone_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_snapshots_tori_score_edit_dark_phone_linux_screenshot, apps_scoreo_tests_visual_torimodule_visual_spec_ts_phone_single_column_stack [INFERRED 0.85]
- **Four PWA Icons Sharing One S-Monogram Silhouette, Two Palettes** — apps_scoreo_public_icon_192_scoreo_icon_192, apps_scoreo_public_icon_512_scoreo_icon_512, legacy_1ksabord_kotlin_kotlin_src_jsmain_resources_icon_192_legacy_sabords_icon_192, legacy_1ksabord_kotlin_kotlin_src_jsmain_resources_icon_512_legacy_sabords_icon_512, apps_scoreo_public_icon_192_shared_monogram_form_language [INFERRED 0.75]

## Communities (175 total, 27 thin omitted)

### Community 0 - "1000 Sabords Kotlin Score Tests"
Cohesion: 0.07
Nodes (6): LancerDes, calculerScore(), finaliser(), ReglesTest, ScoreCalculateurTest, ResultatScore

### Community 1 - "Game Type Model & Repository"
Cohesion: 0.06
Nodes (25): BindModuleUseCase, manifest, setup(), buildUseCase(), gt1, gt2, buildGameType(), buildUseCase() (+17 more)

### Community 2 - "Game Type Screen"
Cohesion: 0.10
Nodes (36): AddGameTypeOptions, AddGameTypeUseCase, ArchiveGameTypeUseCase, FindGameTypeByIdUseCase, UpdateGameTypeUseCase, TieBreakRule, tieBreakRuleLabel(), TieBreakRuleSchema (+28 more)

### Community 3 - "Module Result & Export"
Cohesion: 0.07
Nodes (30): assertRoundsSumToRanking(), Annuler le coup (rejeu du journal), PartieTerminee, construireDetails(), construireEnveloppeExport(), EXPORT_GAME_NAME, EXPORT_VERSION, ExportClassement (+22 more)

### Community 4 - "Tori Valley Documentation"
Cohesion: 0.07
Nodes (48): Torī Valley Package Guidance (CLAUDE.md), Torī Valley Feature Overview, Objectif Cards Transcription, Card-declared input counts, Neighbour-dependent cards stay manual, Card scans kept local, never committed, Torī Valley Scoring Rules, Guided Objectif entry (+40 more)

### Community 5 - "Shared Ludo UI Components"
Cohesion: 0.09
Nodes (26): AddPlayerFieldProps, DeletePlayerModalProps, RenamePlayerModalProps, SecondaryScoreDialogProps, ListContainer(), ListItemRow(), ListItemRowProps, ButtonSize (+18 more)

### Community 6 - "Tori Valley Package Manifest"
Cohesion: 0.04
Nodes (45): dependencies, i18next, lucide-react, react, react-dom, react-i18next, @scoreboards/module-api, @scoreboards/shared-domain (+37 more)

### Community 7 - "Hash Routing & Navigation"
Cohesion: 0.08
Nodes (35): ScoreDetailRouteProps, Player, ModuleScoreRouteProps, parseHash(), screenToHash(), GAMES_SCREEN, HALL_OF_FAME_SCREEN, HISTORY_SCREEN (+27 more)

### Community 8 - "Stats & Head-to-Head Screen"
Cohesion: 0.12
Nodes (22): App(), BurgerItemProps, GetGameTypesUseCase, GetHeadToHeadUseCase, HeadToHeadEntry, HeadToHeadTally, PlayerDetail, PlayerTrophyBadge (+14 more)

### Community 9 - "Player List & Home Screen"
Cohesion: 0.14
Nodes (27): GetPlayerStatsUseCase, PlayerStats, AddPlayerField(), DeletePlayerModal(), GameSelectModalHandle, HomeScreen(), PlayerActionModals(), PlayerActionModalsProps (+19 more)

### Community 10 - "Root Workspace Tooling"
Cohesion: 0.05
Nodes (37): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+29 more)

### Community 11 - "Player Store & Round Entry"
Cohesion: 0.08
Nodes (15): buildUseCase(), InMemoryPlayerRepository, CleanupConfirmModal(), CleanupConfirmModalProps, LoadedPlayers, ManualSelectionDialogProps, RoundEntrySheet(), RoundEntrySheetProps (+7 more)

### Community 12 - "Hall of Fame Trophies"
Cohesion: 0.10
Nodes (24): groupTrophiesByPlayer(), TROPHY_BADGE_ORDER, Trophy, TrophyHolder, TrophyHolderDetail, TrophyPeriod, HallOfFameAction, hallOfFameReducer() (+16 more)

### Community 13 - "Kotlin Legacy Action Dispatch"
Cohesion: 0.14
Nodes (35): HTMLElement, afficherDetailPartie(), afficherHistorique(), afficherModalExport(), afficherStats(), ajouterJoueur(), ajouterJoueurParNom(), annulerDernier() (+27 more)

### Community 14 - "Auto-Sync Coordination"
Cohesion: 0.09
Nodes (12): AppShell(), screenTitle(), AutoSyncCoordinator, ConnectivityChecker, DataChangeNotifier, BrowserConnectivityChecker, InMemoryConnectivityChecker, useAutoSync() (+4 more)

### Community 15 - "Match History Screen"
Cohesion: 0.12
Nodes (23): DeleteMatchUseCase, GetMatchesUseCase, buildRoundBreakdown(), buildScoreSummary(), deleteMatch(), formatMatchDate(), HistoryAction, historyReducer() (+15 more)

### Community 16 - "Kotlin Legacy State Tests"
Cohesion: 0.09
Nodes (3): CoupIleCranes, CoupManuel, EtatTest

### Community 17 - "1000 Sabords Package Manifest"
Cohesion: 0.06
Nodes (33): dependencies, react, react-dom, @scoreboards/module-api, zod, devDependencies, jsdom, @testing-library/react (+25 more)

### Community 18 - "Tori Match Model & Scoring"
Cohesion: 0.10
Nodes (29): Torī reference card (the 16th card), Greedy Torī series grouping, Torī (jeton porte coloré), Barème des séries de Torī (0/2/4/7/10), emptyObjectifPoints(), emptyPlayerResult(), Match, matchWinners() (+21 more)

### Community 19 - "Trophies & Elo Calculator"
Cohesion: 0.12
Nodes (19): EloCalculator, EloSnapshot, bestRatioHolders(), compareMatchesChronologically(), eloPeakHolders(), gameRecordHolders(), isSameLocalMonth(), kingOfTheHillHolders() (+11 more)

### Community 20 - "End-to-End Behaviour Specs"
Cohesion: 0.20
Nodes (16): archiveGameType(), createGameType(), CreateGameTypeOptions, deleteMatchFromHistory(), editMatchScore(), openMatchFromHistory(), enterRoundScore(), finishMatch() (+8 more)

### Community 21 - "Visual Test Harness"
Cohesion: 0.10
Nodes (23): seed, expectScreenshot(), Flavor, KEYS, openApp(), routes, SeededState, MATCH_ONE_ID (+15 more)

### Community 22 - "Module API Host Contract"
Cohesion: 0.12
Nodes (9): ModuleHostAdapter, result, ModuleHost, ModuleMatchResult, ModulePlayer, ModuleRankingEntry, ModuleRound, ScoringModuleScreenProps (+1 more)

### Community 23 - "Host Score Detail Reducer"
Cohesion: 0.18
Nodes (29): ManualSelectionDialog(), combineDateWithTimeOfDay(), computeStandings(), computeTotals(), countRoundsPlayed(), hasUnsavedScores(), isFutureDate(), isValidDateOnly() (+21 more)

### Community 24 - "Tori Score Detail Reducer"
Cohesion: 0.11
Nodes (25): Bonus +1 par tuile du groupe touchant les bords haut et bas du tableau, Carte Objectif Eau A, 3 points par tuile Eau d'un de vos plus grands groupes, Carte Objectif Eau B, 4 points par tuile Eau isolée touchant le bord du plateau, Carte Objectif Montagne A, 3 points par tuile Montagne seule dans sa ligne, sinon 0, +1 point par tuile Eau adjacente à une tuile Montagne (+17 more)

### Community 25 - "Score Detail Test Harness"
Cohesion: 0.14
Nodes (3): saveDraft(), scoreDetailReducer(), Harness

### Community 26 - "1000 Sabords Phone Baselines"
Cohesion: 0.10
Nodes (29): Fortune card select (Carte pochée), Dice-count guard banner (0 / 8 dés), Six dice counter rows with minus/value/plus steppers, Game action buttons (Annuler le coup, Terminer la partie, Quitter, Abandonner), Host chrome around the module (back arrow, screen title, menu), Module header: 1000 Sabords title with round badge, Screenshot: 1000 Sabords empty calculator (phone), Phone adaptation: single-column stack, full-width controls, no side panel (+21 more)

### Community 27 - "1000 Sabords Calculator Screen"
Cohesion: 0.13
Nodes (21): Gradle Kotlin/JS Build Targets (jsNodeTest, jsBrowserDistribution), Kotlin Test Suite (91 domain + 13 JS tests) — port oracle, MilleSabordsState, calculerScore(), EntreeSerie, finaliser(), lancerDes, totalDes() (+13 more)

### Community 28 - "Match Model & Repository"
Cohesion: 0.10
Nodes (6): Match, MatchRepository, MatchDisplay, Round Reconstruction in Edit Mode, Migration — Match.moduleData (#329), Migration — Match.rounds (#249)

### Community 29 - "Match Import Flow"
Cohesion: 0.15
Nodes (21): ImportGame, ImportPreview, ImportRankingEntry, ImportResult, ImportRoot, ImportRound, ImportRoundScore, ImportVersions (+13 more)

### Community 30 - "Tori Phone Baselines"
Cohesion: 0.10
Nodes (26): Concept: prefers-color-scheme dark palette override of the module stylesheet, Component: Scoreo host top bar (back arrow, "Score Detail"/"Edit match" title, menu), Component: A/B/C variant radio group per landscape, Component: Objectif cards panel with one row per landscape, Component: Objectif landscape entry block (per-card inputs plus "Enter the total by hand" toggle), Component: Parchemin select at the foot of each player panel, Responsive adaptation: phone single-column stack of the Tori screens, Component: Pinceau holder (+2 VP) select at the top of the scoring screen (+18 more)

### Community 31 - "Tori Landscape & Match Setup"
Cohesion: 0.15
Nodes (14): Screenshot: Tori setup, pre-filled from stored match (phone), UI state: Objectif card dealing, pre-filled from stored moduleData, defaultObjectifCardSelection(), LANDSCAPE_TYPES, OBJECTIF_VARIANTS, ObjectifPoints, MatchSetupAction, matchSetupReducer() (+6 more)

### Community 32 - "1000 Sabords Domain Docs"
Cohesion: 0.10
Nodes (26): Diamants et Or (100 pts l'unité), Pirate magique (9 identiques, victoire immédiate), Seuil des 6000 pts et dernier tour, Magie pirate (9 symboles identiques), Seuil des 6000 points et dernière manche, Oracle Kotlin legacy/1ksabord-kotlin, Test différentiel golden (preuve du portage), CalculateurScore — calculerScore() (+18 more)

### Community 33 - "1000 Sabords Module Reducer"
Cohesion: 0.17
Nodes (22): Les actions du réducteur, Les dérivations (rien n'est stocké), Le réducteur MVI de 1000 Sabords, Deux écrans, pas deux routes, L'écran du module (src/ui/module/), avecValeur(), LANCER_DES_VIDE, enregistrerCoup() (+14 more)

### Community 34 - "CI & Site Quality Guards"
Cohesion: 0.09
Nodes (21): Skill: site-quality, Dependabot npm daily updates, CI job: build (typecheck + build), Workflow: CI, CI job: design-tokens (+ module styles), CI job: doc-links, CI job: e2e (Playwright), CI job: lighthouse (+13 more)

### Community 35 - "In-Memory Test Doubles"
Cohesion: 0.14
Nodes (4): ThrowingSaveAllMatchRepository, DataChangeListener, InMemoryDataChangeNotifier, InMemoryMatchRepository

### Community 36 - "LocalStorage Match Adapter"
Cohesion: 0.16
Nodes (11): LocalStorageMatchRepository, MatchesSchema, readAll(), writeAll(), migrateMatches(), RawRecord, tryParseIsoDateToEpochMs(), Cross-Migration Test (+3 more)

### Community 37 - "Theme Manager & Context"
Cohesion: 0.19
Nodes (16): ThemePanel(), ThemeContext, ThemeProvider(), ThemeState, Accent, ACCENTS, applyTheme(), Flavor (+8 more)

### Community 38 - "Google Drive Sync Adapter"
Cohesion: 0.15
Nodes (10): GoogleDriveSyncAdapter, gisCalls, clearSyncConfig(), defaultConfig(), loadSyncConfig(), saveSyncConfig(), SyncConfig, SyncConfigSchema (+2 more)

### Community 39 - "Tori TypeScript Config"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleDetection, moduleResolution, noEmit (+15 more)

### Community 40 - "Match Creation Dependencies"
Cohesion: 0.10
Nodes (16): ScoreDetailRoute(), CreateMatchUseCase, DomainError, Result<T, E>, buildInitialState(), freshState(), reconstructRounds(), resetState() (+8 more)

### Community 41 - "Player Repository Port"
Cohesion: 0.20
Nodes (7): CleanupInactivePlayersUseCase, DeletePlayerUseCase, GetPlayersUseCase, GetTrophiesUseCase, PlayerRepository, HomeScreenProps, Trophy Catalog (A1–F3)

### Community 42 - "Match Score Model"
Cohesion: 0.16
Nodes (8): CreateMatchOptions, calculator, RankingEntry, RankingToMatchInput, computeWinners(), isTieBreakIndeterminate(), MatchModuleData, PlayerScore

### Community 43 - "Result Type & Sync Errors"
Cohesion: 0.29
Nodes (6): SyncException, DriveClient, MockGoogleDriveClient, err(), ok(), Result

### Community 44 - "Google Drive Client"
Cohesion: 0.18
Nodes (6): FileInfo, FileResponse, FilesResponse, GoogleDriveClient, isSyncException(), sleep()

### Community 45 - "Tori Desktop Baselines"
Cohesion: 0.14
Nodes (22): Component: Scoreo host top bar around the module (back arrow, title, menu), Component: Objectif landscape entry (card header with VP, criterion inputs, "Enter the total by hand" toggle), Component: Parchemin select per player (None / 3 VP / 5 VP), Component: Pinceau holder select (+2 VP), one per match, Component: per-player heading carrying the running total ("Akira — 0 VP"), Component: scoring footer with Cancel and Save match buttons, Component: Torī colour counters (Green, Red, Blue, Yellow, Purple chips + number inputs), Component: Village card, manual-only total (scored against neighbouring boards) (+14 more)

### Community 46 - "Kotlin Legacy Persistence"
Cohesion: 0.14
Nodes (17): compresserLZW(), decompresserLZW(), construireEnveloppeExport(), effacerHistoriqueParties(), ExportClassement, exporterHistorique(), exporterHistoriqueJson(), ExportPartie (+9 more)

### Community 47 - "1000 Sabords Module Docs"
Cohesion: 0.09
Nodes (22): Écran de fin de partie, Guide d'utilisation 1000 Sabords, Onglet Calculateur, Reprise après fermeture, Tableau de bord (une ligne par manche), Documentation fonctionnelle 1000 Sabords, Règles du jeu 1000 Sabords, Documentation 1000 Sabords (+14 more)

### Community 48 - "Review & Fix Automation Skills"
Cohesion: 0.18
Nodes (21): Skill: address-feedback, Skill: pr-review, Skill: weekly-report, Workflow: Queue PR for Review, Workflow: Requeue Lost Routine Events (hourly sweeper), Workflow: Review Status Sync (claude/review commit status), 3-attempt cap on autonomous fixes (attempt-1/2/3), Claim the run (clear the queue label first) (+13 more)

### Community 49 - "Merged PR Sweeper Scripts"
Cohesion: 0.15
Nodes (15): Workflow: Auto-Merge Sync, Workflow: Close Linked Issues, Label: auto, closeIssue(), CLOSING_REF_REGEX, extractClosedIssueNumbers(), headers, main() (+7 more)

### Community 50 - "App Runtime Dependencies"
Cohesion: 0.10
Nodes (21): dependencies, i18next, lucide-react, react, react-dom, react-i18next, @scoreboards/module-api, @scoreboards/module-mille-sabords (+13 more)

### Community 51 - "Test Tooling Dependencies"
Cohesion: 0.10
Nodes (21): devDependencies, jsdom, @playwright/test, @testing-library/jest-dom, @testing-library/react, @types/node, @types/react, @types/react-dom (+13 more)

### Community 52 - "Merge Game Types"
Cohesion: 0.14
Nodes (6): MergeGameTypesPreview, MergeGameTypesUseCase, sameScoringRules(), GameTypeRepository, MergeGameTypesModal(), MergeGameTypesModalProps

### Community 53 - "Module Registry & Manifests"
Cohesion: 0.18
Nodes (10): findManifest(), findManifestByGameName(), MODULE_MANIFESTS, ScoringModuleManifest, ModuleMatchEdit, ScoringModule, milleSabordsManifest, milleSabordsModule (+2 more)

### Community 54 - "Sync Screen"
Cohesion: 0.25
Nodes (15): SyncConflict, SyncResult, errorMessage(), runAutoSync(), submitLogin(), submitLogout(), submitResolveConflict(), submitRestoreSession() (+7 more)

### Community 55 - "LocalStorage Player & Game Adapters"
Cohesion: 0.21
Nodes (7): LocalStorageGameTypeRepository, readAll(), writeAll(), LocalStoragePlayerRepository, PlayersSchema, readAll(), writeAll()

### Community 56 - "1000 Sabords Desktop Baselines"
Cohesion: 0.13
Nodes (21): Component: drawn-card select (Carte piochee, default '— Aucune carte —'), Component: dice-count guard banner '0 / 8 des' gating score validation, Component: six dice-face counters (Crane, Diamant, Or, Singe, Perroquet, Sabre) with minus/plus steppers, Component: match action stack (Annuler le coup, Terminer la partie, Quitter, Abandonner), Component: scoreboard table (Tableau de bord) with per-round rows and Total, Component: Calculateur / Saisie rapide tab switcher, Component: turn banner (AU TOUR DE + player) and round badge (Tour N), Baseline: 1000 Sabords, empty calculator tab (desktop) (+13 more)

### Community 57 - "Kotlin Legacy Persistence Tests"
Cohesion: 0.24
Nodes (5): ExportSabords, genererUuid(), construireExportJson(), PartieTerminee, PersistenceTest

### Community 58 - "Module API Package Manifest"
Cohesion: 0.10
Nodes (20): devDependencies, react, @types/react, typescript, vitest, exports, react, @types/react (+12 more)

### Community 59 - "1000 Sabords Domain Constants"
Cohesion: 0.11
Nodes (20): Les 10 cartes du tirage, Les six faces de dés (crâne, diamant, or, singe, perroquet, sabre), Séries (3+ dés identiques), Carte Île au Trésor (dés réservés), 35 cartes Pirate, Combinaisons de dés identiques (100 / 200 / 500 / 1000 / 2000 / 4000), 8 dés Corsaires, Gestion des cartes (effet appliqué avant le calcul) (+12 more)

### Community 60 - "Tori Module Result Bridge"
Cohesion: 0.17
Nodes (15): buildModuleRanking(), buildModuleRounds(), MODULE_DATA_VERSION, SCORE_CATEGORIES, alice, bob, match(), toModuleMatchResult() (+7 more)

### Community 61 - "Google Auth Service"
Cohesion: 0.12
Nodes (11): GIS oauth2 Namespace Mapping Bug (missing `accounts` level), GoogleIdentityService.kt (Kotlin-era OAuth adapter), Content-Security-Policy meta (issue #51 defense-in-depth), Deferred Google Identity Services Script Tag, registerSw.js Service Worker Bootstrap (external, keeps script-src inline-free), GoogleAuthService, loginAsync(), Silent GIS Session Restore (+3 more)

### Community 62 - "Skull Island & Quick Entry"
Cohesion: 0.11
Nodes (19): Groupe Île de la Tête de Mort rapide, Onglet Saisie rapide, Buste (3 crânes ou plus), Carte Sorcière (witch, désactive le buste), Coffre plein (+500 pts), Combat naval (2, 3 ou 4 sabres), Dé non scorant vs dé scorant, Île de la Tête de Mort (+11 more)

### Community 63 - "Repo Conventions & Skills"
Cohesion: 0.20
Nodes (19): Skill: implement-task, Skill: new-scoring-module, Skill: project-conventions, Copilot Instructions — Scoreo, CI job: visual regression (pinned Playwright container), Workflow: Kotlin legacy (oracle test suite), Pre-commit Checklist, CLAUDE.md — repo guide for Claude Code (+11 more)

### Community 64 - "PWA Manifest & Icons"
Cohesion: 0.15
Nodes (18): Scoreo PWA Icon 192 (purple rounded square, white lowercase s), Shared Monogram Form Language: Rounded Square, Bold Lowercase S, Scoreo Brand Identity: Mauve and White Monogram, Scoreo PWA Icon 512 (purple rounded square, white lowercase s), background_color, description, display, icons (+10 more)

### Community 65 - "GitHub Project Sync Script"
Cohesion: 0.22
Nodes (15): Workflow: Project Status Sync, Priority labels P0…P3, connectionName(), desiredStatus(), getItem(), getProjectMeta(), graphql(), graphqlFieldName() (+7 more)

### Community 66 - "Import Matches Use Case"
Cohesion: 0.23
Nodes (7): asArray(), asRecord(), ImportMatchesUseCase, parseIntLike(), rankingToMatch(), base, ImportScreenProps

### Community 67 - "Service Container Wiring"
Cohesion: 0.20
Nodes (7): CloudSyncRepository, ModuleDraftRepository, OAUTH_CLIENT_ID, keyFor(), LocalStorageModuleDraftRepository, CreateServicesOptions, Services

### Community 68 - "Match Draft Repository"
Cohesion: 0.22
Nodes (5): MatchDraft, MatchDraftRepository, LocalStorageMatchDraftRepository, InMemoryMatchDraftRepository, Migration — Match Draft Auto-Save

### Community 69 - "Localization & Language Picker"
Cohesion: 0.17
Nodes (13): detectInitialLanguage(), isSupportedLanguage(), LANG_STORAGE_KEY, SUPPORTED_LANGUAGES, SupportedLanguage, gameType(), match(), player() (+5 more)

### Community 70 - "Bamboo & Cherry Objectif Cards"
Cohesion: 0.16
Nodes (18): Bambou A, Un groupe de plus de 2 tuiles n'est pas pris en compte, Score par palier selon le nombre de groupes de 2 tuiles bambou (1/2/3/4/5 groupes = 4/9/15/22/30 points), Bambou B, 4 points par groupe de 2 tuiles, 10 par groupe de 3, 16 par groupe de 4 (formes bambou indiquees), Un groupe doit strictement respecter les formes indiquees, Bambou C, +1 point si la tuile est dans un des quatre coins (+10 more)

### Community 71 - "Tori Node TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch (+9 more)

### Community 72 - "Shared Domain Package Manifest"
Cohesion: 0.11
Nodes (17): dependencies, zod, devDependencies, typescript, vitest, exports, typescript, vitest (+9 more)

### Community 73 - "Sync Use Case"
Cohesion: 0.23
Nodes (5): now(), SyncUseCase, SyncScreenProps, Import Merges and Never Deletes, Sync Conflict Resolution

### Community 74 - "Merge Players"
Cohesion: 0.19
Nodes (7): countMembersInMatch(), MergePlayersPreview, MergePlayersUseCase, referencesPlayer(), remapScores(), MergePlayersModal(), MergePlayersModalProps

### Community 75 - "Zod Schemas & Serialization Contract"
Cohesion: 0.21
Nodes (6): MatchModuleDataSchema, MatchSchema, MatchDraftSchema, PlayerScoreSchema, SyncFileSchema, PlayerSchema

### Community 76 - "Kotlin Legacy Domain Models"
Cohesion: 0.18
Nodes (11): CoupCalculateur, CoupIleCranes, CoupManuel, EvenementCoup, PartieTerminee, ResultatJoueur, ResultatScore, archiverPartieTerminee() (+3 more)

### Community 77 - "Village, Mountain & Tori Cards"
Cohesion: 0.15
Nodes (17): Bonus +10 si l'un de vos groupes (texte coupé, comparaison aux tableaux voisins), Carte Objectif Eau C, 3 points par groupe d'au moins 1 tuile Eau, Carte Objectif Montagne B, 6 points par groupe d'au moins 2 tuiles Montagne, Table de score des séries de Torī de couleurs différentes (1→0, 2→2, 3→4, 4→7, 5→10), Plusieurs séries de Torī peuvent être marquées, Carte de référence Torī (+9 more)

### Community 78 - "Objectif Card Definitions"
Cohesion: 0.17
Nodes (12): LandscapeType, ObjectifVariant, BAMBOO_A_TABLE, FieldSpec, ObjectifCardDefinition, ObjectifCardInputs, ObjectifInputField, ObjectifInputsByLandscape (+4 more)

### Community 79 - "Services Context & DI Root"
Cohesion: 0.17
Nodes (14): createDefaultCloudSyncRepository(), createServices(), ServicesContext, ServicesProvider(), Probe(), useServices(), Google Drive Sync, Adapter (+6 more)

### Community 80 - "1000 Sabords Hexagon Concepts"
Cohesion: 0.13
Nodes (16): calculerScore(dés, carte) — pure domain service, Card ID Vocabulary (none, captain, diamond, gold, animals, witch, sea2/3/4, skull1/2), EtatTour — top-level UI turn state, Magic Pirate Instant Win (9 diamonds or 9 gold), Singleton `val partie` — mutable top-level state, Primary Adapters (fr.ksabord.ui web, GameViewModel Android), Dormant Android Compose Target, fr.ksabord.domaine — pure hexagon core (+8 more)

### Community 81 - "Tori Score Detail Types"
Cohesion: 0.22
Nodes (10): DomainError, NotFoundError, ValidationError, ObjectifCardSelection, ParcheminValue, PlayerResult, ModuleMatchInput, ScoreDetailScreenProps (+2 more)

### Community 82 - "Match Update & Edit Harness"
Cohesion: 0.20
Nodes (9): UpdateMatchUseCase, alice, bob, buildEditHarness(), buildHarness(), gameType(), ScoreDetailScreenProps, ScoreDetailState (+1 more)

### Community 83 - "Tori i18n Namespace"
Cohesion: 0.20
Nodes (10): tori-valley i18next namespace, Strictly inward dependency direction, Module stylesheet scoping and tv- prefix, Visual regression suite lives in the host, registerTranslations(), SUPPORTED_LANGUAGES, SupportedLanguage, TORI_VALLEY_NS (+2 more)

### Community 84 - "Player Use Cases & Validation"
Cohesion: 0.26
Nodes (5): AddPlayerUseCase, RenamePlayerUseCase, NotFoundError, ValidationError, Players Feature

### Community 85 - "App Bootstrap & Key Migration"
Cohesion: 0.16
Nodes (10): migrateMilleSabordsKeys(), MILLE_SABORDS_KEYS, container, themeManager, Theme Feature, Accent, Flavor, localStorage Key Map (+2 more)

### Community 86 - "Module Host Contract Concepts"
Cohesion: 0.15
Nodes (14): MODULES, ModuleScore Route #/module/:moduleId/:gameType/:players, Import JSON Format v1.1, Differential Golden Harness, pnpm Workspace Layout, assertRoundsSumToRanking, ModuleHost, ModuleHostAdapter (+6 more)

### Community 87 - "Scoreo TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, noUncheckedSideEffectImports, resolveJsonModule, useDefineForClassFields, extends, include (+5 more)

### Community 88 - "Design System Bundle"
Cohesion: 0.18
Nodes (6): Button(), _extends(), Input(), Modal(), ScoreCounterApp(), variantStyle()

### Community 90 - "Kotlin Legacy HTML Rendering"
Cohesion: 0.27
Nodes (13): boutonQR(), escHtml(), groupeQR(), iconeTheme(), EvenementCoup, PartieTerminee, renduCelluleCoup(), renduEcranConfig() (+5 more)

### Community 91 - "Base TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, allowImportingTsExtensions, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch, noUnusedLocals (+5 more)

### Community 92 - "Import Screen Tests"
Cohesion: 0.19
Nodes (9): emptyGamesJson, invalidJson, multiGameJson, v10Json, validJson, withDetailsJson, withMismatchedDetailsJson, withMultipleFailedDetailsJson (+1 more)

### Community 93 - "Cloud Sync Repository Port"
Cohesion: 0.26
Nodes (4): SyncData, SyncStatus, InMemoryCloudSyncRepository, notAuthenticated()

### Community 94 - "Scoreo Node TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, extends, include, ES2023, ../../tsconfig.base.json, vitest.config.ts, e2e (+4 more)

### Community 95 - "Design Token Guard Script"
Cohesion: 0.22
Nodes (11): DURATION_MS, DURATION_PROPS, findCssFiles(), findViolations(), main(), RADIUS_PX, SPACING_PROPS, SPACING_PX (+3 more)

### Community 96 - "Legacy PWA Manifest"
Cohesion: 0.17
Nodes (11): background_color, description, display, icons, lang, name, orientation, scope (+3 more)

### Community 97 - "1000 Sabords TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, lib, types, extends, include, DOM, ES2022 (+3 more)

### Community 98 - "Lost Event Requeue Script"
Cohesion: 0.36
Nodes (11): addLabel(), apiGet(), headers, labelNamesOf(), listOpenWithLabel(), main(), minutesSinceLabeled(), removeLabel() (+3 more)

### Community 99 - "Issue Grooming & Dependencies"
Cohesion: 0.27
Nodes (10): Skill: issue-to-spec, Workflow: Sync Issue Dependencies (blocked_by), Workflow: Unblock Issues, Label: queued, Label: ready, queued → ready one-at-a-time dispatcher, api(), extractBlockerNumbers() (+2 more)

### Community 100 - "Build Script Definitions"
Cohesion: 0.18
Nodes (11): scripts, build, dev, preview, test, test:e2e, test:visual, test:visual:container (+3 more)

### Community 101 - "Stats Screen Tests"
Cohesion: 0.33
Nodes (8): match(), seedMatches(), seedRivalry(), gameType(), match(), player(), renderStats(), renderStatsWithTrophies()

### Community 102 - "Implementation Pipeline Stages"
Cohesion: 0.20
Nodes (11): attempt-1/2/3 Anti-Loop Counter, Claim the Run, Dispatcher (dispatch-ready.mjs), Labels as the Event Bus, One Run = One Ticket, R1 — Grooming (issue-to-spec), R2 — Implementation (implement-task), R3 — Review (pr-review) (+3 more)

### Community 103 - "Ready Queue Dispatcher"
Cohesion: 0.31
Nodes (10): addLabel(), apiGet(), headers, labelNamesOf(), listOpenWithLabel(), main(), pickNextQueued(), PRIORITY_ORDER (+2 more)

### Community 104 - "Module Score Screen Host"
Cohesion: 0.33
Nodes (4): ModuleErrorBoundary, ModuleScoreScreen(), findModule(), resolveEditing()

### Community 105 - "Google Identity OAuth Client"
Cohesion: 0.22
Nodes (8): GisOAuth2, GisTokenClient, GisTokenClientConfig, GisTokenError, GisTokenResponse, LoginResult, UserInfoResponse, Window

### Community 106 - "Quick Score Shortcut Groups"
Cohesion: 0.22
Nodes (7): Component: quick-entry shortcut chips by category (Diamants, Pieces d'or, Series identiques, Coffre plein, Combat naval, Capitaine, Ile de la tete de mort), Quick-score button groups (Diamants, Pièces d'or, Séries identiques, Coffre plein, Combat naval, Capitaine, Île de la tête de mort), Les deux onglets produisent le même EvenementCoup, BoutonRapide, GroupeRapide, GROUPES_RAPIDES, INFOS_CARTE

### Community 107 - "Scoreo Design Canvas Artboards"
Cohesion: 0.22
Nodes (9): Design Reference, Not Production Code, Scoreo Screens Design Canvas, Games Artboards (manage / edit / detail), History Artboards (matches / delete match / empty), Home & Players Artboards (first launch / roster / select a game), Import Artboards (pick a file / preview / result), Stats Artboards (leaderboard / player detail / empty), Sync Artboards (disconnected / conflict / complete) (+1 more)

### Community 108 - "Module API TypeScript Config"
Cohesion: 0.22
Nodes (8): compilerOptions, lib, extends, include, DOM, ES2022, src, ../../tsconfig.base.json

### Community 109 - "1000 Sabords Draft Schemas"
Cohesion: 0.31
Nodes (8): MilleSabordsDraftSchema (le brouillon complet), LancerDesSchema, EvenementCoupSchema, DRAFT_VERSION, MilleSabordsDraft, MilleSabordsDraftSchema, MilleSabordsTab, Multiplicateur

### Community 110 - "Shared Domain TypeScript Config"
Cohesion: 0.22
Nodes (8): compilerOptions, lib, extends, include, DOM, ES2022, src, ../../tsconfig.base.json

### Community 111 - "Module Style Isolation Guard"
Cohesion: 0.47
Nodes (7): classNames(), findViolations(), hostClasses(), main(), moduleStylesheets(), selectors(), HOST

### Community 112 - "Issue Unblock Script"
Cohesion: 0.42
Nodes (8): addLabel(), apiGet(), BLOCKING_LABELS, getLabels(), headers, main(), removeLabel(), tryUnblock()

### Community 113 - "Catppuccin Semantic Tokens"
Cohesion: 0.32
Nodes (8): Static theme-color #8839ef (Catppuccin Latte / Mauve), Catppuccin Flavors (latte/frappe/macchiato/mocha via data-theme), Semantic Token Layer (--color-primary, --surface-card, --text-body), Independently Swappable Accent (data-accent, 14 hues, mauve default), Ludo DS Design Tokens (colors-*, semantic, typography, spacing, radius-shadow), semantic.css Only Maps Tokens on :root (element-scoped data-theme caveat), COULEURS_JOUEURS mirrored in CSS --c0..--c7, Legacy CSS Custom Properties (--bg, --surface, --primary, --text, --c0..)

### Community 114 - "Sync Snapshot Helpers"
Cohesion: 0.36
Nodes (7): formatDate(), isSameState(), sortedById(), stableStringify(), SyncOutcome, SyncSnapshot, toSnapshot()

### Community 115 - "Ludo Design System Handoff"
Cohesion: 0.25
Nodes (8): DS Button (primary/secondary/ghost/danger, icon-only stepper mode), Content Fundamentals (utilitarian voice, sentence case, no emoji), Ludo Design System, DS Modal (centered dialog with scrim), Screen → Repo File Map (remhiit/scoreo, branch main), Phone Frame Modal Containment (.device translateZ(0)), Scoreo × Ludo DS Design Handoff, .device Phone Artboard Frame

### Community 116 - "Legacy App Shell & Splash"
Cohesion: 0.29
Nodes (7): Scoreo PWA Head (manifest.json, icon-192, apple-mobile-web-app), Splash Loader (#splash), Single Click Delegate on document (data-action dispatch), escHtml() — HTML escaping for user-provided names, Full innerHTML Re-render (no virtual DOM), Legacy App Shell (#app + app.js), Legacy PWA Head (manifest, theme-color #e6a817, apple-touch-icon)

### Community 117 - "Service Worker Caching"
Cohesion: 0.38
Nodes (5): ASSETS, CACHE_PREFIX, cacheFirst(), networkFirst(), putInCache()

### Community 119 - "History Screen Tests"
Cohesion: 0.43
Nodes (4): gameType(), match(), player(), renderHistory()

### Community 120 - "Auto-Merge & Deployment Policy"
Cohesion: 0.29
Nodes (7): Content-Security-Policy Meta Tag, PWA Service Worker Caching Strategy, `auto` Merge Whitelist, R6 — Weekly Report (weekly-report), auto-merge-sync.yml, deploy.yml — GitHub Pages Deployment, Risk category Faible / Élevé on an issue spec

### Community 121 - "Score Entry Redesign Artboards"
Cohesion: 0.33
Nodes (7): DS Input (text + number with −/+ stepper), Native Number Spinner Suppression (.no-spin), Round Entry Bottom Sheet (.sheet), Wrapping Round History Cards (.hist-round / .hist-cells), Score Entry Rework (replaces the wide one-table layout), Standings Card Grid (.gs-grid / .gs-card), Score Entry Artboards (standings / round sheet / history / final decision / discard)

### Community 122 - "Kotlin Legacy Statistics"
Cohesion: 0.57
Nodes (6): renduModalStats(), calculerFaceAFace(), calculerStatsJoueurs(), calculerToutesPaires(), StatsFaceAFace, StatsJoueur

### Community 123 - "Legacy App & UI Kit Demos"
Cohesion: 0.33
Nodes (6): Score Counter UI Kit (flagship demo), DS Table (scoreboard grid, pinned totals row), deploy-pages.yml GitHub Pages Deployment, Hexagonal Architecture + DDD (Kotlin legacy), French Ubiquitous Language, 1000 Sabords — Kotlin Multiplatform App (legacy)

### Community 124 - "Kotlin Event Sourcing & Storage"
Cohesion: 0.33
Nodes (6): LZW Compression → .sabords Export Format, ÉvénementCoup sealed hierarchy (CoupCalculateur / CoupManuel / CoupÎleCrânes), Event Sourcing of Turns (`coups` list), localStorage Keys (partie, joueurs_connus, historique_parties), Persistence.kt — secondary localStorage adapter, Game History Archive (last 20 games)

### Community 127 - "Scoreo App Package Manifest"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 128 - "Prettier Configuration"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 130 - "MVI Vocabulary (Tori)"
Cohesion: 0.50
Nodes (4): Action, MVI-style, Reducer, State

### Community 131 - "Design Token Vocabulary"
Cohesion: 0.50
Nodes (4): Raw Token, Semantic Token, Catppuccin Design Tokens (Ludo Design System), check-design-tokens.mjs Guard-Rail

### Community 132 - "Gradle Wrapper Script"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 133 - "MVI Vocabulary (Scoreo)"
Cohesion: 0.50
Nodes (4): Action, MVI-style unidirectional flow, Reducer, State

## Ambiguous Edges - Review These
- `ToriValleyModuleScreen()` → `Component: Scoreo host top bar around the module (back arrow, title, menu)`  [AMBIGUOUS]
  apps/scoreo/tests/visual/toriModule.visual.spec.ts-snapshots/tori-score-create-desktop-linux.png · relation: references
- `Les 10 cartes du tirage` → `Carte Île au Trésor (dés réservés)`  [AMBIGUOUS]
  packages/module-mille-sabords/doc/resources/new-rules_piraten-final-bdef.pdf · relation: conceptually_related_to
- `Carte Sorcière (witch, désactive le buste)` → `Carte Gardienne (relancer une tête de mort)`  [AMBIGUOUS]
  packages/module-mille-sabords/doc/fonctionnel/regles-du-jeu.md · relation: cites
- `Relancer les dés Corsaires` → `Module de comptage (pas une application)`  [AMBIGUOUS]
  packages/module-mille-sabords/doc/resources/new-rules_piraten-final-bdef.pdf · relation: conceptually_related_to
- `Torī Valley Glossary` → `Torī reference card (the 16th card)`  [AMBIGUOUS]
  packages/module-tori-valley/doc/functional/features/objectif-cards.md · relation: references
- `Singleton `val partie` — mutable top-level state` → `EtatTour — top-level UI turn state`  [AMBIGUOUS]
  legacy/1ksabord-kotlin/AGENTS.md · relation: shares_data_with
- `Cerisier C` → `Chaque tuile cerisier vaut autant de points que le nombre de tuiles village du tableau (produit cerisiers x villages)`  [AMBIGUOUS]
  packages/module-tori-valley/doc/resources/objectif-cards/cerisier-c.jpg · relation: references
- `Carte Objectif Eau C` → `Bonus +10 si l'un de vos groupes (texte coupé, comparaison aux tableaux voisins)`  [AMBIGUOUS]
  packages/module-tori-valley/doc/resources/objectif-cards/eau-c.jpg · relation: references
- `Carte de référence Torī` → `Plusieurs séries de Torī peuvent être marquées`  [AMBIGUOUS]
  packages/module-tori-valley/doc/resources/objectif-cards/tori-reference.jpg · relation: references
- `UI state: quick score entry tab (Saisie rapide) with shortcut chips` → `Component: drawn-card select (Carte piochee, default '— Aucune carte —')`  [AMBIGUOUS]
  apps/scoreo/tests/visual/milleSabordsModule.visual.spec.ts-snapshots/sabords-manual-desktop-linux.png · relation: conceptually_related_to
- `UI state: finished game, winner announced, playing screen replaced` → `Component: match action stack (Annuler le coup, Terminer la partie, Quitter, Abandonner)`  [AMBIGUOUS]
  apps/scoreo/tests/visual/milleSabordsModule.visual.spec.ts-snapshots/sabords-finished-desktop-linux.png · relation: conceptually_related_to
- `UI state: game in progress restored from a stored match` → `Host chrome around the module (back arrow, screen title, menu)`  [AMBIGUOUS]
  apps/scoreo/tests/visual/milleSabordsModule.visual.spec.ts-snapshots/sabords-in-progress-phone-linux.png · relation: references
- `UI state: finished game with final standings` → `Module header: 1000 Sabords title with round badge`  [AMBIGUOUS]
  apps/scoreo/tests/visual/milleSabordsModule.visual.spec.ts-snapshots/sabords-finished-phone-linux.png · relation: references
- `Component: Torī colour counters (Green, Red, Blue, Yellow, Purple chips + number inputs)` → `Concept: module dark colour scheme paired with Scoreo's mocha flavor`  [AMBIGUOUS]
  apps/scoreo/tests/visual/toriModule.visual.spec.ts-snapshots/tori-score-edit-dark-desktop-linux.png · relation: conceptually_related_to
- `Component: A/B/C variant radio group per landscape` → `Component: Objectif landscape entry block (per-card inputs plus "Enter the total by hand" toggle)`  [AMBIGUOUS]
  apps/scoreo/tests/visual/toriModule.visual.spec.ts-snapshots/tori-score-edit-phone-linux.png · relation: shares_data_with
- `Component: Pinceau holder (+2 VP) select at the top of the scoring screen` → `Component: Scoreo host top bar (back arrow, "Score Detail"/"Edit match" title, menu)`  [AMBIGUOUS]
  apps/scoreo/tests/visual/toriModule.visual.spec.ts-snapshots/tori-score-create-phone-linux.png · relation: conceptually_related_to
- `Legacy 1000 Sabords Icon 192 (navy rounded square, gold lowercase s)` → `Scoreo Brand Identity: Mauve and White Monogram`  [AMBIGUOUS]
  legacy/1ksabord-kotlin/kotlin/src/jsMain/resources/icon-192.png · relation: references

## Knowledge Gaps
- **546 isolated node(s):** `session-start.sh script`, `semi`, `singleQuote`, `printWidth`, `trailingComma` (+541 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ToriValleyModuleScreen()` and `Component: Scoreo host top bar around the module (back arrow, title, menu)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Les 10 cartes du tirage` and `Carte Île au Trésor (dés réservés)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Carte Sorcière (witch, désactive le buste)` and `Carte Gardienne (relancer une tête de mort)`?**
  _Edge tagged AMBIGUOUS (relation: cites) - confidence is low._
- **What is the exact relationship between `Relancer les dés Corsaires` and `Module de comptage (pas une application)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Torī Valley Glossary` and `Torī reference card (the 16th card)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Singleton `val partie` — mutable top-level state` and `EtatTour — top-level UI turn state`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `Cerisier C` and `Chaque tuile cerisier vaut autant de points que le nombre de tuiles village du tableau (produit cerisiers x villages)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._