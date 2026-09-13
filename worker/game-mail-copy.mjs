const copy = {
  "en": {
    "saved": "{name}, your prediction is saved",
    "choice": "You picked {date} for chapter {chapter}.",
    "confirmHint": "Confirm your address to receive the results after publication.",
    "confirm": "Confirm my email",
    "prediction": "My prediction",
    "challenge": "Challenge my friends",
    "unsubscribe": "Unsubscribe",
    "results": "{name}, chapter {chapter} results",
    "outcome": "Chapter {chapter} came out on {actual}. Your prediction: {date}. Days away: {distance}.",
    "rank": "Your rank: {rank} of {count} predictions. Community middle date: {median}.",
    "group": "Challenge {number}: {rank} of {count}."
  },
  "fr": {
    "saved": "{name}, ton pronostic est enregistré",
    "choice": "Tu mises sur le {date} pour le chapitre {chapter}.",
    "confirmHint": "Confirme ton adresse pour recevoir les résultats après la publication.",
    "confirm": "Confirmer mon email",
    "prediction": "Retrouver mon pronostic",
    "challenge": "Défier mes amis",
    "unsubscribe": "Me désabonner",
    "results": "{name}, les résultats du chapitre {chapter}",
    "outcome": "Le chapitre {chapter} est sorti le {actual}. Ton pronostic : {date}. Écart en jours : {distance}.",
    "rank": "Ton rang : {rank} sur {count} pronostics. Date médiane : {median}.",
    "group": "Défi {number} : {rank} sur {count}."
  },
  "es": {
    "saved": "{name}, tu pronóstico está guardado",
    "choice": "Elegiste el {date} para el capítulo {chapter}.",
    "confirmHint": "Confirma tu correo para recibir los resultados tras la publicación.",
    "confirm": "Confirmar mi correo",
    "prediction": "Mi pronóstico",
    "challenge": "Retar a mis amigos",
    "unsubscribe": "Dar de baja",
    "results": "{name}, resultados del capítulo {chapter}",
    "outcome": "El capítulo {chapter} salió el {actual}. Tu pronóstico: {date}. Diferencia en días: {distance}.",
    "rank": "Tu puesto: {rank} de {count} pronósticos. Fecha mediana: {median}.",
    "group": "Reto {number}: {rank} de {count}."
  },
  "pt": {
    "saved": "{name}, seu palpite foi salvo",
    "choice": "Você escolheu {date} para o capítulo {chapter}.",
    "confirmHint": "Confirme seu email para receber os resultados após a publicação.",
    "confirm": "Confirmar meu email",
    "prediction": "Meu palpite",
    "challenge": "Desafiar meus amigos",
    "unsubscribe": "Cancelar inscrição",
    "results": "{name}, resultados do capítulo {chapter}",
    "outcome": "O capítulo {chapter} saiu em {actual}. Seu palpite: {date}. Diferença em dias: {distance}.",
    "rank": "Sua posição: {rank} entre {count} palpites. Data mediana: {median}.",
    "group": "Desafio {number}: {rank} de {count}."
  },
  "ja": {
    "saved": "{name}さん、予想を保存しました",
    "choice": "第{chapter}話の予想日は{date}です。",
    "confirmHint": "メールアドレスを確認すると、公開後に結果が届きます。",
    "confirm": "メールアドレスを確認",
    "prediction": "自分の予想を見る",
    "challenge": "友達と勝負",
    "unsubscribe": "配信停止",
    "results": "{name}さん、第{chapter}話の予想結果",
    "outcome": "第{chapter}話の公開日は{actual}でした。予想日：{date}。差：{distance}日。",
    "rank": "順位：{count}件中{rank}位。みんなの予想の中央値：{median}。",
    "group": "チャレンジ{number}：{count}人中{rank}位。"
  },
  "zh": {
    "saved": "{name}，你的预测已保存",
    "choice": "你为第{chapter}话选择的日期是{date}。",
    "confirmHint": "请确认邮箱，章节发布后即可收到结果。",
    "confirm": "确认邮箱",
    "prediction": "查看我的预测",
    "challenge": "挑战好友",
    "unsubscribe": "取消订阅",
    "results": "{name}，第{chapter}话的预测结果",
    "outcome": "第{chapter}话于{actual}发布。你的预测：{date}。相差{distance}天。",
    "rank": "你在{count}个预测中排名第{rank}。中位日期：{median}。",
    "group": "挑战{number}：{count}人中排名第{rank}。"
  },
  "ar": {
    "saved": "{name}، تم حفظ توقعك",
    "choice": "اخترت {date} للفصل {chapter}.",
    "confirmHint": "أكد بريدك لتصلك النتائج بعد النشر.",
    "confirm": "تأكيد بريدي",
    "prediction": "عرض توقعي",
    "challenge": "تحدي أصدقائي",
    "unsubscribe": "إلغاء الاشتراك",
    "results": "{name}، نتائج الفصل {chapter}",
    "outcome": "صدر الفصل {chapter} في {actual}. توقعك: {date}. الفارق بالأيام: {distance}.",
    "rank": "ترتيبك: {rank} من {count} توقعات. التاريخ الوسيط: {median}.",
    "group": "التحدي {number}: {rank} من {count}."
  }
};
export const mailLocale = locale => Object.hasOwn(copy, locale) ? locale : "en";
export const mailText = (locale, key, values = {}) => copy[mailLocale(locale)][key].replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
