plugins {
    kotlin("multiplatform") version "2.0.21"
    kotlin("plugin.serialization") version "2.0.21"
}

repositories {
    mavenCentral()
    google()
}

kotlin {
    js(IR) {
        browser {
            commonWebpackConfig {
                outputFileName = "app.js"
            }
        }
        nodejs {
            testTask {
                useMocha {
                    timeout = "20000"
                }
            }
        }
        binaries.executable()
    }

    // ── Android : nécessite un Android SDK installé (ANDROID_HOME ou local.properties) ──
    // Décommenter lorsque le SDK est disponible :
    //
    // androidTarget {
    //     compilations.all {
    //         kotlinOptions { jvmTarget = "17" }
    //     }
    // }

    sourceSets {
        // ── Code partagé entre toutes les plateformes ──
        val commonMain by getting {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
            }
        }
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }

        // ── Cible JS ──
        val jsMain by getting
        val jsTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }

        // ── Cible Android (à activer avec le SDK) ──
        // val androidMain by getting {
        //     dependencies {
        //         implementation("androidx.core:core-ktx:1.13.1")
        //         implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.5")
        //         implementation("androidx.compose.ui:ui:1.7.0")
        //         implementation("androidx.compose.material3:material3:1.3.0")
        //     }
        // }
    }
}

// ── Configuration Android (décommenter avec le target) ──
// android {
//     namespace = "fr.ksabord"
//     compileSdk = 34
//     defaultConfig { minSdk = 24 }
//     compileOptions {
//         sourceCompatibility = JavaVersion.VERSION_17
//         targetCompatibility = JavaVersion.VERSION_17
//     }
// }
