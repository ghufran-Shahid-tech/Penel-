# Keep JNI native methods and JS bridge interfaces
-keep class com.goldfire.testpanel.nativebridge.NativeTestEngine { *; }
-keep class com.goldfire.testpanel.bridge.PanelJsBridge { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
