const notificationCopy = {
  en: {
    enabledTitle: "Togashi post alerts are on",
    enabledBody: "You will be notified when Yoshihiro Togashi posts.",
    onePost: "New Togashi post",
    manyPosts: (count) => `${count} new Togashi posts`,
    fallbackBody: "Yoshihiro Togashi posted on X.",
    milestoneTitle: {
      inking: (chapter) => `Chapter ${chapter}: the inking is done!`,
      background: (chapter) => `Chapter ${chapter}: the backgrounds are done!`,
      delivered: (chapter) => `Chapter ${chapter} has been delivered to Jump!`,
      scheduled: (chapter) => `Chapter ${chapter} has a release date!`,
      published: (chapter) => `Chapter ${chapter} is out!`,
    },
    milestoneBody: {
      inking: "Togashi has finished the character linework.",
      background: "The background instructions are complete.",
      delivered: "The finished manuscript is now with Jump.",
      scheduled: "Jump has scheduled it for publication.",
      published: "Go read it.",
    },
    statuses: {
      inking: "inked",
      background: "backgrounds done",
      delivered: "at Jump",
      scheduled: "scheduled",
      published: "out now",
    },
    manyChapters: (count) => `${count} chapters moved forward!`,
    chapterLine: (chapter, label) => `${chapter}: ${label}`,
    hiatusTitle: "Hunter × Hunter is going on a break",
    hiatusBody: "No new chapter is scheduled for now.",
    publishingTitle: "Hunter × Hunter is back!",
    publishingBody: "Jump has scheduled the next chapter.",
  },
  fr: {
    enabledTitle: "Les alertes Togashi sont activées",
    enabledBody:
      "Vous serez notifié à chaque nouveau post de Yoshihiro Togashi.",
    onePost: "Nouveau post de Togashi",
    manyPosts: (count) => `${count} nouveaux posts de Togashi`,
    fallbackBody: "Yoshihiro Togashi a publié un nouveau post sur X.",
    milestoneTitle: {
      inking: (chapter) => `Chapitre ${chapter} : l’encrage est terminé !`,
      background: (chapter) => `Chapitre ${chapter} : les décors sont bouclés !`,
      delivered: (chapter) => `Le chapitre ${chapter} a été livré au Jump !`,
      scheduled: (chapter) => `Le chapitre ${chapter} a une date de sortie !`,
      published: (chapter) => `Le chapitre ${chapter} est sorti !`,
    },
    milestoneBody: {
      inking: "Togashi a fini l’encrage des personnages.",
      background: "Les instructions de décors sont terminées.",
      delivered: "Le manuscrit terminé est entre les mains du Jump.",
      scheduled: "Le Jump a programmé sa publication.",
      published: "Bonne lecture.",
    },
    statuses: {
      inking: "encré",
      background: "décors bouclés",
      delivered: "chez le Jump",
      scheduled: "programmé",
      published: "disponible",
    },
    manyChapters: (count) => `${count} chapitres ont avancé !`,
    chapterLine: (chapter, label) => `${chapter} : ${label}`,
    hiatusTitle: "Hunter × Hunter part en pause",
    hiatusBody: "Aucun nouveau chapitre n’est programmé pour l’instant.",
    publishingTitle: "Hunter × Hunter revient !",
    publishingBody: "Le Jump a programmé la suite.",
  },
  ja: {
    enabledTitle: "Togashi post alerts are on",
    enabledBody: "You will be notified when Yoshihiro Togashi posts.",
    onePost: "New Togashi post",
    manyPosts: (count) => `${count} new Togashi posts`,
    fallbackBody: "Yoshihiro Togashi posted on X.",
    milestoneTitle: {
      inking: (chapter) => `Chapter ${chapter}: the inking is done!`,
      background: (chapter) => `Chapter ${chapter}: the backgrounds are done!`,
      delivered: (chapter) => `Chapter ${chapter} has been delivered to Jump!`,
      scheduled: (chapter) => `Chapter ${chapter} has a release date!`,
      published: (chapter) => `Chapter ${chapter} is out!`,
    },
    milestoneBody: {
      inking: "Togashi has finished the character linework.",
      background: "The background instructions are complete.",
      delivered: "The finished manuscript is now with Jump.",
      scheduled: "Jump has scheduled it for publication.",
      published: "Go read it.",
    },
    statuses: {
      inking: "inked",
      background: "backgrounds done",
      delivered: "at Jump",
      scheduled: "scheduled",
      published: "out now",
    },
    manyChapters: (count) => `${count} chapters moved forward!`,
    chapterLine: (chapter, label) => `${chapter}: ${label}`,
    hiatusTitle: "Hunter × Hunter is going on a break",
    hiatusBody: "No new chapter is scheduled for now.",
    publishingTitle: "Hunter × Hunter is back!",
    publishingBody: "Jump has scheduled the next chapter.",
  },
};

// The tracker's own statuses, minus `unknown`: a chapter dropping back to "no
// confirmed update" is not something to wake a phone for.
const MILESTONE_STATUSES = [
  "inking",
  "background",
  "delivered",
  "scheduled",
  "published",
];

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

  const validMilestone =
    payload?.v === 1 &&
    payload.kind === "tracker-milestone" &&
    typeof payload.revision === "string" &&
    /^[0-9A-Za-z-]{1,40}$/.test(payload.revision) &&
    Array.isArray(payload.chapters) &&
    payload.chapters.length <= 10 &&
    payload.chapters.every(
      (entry) =>
        entry &&
        Number.isInteger(entry.chapter) &&
        entry.chapter >= 1 &&
        entry.chapter <= 9999 &&
        MILESTONE_STATUSES.includes(entry.to),
    ) &&
    (payload.publication === null ||
      payload.publication === "hiatus" ||
      payload.publication === "publishing") &&
    (payload.chapters.length > 0 || payload.publication !== null);

  if (validMilestone) {
    const lines = payload.chapters.map((entry) =>
      copy.chapterLine(entry.chapter, copy.statuses[entry.to]),
    );
    const tag = `tracker-${payload.revision}`;

    // A hiatus flip outranks the chapters it arrived with: it is the rarer
    // fact and the one a reader reacts to.
    if (payload.publication) {
      const onHiatus = payload.publication === "hiatus";
      return {
        title: onHiatus ? copy.hiatusTitle : copy.publishingTitle,
        body:
          lines.length > 0
            ? lines.join(" · ")
            : onHiatus
              ? copy.hiatusBody
              : copy.publishingBody,
        tag,
        url: "/",
      };
    }

    // One chapter gets a whole sentence; several get a headline and a list,
    // because five sentences in a row would not fit a notification anyway.
    if (payload.chapters.length === 1) {
      const [only] = payload.chapters;
      return {
        title: copy.milestoneTitle[only.to](only.chapter),
        body: copy.milestoneBody[only.to],
        tag,
        url: "/",
      };
    }

    return {
      title: copy.manyChapters(payload.chapters.length),
      body: lines.join(" · "),
      tag,
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
