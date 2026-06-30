plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.compose.multiplatform)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.kotlinx.serialization)
    alias(libs.plugins.kover)
}

val generateOAuthConfig by tasks.registering {
    val clientId = System.getenv("GOOGLE_CLIENT_ID") ?: ""
    inputs.property("googleClientId", clientId)
    val outputDir = layout.buildDirectory.dir("generated/oauthconfig")
    outputs.dir(outputDir)
    doLast {
        val dir = outputDir.get().asFile.resolve("com/scoreo/infrastructure/google")
        dir.mkdirs()
        dir.resolve("OAuthConfig.kt").writeText(
            """package com.scoreo.infrastructure.google

internal object OAuthConfig {
    const val CLIENT_ID = "$clientId"
}
"""
        )
    }
}

kotlin {
    jvm()

    js(IR) {
        browser {
            commonWebpackConfig {
                outputFileName = "scoreo.js"
                devServer = (devServer ?: org.jetbrains.kotlin.gradle.targets.js.webpack.KotlinWebpackConfig.DevServer()).apply {
                    port = 9191
                }
            }
        }
        binaries.executable()
    }

    sourceSets {
        commonMain.dependencies {
            implementation(compose.runtime)
            implementation(libs.kotlinx.datetime)
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.coroutines.core)
        }
        val jsMain by getting {
            kotlin.srcDir(generateOAuthConfig)
            dependencies {
                implementation(compose.html.core)
            }
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.coroutines.test)
        }
        val jsTest by getting {
            dependencies {
                implementation(kotlin("test"))
                implementation(libs.kotlinx.serialization.json)
                implementation(compose.html.core)
            }
        }
        val jvmTest by getting {
            dependencies {
                implementation(kotlin("test"))
                implementation(libs.kotlinx.coroutines.test)
            }
        }
    }
}

tasks.named<Copy>("jsBrowserDistribution") {
    duplicatesStrategy = DuplicatesStrategy.INCLUDE
}

if (System.getenv("CI") == null) {
    ProcessBuilder("git", "config", "core.hooksPath", ".githooks")
        .directory(rootDir)
        .start()
        .waitFor()
}
