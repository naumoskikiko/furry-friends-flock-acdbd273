import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native runtime + permission declarations for iOS and Android.
 *
 * The string descriptions below are surfaced to users in the OS permission
 * prompts AND are reviewed by Apple App Store / Google Play. Vague or missing
 * strings are a top reason for store rejection — keep them specific to *why*
 * PetKeep needs each capability.
 *
 * Capacitor v8 reads this `plugins` block on `npx cap sync` and writes the
 * matching `Info.plist` keys (iOS) and `AndroidManifest.xml` entries (Android)
 * for each installed plugin.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.petkeep',
  appName: 'PetKeep',
  webDir: 'dist',
  server: {
    url: 'https://4be74104-e87c-4008-8b67-4575353b752a.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
    // Allow embedded http content (e.g. map tiles) — required for some providers.
    // App Transport Security exceptions still apply server-side via HTTPS.
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    // Allow mixed content for map tile providers; remove if not needed.
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
    PushNotifications: {
      // Show full alert/badge/sound when notifications arrive in foreground.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    Camera: {
      // iOS Info.plist usage descriptions — required by App Store review.
      permissions: {
        camera:
          'PetKeep uses the camera so you can take photos of your pets, post stories, and capture moments to share with the community.',
        photos:
          'PetKeep needs access to your photo library so you can choose pictures for your pet profiles, posts, and stories.',
      },
    },
    Geolocation: {
      permissions: {
        location:
          'PetKeep uses your location to show nearby pet care providers, businesses, and lost-pet alerts in your area.',
      },
    },
    BluetoothLe: {
      // iOS requires both usage strings; Android needs BLUETOOTH_SCAN/CONNECT
      // (auto-added by the plugin) plus ACCESS_FINE_LOCATION on Android <12.
      displayStrings: {
        scanning: 'Scanning for nearby PetKeep trackers…',
        cancel: 'Cancel',
        availableDevices: 'Available trackers',
        noDeviceFound: 'No tracker found',
      },
      permissions: {
        bluetooth:
          'PetKeep uses Bluetooth to connect to your pet tracker so you can locate your pet when nearby.',
        bluetoothAlwaysUsage:
          'PetKeep uses Bluetooth in the background to keep your pet tracker connected so you receive lost-pet alerts.',
      },
    },
  },
};

export default config;
