plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.sam.privateai"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.sam.privateai"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "4.23.0"
    }
}
