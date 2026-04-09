import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDNK4-AhHZUn1RT8AexTvM47_Cmw752buE",
  authDomain: "petkeep-a3370.firebaseapp.com",
  projectId: "petkeep-a3370",
  storageBucket: "petkeep-a3370.firebasestorage.app",
  messagingSenderId: "991866746028",
  appId: "1:991866746028:web:587ff20b9467aaf36adb09",
  measurementId: "G-1FC9MTEFDM",
};

const app = initializeApp(firebaseConfig);

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

export const getFirebaseMessaging = async () => {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) {
    console.warn("Firebase Messaging not supported in this browser");
    return null;
  }
  messagingInstance = getMessaging(app);
  return messagingInstance;
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    // VAPID key - you'll need to generate this from Firebase Console > Cloud Messaging > Web Push certificates
    const token = await getToken(messaging, {
      vapidKey: "d2N0C-DWaC47y1eHRZH-VitYwgx37ADOeqGxVwlSFJo",
    });

    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

export const onForegroundMessage = async (callback: (payload: any) => void) => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};

export { app };
