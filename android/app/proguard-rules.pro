# Capacitor core — reflection via WebView JS bridge
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep @interface com.getcapacitor.annotation.* { *; }

# Capacitor official plugins (@capacitor/*)
-keep class com.capacitorjs.** { *; }

# Capacitor community plugins (@capacitor-community/*)
-keep class com.getcapacitor.community.** { *; }

# RevenueCat
-keep class com.revenuecat.** { *; }
-dontwarn com.revenuecat.**
-keepclassmembers class com.revenuecat.purchases.capacitor.** { *; }

# Google Play Services / Ads (AdMob)
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.internal.** { *; }
-dontwarn com.google.android.gms.**

# Firebase Messaging (push)
-keep class com.google.firebase.messaging.** { *; }
-dontwarn com.google.firebase.**

# AndroidX
-keep class androidx.core.app.NotificationCompat { *; }

# Kotlin coroutines / metadata used by RevenueCat
-dontwarn kotlinx.coroutines.**
-keepclassmembers class kotlinx.coroutines.** { *; }

# OkHttp / Okio (RevenueCat networking)
-dontwarn okhttp3.**
-dontwarn okio.**
-keepclassmembers class okhttp3.** { *; }

# Keep line numbers for readable crash reports on Play Console
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
