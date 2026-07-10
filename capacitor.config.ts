import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.surebet.guru',
  appName: 'Great Sport Bets',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    AdMob: {
      appId: 'ca-app-pub-1532874051579555~6005647513', // PRODUKCYJNE
      initializeForTesting: false, // Wyłącz tryb testowy dla produkcji
    },
  },
};

export default config;
