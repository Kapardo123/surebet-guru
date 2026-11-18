import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.surebet.guru',
  appName: 'Great Sport Bets',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Route WebView fetch/XHR through the native HTTP stack: no CORS, device
    // IP + real browser TLS. This is what lets the app pull SportyTrader odds
    // directly (their hideodd variant only skips bot-scored datacenter IPs).
    CapacitorHttp: {
      enabled: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
