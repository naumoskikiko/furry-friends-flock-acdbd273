/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDNK4-AhHZUn1RT8AexTvM47_Cmw752buE",
  authDomain: "petkeep-a3370.firebaseapp.com",
  projectId: "petkeep-a3370",
  storageBucket: "petkeep-a3370.firebasestorage.app",
  messagingSenderId: "991866746028",
  appId: "1:991866746028:web:587ff20b9467aaf36adb09",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);
  const { title, body, icon } = payload.notification || {};
  const notificationTitle = title || "PetKeep Reminder";
  const notificationOptions = {
    body: body || "You have a new notification",
    icon: icon || "/placeholder.svg",
    badge: "/placeholder.svg",
    tag: payload.data?.medication_id || "general",
    data: payload.data,
    actions: [
      { action: "mark-taken", title: "✅ Mark as Given" },
      { action: "dismiss", title: "Later" },
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data;

  if (action === "mark-taken" && data?.medication_id && data?.scheduled_at) {
    // Open app to medication page
    event.waitUntil(
      clients.openWindow(`/settings?tab=pet&medication=${data.medication_id}&action=taken&scheduled=${data.scheduled_at}`)
    );
  } else {
    event.waitUntil(clients.openWindow("/notifications"));
  }
});
