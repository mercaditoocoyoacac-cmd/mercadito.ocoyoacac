import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercadito.ocoyoacac.tienda',
  appName: 'Mercadito-Tienda',
  webDir: 'out',
  server: {
    url: 'https://mercadito-ocoyoacac.vercel.app/portal/vendedor',
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
