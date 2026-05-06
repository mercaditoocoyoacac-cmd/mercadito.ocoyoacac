import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercadito.ocoyoacac.entregas',
  appName: 'Mercadito-Entregas',
  webDir: 'out',
  server: {
    url: 'https://mercadito-ocoyoacac.vercel.app/portal/repartidor',
    cleartext: true,
    allowNavigation: ['*']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#f97316',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#f97316',
    },
  },
};

export default config;
