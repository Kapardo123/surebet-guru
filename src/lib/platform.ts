import { Capacitor } from "@capacitor/core";

/** True inside the Android/iOS app (Capacitor), false in a browser. */
export const isNativeApp = Capacitor.isNativePlatform();

export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.surebet.guru";
