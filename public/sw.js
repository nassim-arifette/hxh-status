const notificationCopy = {
  en: {
    enabledTitle: "Togashi post alerts are on",
    enabledBody: "You will be notified when Yoshihiro Togashi posts.",
    onePost: "New Togashi post",
    manyPosts: (count) => `${count} new Togashi posts`,
    fallbackBody: "Yoshihiro Togashi posted on X.",
  },
  fr: {
    enabledTitle: "Les alertes Togashi sont activées",
    enabledBody:
      "Vous serez notifié à chaque nouveau post de Yoshihiro Togashi.",
    onePost: "Nouveau post de Togashi",
    manyPosts: (count) => `${count} nouveaux posts de Togashi`,
    fallbackBody: "Yoshihiro Togashi a publié un nouveau post sur X.",
  },
  ja: {
    enabledTitle: "Togashi post alerts are on",
    enabledBody: "You will be notified when Yoshihiro Togashi posts.",
    onePost: "New Togashi post",
    manyPosts: (count) => `${count} new Togashi posts`,
    fallbackBody: "Yoshihiro Togashi posted on X.",
  },
};

function buildNotification(payload) {
  const locale =
    payload?.locale === "fr" || payload?.locale === "ja"
      ? payload.locale
      : "en";
  const copy = notificationCopy[locale];

  if (payload?.v === 1 && payload.kind === "test") {
    return {
      title: copy.enabledTitle,
      body: copy.enabledBody,
      tag: "hxhstatus-notifications-enabled",
      url: "/",
    };
  }

  const validPost =
    payload?.v === 1 &&
    payload.kind === "togashi-post" &&
    typeof payload.tweetId === "string" &&
    /^\d{1,20}$/.test(payload.tweetId) &&
    Number.isInteger(payload.count) &&
    payload.count >= 1 &&
    payload.count <= 5 &&
    typeof payload.text === "string" &&
    Array.from(payload.text).length <= 180;

  if (validPost) {
    return {
      title:
        payload.count > 1 ? copy.manyPosts(payload.count) : copy.onePost,
      body: payload.text.trim() || copy.fallbackBody,
      tag: `togashi-post-${payload.tweetId}`,
      url:
        "https://x.com/Un4v5s8bgsVk9Xp/status/" + payload.tweetId,
    };
  }

  return {
    title: "HxH Status",
    body: copy.fallbackBody,
    tag: "hxhstatus-update",
    url: "/",
  };
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = null;
  try {
    payload = event.data.json();
  } catch {
    // Invalid data receives a fixed, safe fallback notification.
  }

  const notification = buildNotification(payload);

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: notification.tag,
      renotify: false,
      data: { url: notification.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const requestedUrl = event.notification.data?.url;
  let targetUrl = self.location.origin + "/";

  try {
    const candidate = new URL(
      typeof requestedUrl === "string" ? requestedUrl : "/",
      self.location.origin,
    );
    const isTogashiPost =
      candidate.origin === "https://x.com" &&
      /^\/Un4v5s8bgsVk9Xp\/status\/\d+$/.test(candidate.pathname) &&
      !candidate.search &&
      !candidate.hash;

    if (candidate.origin === self.location.origin || isTogashiPost) {
      targetUrl = candidate.href;
    }
  } catch {
    // Keep the safe site-home fallback.
  }

  event.waitUntil(
    (async () => {
      const target = new URL(targetUrl);

      if (target.origin === self.location.origin) {
        const windows = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        for (const client of windows) {
          if ("navigate" in client && client.url !== targetUrl) {
            await client.navigate(targetUrl);
          }
          if ("focus" in client) return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    })(),
  );
});
