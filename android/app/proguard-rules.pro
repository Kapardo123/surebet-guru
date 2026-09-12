# Keep the WebView bridge surface only. Capacitor ships its own consumer rules
# (node_modules/@capacitor/android/capacitor/proguard-rules.pro) that already
# keep @CapacitorPlugin classes, com.getcapacitor.Plugin subclasses and Cordova
# plugins. Blanket `-keep class <library>.** { *; }` would freeze large parts of
# the DEX and make Google Play flag the app for low R8 optimization/shrinking.

-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations,AnnotationDefault,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor plugins (mirrors the consumer rules — explicit and safe)
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends org.apache.cordova.* { public <methods>; public <fields>; }

# WebView JS bridge entry points (called by name from JavaScript)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Third-party SDKs reference optional classes reflectively. These only silence
# R8 (they do not reduce optimization/shrinking/obfuscation).
-dontwarn com.getcapacitor.**
-dontwarn com.capacitorjs.**
-dontwarn com.getcapacitor.community.**
-dontwarn org.apache.cordova.**
-dontwarn com.revenuecat.**
-dontwarn com.google.android.gms.**
-dontwarn com.google.firebase.**
-dontwarn kotlinx.coroutines.**
-dontwarn okhttp3.**
-dontwarn okio.**
