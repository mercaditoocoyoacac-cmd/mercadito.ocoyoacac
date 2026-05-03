import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercaditoocoyoacac.vendedor',
  appName: 'Mercadito Vendedor',
  webDir: 'out',
  server: {
    url: 'https://mercadito-ocoyoacac.vercel.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#16a34a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#16a34a',
    },
  },
  overrides: {
    UserAgent: 'MercaditoVendedor/1.0',
  },
};

export default config;
