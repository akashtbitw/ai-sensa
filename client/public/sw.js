// Service Worker for handling push notifications
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const uniqueTag =
      data.tag ||
      `medication-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const options = {
      body: data.body,
      icon: data.icon || "/icon-192x192.png",
      badge: data.badge || "/badge-72x72.png",
      tag: uniqueTag,
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
      actions: [
        {
          action: "dismiss",
          title: "Dismiss",
        },
        {
          action: "view",
          title: "View",
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "view" || !event.action) {
    // Open the app
    event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
  }

  // Handle other actions like 'dismiss' automatically close the notification
});

// Handle notification close
self.addEventListener("notificationclose", function (event) {
  // Track notification dismissal if needed
  console.log("Notification closed:", event.notification.tag);
});
