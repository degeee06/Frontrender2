import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oubook.agendamento',
  appName: 'Oubook',
  webDir: 'dist', // Corrected from 'public' to match the React build output directory
  server: {
    androidScheme: 'https',
    hostname: 'oubook.vercel.app',
    cleartext: true,
    allowNavigation: [
      'https://agendamento-ynxr.onrender.com',
      'https://oubook.vercel.app',
      'https://otyxjcxxqwjotnuyrvmc.supabase.co',
      'https://*.supabase.co',
      'https://*.google.com',
      'https://accounts.google.com'
    ]
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    Browser: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;
