import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.surebet.guru',
  appName: 'Great Sport Bets',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
