import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercadito.ocoyoacac.app',
  appName: 'Mercadito Ocoyoacac',
  webDir: 'out',
  server: {
    url: 'https://mercadito-ocoyoacac.vercel.app',
    cleartext: true,
    allowNavigation: ['*']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#2563eb',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#2563eb',
    },
  },
};

export default config;
