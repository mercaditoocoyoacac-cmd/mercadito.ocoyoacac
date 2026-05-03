import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercaditoocoyoacac.repartidor',
  appName: 'Mercadito Repartidor',
  webDir: 'out',
  server: {
    url: 'https://mercadito-ocoyoacac.vercel.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f97316',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#f97316',
    },
  },
};

export default config;
