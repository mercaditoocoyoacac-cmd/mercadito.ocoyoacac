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
  const { title, body } = payload.notification || {};
  if (!title && !body) return;

  const options = {
    body: body || "",
    icon: "/Logo MO.png",
    badge: "/Logo MO.png",
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  self.registration.showNotification(title || "", options);
});
