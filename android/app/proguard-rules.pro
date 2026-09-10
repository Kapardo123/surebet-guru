# --- Capacitor core: bridge, reflection, annotations ---
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.annotation.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations,AnnotationDefault,Signature,InnerClasses,EnclosingMethod

# --- Capacitor official plugins (@capacitor/* -> com.capacitorjs.*) ---
-keep class com.capacitorjs.** { *; }

# --- Capacitor community plugins ---
-keep class com.getcapacitor.community.** { *; }

# --- Capacitor Cordova compat layer ---
-keep class org.apache.cordova.** { *; }
-keep class com.capacitor.cordova.** { *; }
-dontwarn org.apache.cordova.**

# --- RevenueCat ---
-keep class com.revenuecat.** { *; }
-dontwarn com.revenuecat.**

# --- Google Play Services / AdMob ---
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.internal.** { *; }
-dontwarn com.google.android.gms.**

# --- Firebase Messaging ---
-keep class com.google.firebase.messaging.** { *; }
-dontwarn com.google.firebase.**

# --- AndroidX ---
-keep class androidx.core.app.NotificationCompat { *; }

# --- Kotlin coroutines ---
-dontwarn kotlinx.coroutines.**
-keepclassmembers class kotlinx.coroutines.** { *; }

# --- OkHttp / Okio ---
-dontwarn okhttp3.**
-dontwarn okio.**
-keepclassmembers class okhttp3.** { *; }

# Readable crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Generic safety: keep all annotated WebView entry points
-keepclasseswithmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}