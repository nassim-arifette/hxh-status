// The service worker runs detached from the page, so it cannot read the
// message catalogs. `npm run sw:copy` copies their notification strings into
// the block below: edit messages/*.json, never this object.
// <generated:notification-copy>
const notificationCopy = {
  "en": {
    "enabledTitle": "Togashi alerts are on",
    "enabledBody": "You will be notified whenever Yoshihiro Togashi posts.",
    "onePost": "New Togashi post",
    "manyPosts": "{count} new Togashi posts",
    "fallbackBody": "Yoshihiro Togashi just posted on X.",
    "milestoneTitle": {
      "inking": "Ch. {chapter}: inking complete",
      "background": "Ch. {chapter}: background specs complete",
      "delivered": "Ch. {chapter}: manuscript sent to Jump",
      "scheduled": "Ch. {chapter}: release date confirmed",
      "published": "Ch. {chapter}: out now"
    },
    "milestoneBody": {
      "inking": "Togashi has finished the character inking.",
      "background": "The background specification sheet is complete.",
      "delivered": "The finished manuscript has been delivered to Jump.",
      "scheduled": "Jump has confirmed the chapter's release date.",
      "published": "The chapter is now officially available."
    },
    "statuses": {
      "inking": "inking complete",
      "background": "background specs complete",
      "delivered": "sent to Jump",
      "scheduled": "release date confirmed",
      "published": "out now"
    },
    "manyChapters": "Progress on {count} chapters",
    "chapterLine": "Ch. {chapter}: {label}",
    "hiatusTitle": "Hunter × Hunter is on hiatus",
    "hiatusBody": "No new chapter is scheduled yet.",
    "publishingTitle": "Hunter × Hunter is back!",
    "publishingBody": "Jump has scheduled the next chapter."
  },
  "fr": {
    "enabledTitle": "Les alertes Togashi sont activées",
    "enabledBody": "Vous serez notifié à chaque nouveau post de Yoshihiro Togashi.",
    "onePost": "Nouveau post de Togashi",
    "manyPosts": "{count} nouveaux posts de Togashi",
    "fallbackBody": "Yoshihiro Togashi vient de publier sur X.",
    "milestoneTitle": {
      "inking": "Ch. {chapter} : encrage terminé",
      "background": "Ch. {chapter} : consignes de décors terminées",
      "delivered": "Ch. {chapter} : manuscrit remis au Jump",
      "scheduled": "Ch. {chapter} : date de parution fixée",
      "published": "Chapitre {chapter} disponible !"
    },
    "milestoneBody": {
      "inking": "Togashi a terminé l’encrage des personnages.",
      "background": "Les indications pour les décors ont été finalisées.",
      "delivered": "Le manuscrit terminé a été remis au Jump.",
      "scheduled": "Le Jump a annoncé la date de parution du chapitre.",
      "published": "Le chapitre est maintenant disponible officiellement."
    },
    "statuses": {
      "inking": "encrage terminé",
      "background": "consignes de décors terminées",
      "delivered": "remis au Jump",
      "scheduled": "date de parution fixée",
      "published": "disponible"
    },
    "manyChapters": "{count} chapitres ont avancé",
    "chapterLine": "Ch. {chapter} : {label}",
    "hiatusTitle": "Hunter × Hunter est en pause",
    "hiatusBody": "Aucun nouveau chapitre n’est programmé pour le moment.",
    "publishingTitle": "Hunter × Hunter revient !",
    "publishingBody": "Le prochain chapitre a désormais une date de parution."
  },
  "ja": {
    "enabledTitle": "冨樫先生の投稿通知がオンになりました",
    "enabledBody": "冨樫義博先生が投稿すると通知されます。",
    "onePost": "冨樫先生の新しい投稿",
    "manyPosts": "冨樫先生の新しい投稿が{count}件",
    "fallbackBody": "冨樫義博先生がXに投稿しました。",
    "milestoneTitle": {
      "inking": "第{chapter}話：人物ペン入れ完了",
      "background": "第{chapter}話：背景指定書作成完了",
      "delivered": "第{chapter}話：原稿完成",
      "scheduled": "第{chapter}話：掲載日決定",
      "published": "第{chapter}話：掲載開始"
    },
    "milestoneBody": {
      "inking": "冨樫先生が人物ペン入れ完了を報告しました。",
      "background": "背景指定書の作成が完了しました。",
      "delivered": "完成原稿はジャンプ編集部に渡っています。",
      "scheduled": "掲載日が正式に決まりました。",
      "published": "最新話が公式に掲載されました。"
    },
    "statuses": {
      "inking": "人物ペン入れ完了",
      "background": "背景指定書作成完了",
      "delivered": "原稿完成",
      "scheduled": "掲載日決定",
      "published": "掲載済み"
    },
    "manyChapters": "{count}話分の制作が進みました",
    "chapterLine": "第{chapter}話：{label}",
    "hiatusTitle": "HUNTER×HUNTERは休載中",
    "hiatusBody": "次回掲載日はまだ決まっていません。",
    "publishingTitle": "HUNTER×HUNTER連載再開",
    "publishingBody": "次回掲載日が決まりました。"
  },
  "es": {
    "enabledTitle": "Las alertas de Togashi están activadas",
    "enabledBody": "Recibirás una notificación cada vez que Yoshihiro Togashi publique algo nuevo.",
    "onePost": "Nuevo post de Togashi",
    "manyPosts": "{count} nuevos posts de Togashi",
    "fallbackBody": "Togashi acaba de publicar en X.",
    "milestoneTitle": {
      "inking": "Cap. {chapter}: entintado terminado",
      "background": "Cap. {chapter}: indicaciones de fondos listas",
      "delivered": "Cap. {chapter}: manuscrito entregado a Jump",
      "scheduled": "Cap. {chapter}: fecha confirmada",
      "published": "Cap. {chapter}: ya disponible"
    },
    "milestoneBody": {
      "inking": "Togashi ha terminado el entintado de los personajes.",
      "background": "Togashi ha terminado las indicaciones para los fondos.",
      "delivered": "El manuscrito terminado ya está en manos de Jump.",
      "scheduled": "Jump confirmó la fecha de publicación.",
      "published": "El capítulo ya está disponible oficialmente."
    },
    "statuses": {
      "inking": "entintado terminado",
      "background": "indicaciones de fondos listas",
      "delivered": "entregado a Jump",
      "scheduled": "fecha confirmada",
      "published": "disponible"
    },
    "manyChapters": "Avances en {count} capítulos",
    "chapterLine": "Cap. {chapter}: {label}",
    "hiatusTitle": "Hunter × Hunter está en hiatus",
    "hiatusBody": "No hay ningún capítulo nuevo programado por ahora.",
    "publishingTitle": "¡Hunter × Hunter regresa!",
    "publishingBody": "El próximo capítulo ya tiene fecha de publicación."
  },
  "pt": {
    "enabledTitle": "Os alertas do Togashi estão ativados",
    "enabledBody": "Você será notificado sempre que Yoshihiro Togashi fizer uma nova publicação.",
    "onePost": "Novo post do Togashi",
    "manyPosts": "{count} novos posts do Togashi",
    "fallbackBody": "Togashi acabou de postar no X.",
    "milestoneTitle": {
      "inking": "Cap. {chapter}: arte-final concluída",
      "background": "Cap. {chapter}: indicações de cenários prontas",
      "delivered": "Cap. {chapter}: manuscrito entregue à Jump",
      "scheduled": "Cap. {chapter}: data confirmada",
      "published": "Cap. {chapter}: já disponível"
    },
    "milestoneBody": {
      "inking": "Togashi concluiu a arte-final dos personagens.",
      "background": "Togashi concluiu as indicações para os cenários.",
      "delivered": "O manuscrito concluído já está com a Jump.",
      "scheduled": "A Jump confirmou a data de publicação.",
      "published": "O capítulo já está disponível oficialmente."
    },
    "statuses": {
      "inking": "arte-final concluída",
      "background": "indicações de cenários prontas",
      "delivered": "entregue à Jump",
      "scheduled": "data confirmada",
      "published": "disponível"
    },
    "manyChapters": "Avanços em {count} capítulos",
    "chapterLine": "Cap. {chapter}: {label}",
    "hiatusTitle": "Hunter × Hunter está em hiato",
    "hiatusBody": "Não há capítulo novo programado no momento.",
    "publishingTitle": "Hunter × Hunter está de volta!",
    "publishingBody": "O próximo capítulo já tem data de publicação."
  },
  "zh": {
    "enabledTitle": "富坚动态提醒已开启",
    "enabledBody": "富坚义博发布新动态时，你将收到提醒。",
    "onePost": "富坚发布了新动态",
    "manyPosts": "富坚发布了{count}条新动态",
    "fallbackBody": "富坚义博在 X 发布了新动态。",
    "milestoneTitle": {
      "inking": "第{chapter}话：人物勾线完成",
      "background": "第{chapter}话：背景指定书完成",
      "delivered": "第{chapter}话：原稿完成",
      "scheduled": "第{chapter}话：刊载日期确定",
      "published": "第{chapter}话：正式刊载"
    },
    "milestoneBody": {
      "inking": "富坚义博已完成人物勾线。",
      "background": "背景指定书已制作完成。",
      "delivered": "完整原稿已交付集英社。",
      "scheduled": "《周刊少年Jump》已确定刊载日期。",
      "published": "本话现已正式刊载。"
    },
    "statuses": {
      "inking": "人物勾线完成",
      "background": "背景指定书完成",
      "delivered": "已交稿",
      "scheduled": "刊载日期确定",
      "published": "已刊载"
    },
    "manyChapters": "共{count}话制作进度更新",
    "chapterLine": "第{chapter}话：{label}",
    "hiatusTitle": "《全职猎人》休刊中",
    "hiatusBody": "目前暂无新话刊载安排。",
    "publishingTitle": "《全职猎人》复刊",
    "publishingBody": "下一话刊载日期已确定。"
  },
  "ar": {
    "enabledTitle": "تنبيهات توغاشي مفعلة",
    "enabledBody": "سيصلك إشعار كلما نشر يوشيهيرو توغاشي منشورًا جديدًا.",
    "onePost": "منشور جديد لتوغاشي",
    "manyPosts": "{count} منشورات جديدة لتوغاشي",
    "fallbackBody": "نشر توغاشي منشورًا جديدًا على X.",
    "milestoneTitle": {
      "inking": "الفصل {chapter}: اكتمل تحبير الشخصيات",
      "background": "الفصل {chapter}: اكتملت تعليمات الخلفيات",
      "delivered": "الفصل {chapter}: سُلّمت المخطوطة إلى جمب",
      "scheduled": "الفصل {chapter}: تم تحديد موعد النشر",
      "published": "الفصل {chapter}: متاح الآن"
    },
    "milestoneBody": {
      "inking": "أكمل توغاشي تحبير الشخصيات.",
      "background": "اكتمل إعداد مستند تعليمات الخلفيات.",
      "delivered": "سُلّمت المخطوطة المكتملة إلى جمب.",
      "scheduled": "أعلنت جمب موعد نشر الفصل.",
      "published": "الفصل متاح رسميًا الآن."
    },
    "statuses": {
      "inking": "التحبير مكتمل",
      "background": "تعليمات الخلفيات مكتملة",
      "delivered": "سُلّمت إلى جمب",
      "scheduled": "موعد النشر محدد",
      "published": "متاح الآن"
    },
    "manyChapters": "تقدم جديد في عدة فصول ({count})",
    "chapterLine": "الفصل {chapter}: {label}",
    "hiatusTitle": "هنتر × هنتر في فترة توقف",
    "hiatusBody": "لا يوجد فصل جديد مقرر للنشر حاليًا.",
    "publishingTitle": "عودة هنتر × هنتر",
    "publishingBody": "تم تحديد موعد نشر الفصل القادم."
  }
};
// </generated:notification-copy>

// The catalogs store placeholders rather than functions, the same shape the
// page-side formatter reads.
function fill(template, values) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (placeholder, key) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : placeholder,
  );
}

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
  // Every registered locale ships its own copy above; anything else, including
  // a payload from an older worker, falls back to English.
  const locale =
    typeof payload?.locale === "string" &&
    Object.prototype.hasOwnProperty.call(notificationCopy, payload.locale)
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
      fill(copy.chapterLine, {
        chapter: entry.chapter,
        label: copy.statuses[entry.to],
      }),
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
        title: fill(copy.milestoneTitle[only.to], { chapter: only.chapter }),
        body: copy.milestoneBody[only.to],
        tag,
        url: "/",
      };
    }

    return {
      title: fill(copy.manyChapters, { count: payload.chapters.length }),
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
        payload.count > 1
          ? fill(copy.manyPosts, { count: payload.count })
          : copy.onePost,
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
