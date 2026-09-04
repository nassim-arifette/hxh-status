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
    "fallbackBody": "Yoshihiro Togashi posted on X.",
    "milestoneTitle": {
      "inking": "Chapter {chapter}: the inking is done!",
      "background": "Chapter {chapter}: the backgrounds are done!",
      "delivered": "Chapter {chapter} has been delivered to Jump!",
      "scheduled": "Chapter {chapter} has a release date!",
      "published": "Chapter {chapter} is out!"
    },
    "milestoneBody": {
      "inking": "Togashi has finished the character linework.",
      "background": "The background instructions are complete.",
      "delivered": "The finished manuscript is now with Jump.",
      "scheduled": "Jump has scheduled it for publication.",
      "published": "Go read it."
    },
    "statuses": {
      "inking": "inked",
      "background": "backgrounds done",
      "delivered": "at Jump",
      "scheduled": "scheduled",
      "published": "out now"
    },
    "manyChapters": "{count} chapters moved forward!",
    "chapterLine": "{chapter}: {label}",
    "hiatusTitle": "Hunter × Hunter is going on a break",
    "hiatusBody": "No new chapter is scheduled for now.",
    "publishingTitle": "Hunter × Hunter is back!",
    "publishingBody": "Jump has scheduled the next chapter."
  },
  "fr": {
    "enabledTitle": "Les alertes Togashi sont activées",
    "enabledBody": "Vous serez notifié à chaque nouveau post de Yoshihiro Togashi.",
    "onePost": "Nouveau post de Togashi",
    "manyPosts": "{count} nouveaux posts de Togashi",
    "fallbackBody": "Yoshihiro Togashi a publié un nouveau post sur X.",
    "milestoneTitle": {
      "inking": "Chapitre {chapter} : l’encrage est terminé !",
      "background": "Chapitre {chapter} : les décors sont bouclés !",
      "delivered": "Le chapitre {chapter} a été livré au Jump !",
      "scheduled": "Le chapitre {chapter} a une date de sortie !",
      "published": "Le chapitre {chapter} est sorti !"
    },
    "milestoneBody": {
      "inking": "Togashi a fini l’encrage des personnages.",
      "background": "Les instructions de décors sont terminées.",
      "delivered": "Le manuscrit terminé est entre les mains du Jump.",
      "scheduled": "Le Jump a programmé sa publication.",
      "published": "Bonne lecture."
    },
    "statuses": {
      "inking": "encré",
      "background": "décors bouclés",
      "delivered": "chez le Jump",
      "scheduled": "programmé",
      "published": "disponible"
    },
    "manyChapters": "{count} chapitres ont avancé !",
    "chapterLine": "{chapter} : {label}",
    "hiatusTitle": "Hunter × Hunter part en pause",
    "hiatusBody": "Aucun nouveau chapitre n’est programmé pour l’instant.",
    "publishingTitle": "Hunter × Hunter revient !",
    "publishingBody": "Le Jump a programmé la suite."
  },
  "ja": {
    "enabledTitle": "冨樫先生の投稿通知がオンになりました",
    "enabledBody": "冨樫義博先生が投稿すると通知されます。",
    "onePost": "冨樫先生の新しい投稿",
    "manyPosts": "冨樫先生の新しい投稿が{count}件",
    "fallbackBody": "冨樫義博先生がXに投稿しました。",
    "milestoneTitle": {
      "inking": "第{chapter}話：人物のペン入れが完了！",
      "background": "第{chapter}話：背景指定が完了！",
      "delivered": "第{chapter}話の原稿がジャンプに渡りました！",
      "scheduled": "第{chapter}話の掲載日が決まりました！",
      "published": "第{chapter}話が掲載されました！"
    },
    "milestoneBody": {
      "inking": "冨樫先生が人物のペン入れを終えました。",
      "background": "背景の指定書が完成しました。",
      "delivered": "完成した原稿はジャンプ編集部に渡っています。",
      "scheduled": "ジャンプが掲載を予定しています。",
      "published": "ぜひ読んでください。"
    },
    "statuses": {
      "inking": "人物ペン入れ完了",
      "background": "背景指定完了",
      "delivered": "原稿完成",
      "scheduled": "掲載予定",
      "published": "掲載済み"
    },
    "manyChapters": "{count}話の進捗が進みました！",
    "chapterLine": "第{chapter}話：{label}",
    "hiatusTitle": "HUNTER×HUNTERが休載に入ります",
    "hiatusBody": "現在、次の話の掲載予定はありません。",
    "publishingTitle": "HUNTER×HUNTERが再開します！",
    "publishingBody": "ジャンプが次の話の掲載を予定しています。"
  },
  "es": {
    "enabledTitle": "Las alertas de Togashi están activadas",
    "enabledBody": "Recibirás una notificación cada vez que Yoshihiro Togashi publique algo nuevo.",
    "onePost": "Nueva publicación de Togashi",
    "manyPosts": "{count} nuevas publicaciones de Togashi",
    "fallbackBody": "Yoshihiro Togashi ha publicado algo en X.",
    "milestoneTitle": {
      "inking": "Capítulo {chapter}: ¡el entintado está listo!",
      "background": "Capítulo {chapter}: ¡los fondos están listos!",
      "delivered": "¡El capítulo {chapter} ha sido entregado a Jump!",
      "scheduled": "¡El capítulo {chapter} ya tiene fecha de publicación!",
      "published": "¡El capítulo {chapter} ya está disponible!"
    },
    "milestoneBody": {
      "inking": "Togashi ha terminado el entintado de los personajes.",
      "background": "Las indicaciones de los fondos están completas.",
      "delivered": "El manuscrito terminado ya está en manos de Jump.",
      "scheduled": "Jump ha programado su publicación.",
      "published": "A leerlo."
    },
    "statuses": {
      "inking": "entintado",
      "background": "fondos listos",
      "delivered": "en Jump",
      "scheduled": "programado",
      "published": "disponible"
    },
    "manyChapters": "¡{count} capítulos han avanzado!",
    "chapterLine": "{chapter}: {label}",
    "hiatusTitle": "Hunter × Hunter entra en hiatus",
    "hiatusBody": "Por ahora no hay ningún capítulo programado.",
    "publishingTitle": "¡Hunter × Hunter ha vuelto!",
    "publishingBody": "Jump ya ha programado el próximo capítulo."
  },
  "pt": {
    "enabledTitle": "Os alertas do Togashi estão ativados",
    "enabledBody": "Você será notificado sempre que Yoshihiro Togashi fizer uma nova publicação.",
    "onePost": "Nova publicação do Togashi",
    "manyPosts": "{count} novas publicações do Togashi",
    "fallbackBody": "Yoshihiro Togashi publicou algo no X.",
    "milestoneTitle": {
      "inking": "Capítulo {chapter}: a arte-final está pronta!",
      "background": "Capítulo {chapter}: os fundos estão prontos!",
      "delivered": "O capítulo {chapter} foi entregue à Jump!",
      "scheduled": "O capítulo {chapter} já tem data de publicação!",
      "published": "O capítulo {chapter} saiu!"
    },
    "milestoneBody": {
      "inking": "Togashi terminou a arte-final dos personagens.",
      "background": "As instruções de fundos estão concluídas.",
      "delivered": "O manuscrito concluído já está com a Jump.",
      "scheduled": "A Jump programou a publicação.",
      "published": "Boa leitura."
    },
    "statuses": {
      "inking": "arte-final pronta",
      "background": "fundos prontos",
      "delivered": "na Jump",
      "scheduled": "programado",
      "published": "disponível"
    },
    "manyChapters": "{count} capítulos avançaram!",
    "chapterLine": "{chapter}: {label}",
    "hiatusTitle": "Hunter × Hunter entra em hiato",
    "hiatusBody": "Nenhum capítulo novo está programado por enquanto.",
    "publishingTitle": "Hunter × Hunter voltou!",
    "publishingBody": "A Jump já programou o próximo capítulo."
  },
  "zh": {
    "enabledTitle": "富坚动态提醒已开启",
    "enabledBody": "富坚义博发布新动态时，你将收到提醒。",
    "onePost": "富坚发布了新动态",
    "manyPosts": "富坚发布了 {count} 条新动态",
    "fallbackBody": "富坚义博在 X 上发布了新动态。",
    "milestoneTitle": {
      "inking": "第 {chapter} 话：人物描线完成！",
      "background": "第 {chapter} 话：背景指定完成！",
      "delivered": "第 {chapter} 话的原稿已交付集英社！",
      "scheduled": "第 {chapter} 话已确定刊载时间！",
      "published": "第 {chapter} 话已刊载！"
    },
    "milestoneBody": {
      "inking": "富坚义博已完成人物描线。",
      "background": "背景指定书已完成。",
      "delivered": "完成的原稿已经送到集英社。",
      "scheduled": "Jump 已安排刊载。",
      "published": "去读吧。"
    },
    "statuses": {
      "inking": "人物描线完成",
      "background": "背景指定完成",
      "delivered": "已交稿",
      "scheduled": "待刊载",
      "published": "已刊载"
    },
    "manyChapters": "{count} 话的进度有更新！",
    "chapterLine": "第 {chapter} 话：{label}",
    "hiatusTitle": "《全职猎人》进入休刊",
    "hiatusBody": "目前没有新话的刊载安排。",
    "publishingTitle": "《全职猎人》回归了！",
    "publishingBody": "Jump 已安排下一话的刊载。"
  },
  "ar": {
    "enabledTitle": "تنبيهات توغاشي مفعلة",
    "enabledBody": "سيصلك إشعار كلما نشر يوشيهيرو توغاشي منشورًا جديدًا.",
    "onePost": "منشور جديد من توغاشي",
    "manyPosts": "{count} منشورات جديدة من توغاشي",
    "fallbackBody": "نشر يوشيهيرو توغاشي منشورًا على X.",
    "milestoneTitle": {
      "inking": "الفصل {chapter}: اكتمل تحبير الشخصيات!",
      "background": "الفصل {chapter}: اكتملت الخلفيات!",
      "delivered": "سُلّم الفصل {chapter} إلى Jump!",
      "scheduled": "تحدد موعد نشر الفصل {chapter}!",
      "published": "صدر الفصل {chapter}!"
    },
    "milestoneBody": {
      "inking": "أنهى توغاشي تحبير الشخصيات.",
      "background": "اكتملت تعليمات الخلفيات.",
      "delivered": "المخطوطة المكتملة الآن لدى Jump.",
      "scheduled": "حددت Jump موعد نشره.",
      "published": "اقرأه الآن."
    },
    "statuses": {
      "inking": "مُحبَّر",
      "background": "الخلفيات مكتملة",
      "delivered": "لدى Jump",
      "scheduled": "مجدول",
      "published": "متاح الآن"
    },
    "manyChapters": "{count} فصول تقدمت!",
    "chapterLine": "{chapter}: {label}",
    "hiatusTitle": "هانتر × هانتر يدخل فترة توقف",
    "hiatusBody": "لا يوجد فصل جديد مجدول في الوقت الحالي.",
    "publishingTitle": "عاد هانتر × هانتر!",
    "publishingBody": "جدولت Jump الفصل القادم."
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
