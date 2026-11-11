# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * { void set*(***); *** get*(); }

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# react-native-gesture-handler
-keep class com.swmansion.gesturehandler.** { *; }

# react-native-vision-camera
-keep class com.mrousavy.camera.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }

# OkHttp (used by React Native networking)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Keep native methods
-keepclassmembers class * { native <methods>; }

# Suppress warnings for common RN libraries
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**
-dontwarn com.swmansion.**
