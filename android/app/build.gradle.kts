plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.gms.google-services")
}

val signingVariables = listOf(
    "PLAY_UPLOAD_KEYSTORE_PATH",
    "PLAY_UPLOAD_KEYSTORE_PASSWORD",
    "PLAY_UPLOAD_KEY_ALIAS",
    "PLAY_UPLOAD_KEY_PASSWORD",
)
val providedSigningVariables = signingVariables.filter { !System.getenv(it).isNullOrBlank() }
if (providedSigningVariables.isNotEmpty() && providedSigningVariables.size != signingVariables.size) {
    error("For a signed release, set all four PLAY_UPLOAD_* environment variables in the current build session.")
}
val releaseSigningConfigured = providedSigningVariables.size == signingVariables.size

android {
    namespace = "com.shivagency.rewards"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.shivagency.rewards"
        minSdk = 24
        targetSdk = 36
        versionCode = 6
        versionName = "1.4.1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    if (releaseSigningConfigured) {
        signingConfigs {
            create("release") {
                storeFile = rootProject.file(System.getenv("PLAY_UPLOAD_KEYSTORE_PATH"))
                storePassword = System.getenv("PLAY_UPLOAD_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("PLAY_UPLOAD_KEY_ALIAS")
                keyPassword = System.getenv("PLAY_UPLOAD_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (releaseSigningConfigured) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX & Kotlin Core
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.activity:activity-compose:1.10.0")

    // Jetpack Compose BOM
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Navigation & ViewModel
    implementation("androidx.navigation:navigation-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    // Firebase (Using Firebase Android BOM)
    val firebaseBom = platform("com.google.firebase:firebase-bom:33.9.0")
    implementation(firebaseBom)
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-storage-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("com.google.firebase:firebase-functions-ktx")
    implementation("com.google.android.gms:play-services-auth:21.3.0")

    // Image loading with Coil
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Biometric authentication (PIN / Fingerprint)
    implementation("androidx.biometric:biometric-ktx:1.2.0-alpha05")

    // CameraX for live selfie capture
    implementation("androidx.camera:camera-camera2:1.4.1")
    implementation("androidx.camera:camera-lifecycle:1.4.1")
    implementation("androidx.camera:camera-view:1.4.1")
    implementation("com.google.guava:guava:33.4.0-android")
    implementation("com.google.mlkit:face-detection:16.1.7")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.1")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
