import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercaditoocoyoacac.admin',
  appName: 'Mercadito Admin',
  webDir: 'out',
  server: {
    url: 'https://mercadito-ocoyoacac.vercel.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#7c3aed',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#7c3aed',
    },
  },
};

export default config;
