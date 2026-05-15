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
      // Tutaj wklej swoje testowe lub produkcyjne ID reklam
      // Dla testów możesz użyć oficjalnych testowych ID z Google
      // Android:
      // appId: 'ca-app-pub-3940256099942544~3347511713', // Testowy
      // iOS:
      // appId: 'ca-app-pub-3940256099942544~1458002611', // Testowy
      // Aby włączyć testowe reklamy (zawsze dla developmentu!)
      testingDevices: [''], // Tutaj dodaj ID swojego urządzenia testowego
      initializeForTesting: true, // Włącz tryb testowy (ważne!)
    },
  },
};

export default config;
