importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyB-MUsv6a09s1qzLpsIrUGKozf_hyzZHoU",
  authDomain: "mercadito-ocoyoacac.firebaseapp.com",
  projectId: "mercadito-ocoyoacac",
  storageBucket: "mercadito-ocoyoacac.firebasestorage.app",
  messagingSenderId: "67218965388",
  appId: "1:67218965388:web:13b50f716af87a93f40ca9",
  measurementId: "G-RXLQ2FBRQM"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "";
  const body = notification.body || data.body || "";
  if (!title && !body) return;

  const options = {
    body: body,
    icon: "/Logo MO.png",
    badge: "/Logo MO.png",
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: data,
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const data = event.notification.data || {};
  const urlToOpen = data.url || "/mis-pedidos";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
