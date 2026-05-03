import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercaditoocoyoacac.app',
  appName: 'Mercadito Ocoyoacac',
  webDir: 'out',
  server: {
    url: 'https://mercadito-ocoyoacac.vercel.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563eb',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#2563eb',
    },
  },
};

export default config;
