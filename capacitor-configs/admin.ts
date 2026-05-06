import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercadito.ocoyoacac.admin',
  appName: 'Mercadito-Admin',
  webDir: 'out',
  server: {
    url: 'https://mercadito-ocoyoacac.vercel.app/admin',
    cleartext: true,
    allowNavigation: ['*']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#1e293b',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#1e293b',
    },
  },
};

export default config;
