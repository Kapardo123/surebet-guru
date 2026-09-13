# --- Capacitor core + plugins ---
# The core reads @CapacitorPlugin/@Permission through reflection and stores the
# bridge/annotation in fields; R8 full mode broke that (NPE in
# Plugin.getPermissionStates -> Bridge.getPermissionStates). Keep the whole
# Capacitor surface. Third-party SDKs below rely on their own consumer rules.

-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class com.getcapacitor.community.** { *; }
-keep @interface com.getcapacitor.annotation.** { *; }

# Keep only the WebView bridge surface. Capacitor ships its own consumer rules
# (node_modules/@capacitor/android/capacitor/proguard-rules.pro) that already
# keep @CapacitorPlugin classes, com.getcapacitor.Plugin subclasses and Cordova
# plugins; RevenueCat, Google Play services and Firebase ship theirs too.
# Blanket `-keep class <library>.** { *; }` would freeze large parts of the DEX
# and keep Google Play's optimization/shrinking below the 25% threshold.

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
