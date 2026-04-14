import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.catalyze.app',
  appName: 'Catalyze',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#f5f0e3',
  },
  plugins: {
    Preferences: {},
    Geolocation: {
      iosLocationPermission: 'We use your location to find nearby non-profit organizations and provide relevant recommendations.',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      launchFadeOutDuration: 500,
      backgroundColor: '#6b8e6e',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
  },
};

export default config;
