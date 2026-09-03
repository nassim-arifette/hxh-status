"use client";

import { Bell, BellOff, BellRing, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Locale, Messages } from "@/lib/i18n";

type PushState =
  | "checking"
  | "off"
  | "on"
  | "enabling"
  | "disabling"
  | "denied"
  | "unsupported"
  | "error";

type PublicKeyResponse = {
  publicKey: string;
  testAvailable?: boolean;
};

type PushNotificationControlProps = {
  locale: Locale;
  messages: Messages["notifications"];
};

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok || !data) {
    throw new Error(data?.error ?? `Request failed (${response.status}).`);
  }

  return data;
}

export default function PushNotificationControl({
  locale,
  messages,
}: PushNotificationControlProps) {
  const [state, setState] = useState<PushState>("checking");
  const [feedback, setFeedback] = useState("");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushConfig = useRef<PublicKeyResponse | null>(null);

  function showFeedback(message: string) {
    setFeedback(message);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(""), 5500);
  }

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function inspectSubscription() {
      const isSupported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!isSupported) {
        if (!cancelled) setState("unsupported");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription =
          (await registration?.pushManager.getSubscription()) ?? null;

        if (cancelled) return;

        if (Notification.permission === "denied") {
          setState("denied");
          return;
        }

        if (subscription) {
          setState("on");
          void fetch("/api/push/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale, subscription: subscription.toJSON() }),
          });
          return;
        }

        const keyResponse = await fetch("/api/push/public-key", {
          cache: "no-store",
        });
        pushConfig.current =
          await parseJsonResponse<PublicKeyResponse>(keyResponse);
        if (!cancelled) setState("off");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void inspectSubscription();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const busy =
    state === "checking" ||
    state === "enabling" ||
    state === "disabling";
  const subscribed = state === "on" || state === "disabling";

  async function enableNotifications() {
    const config = pushConfig.current;
    if (!config) {
      setState("error");
      showFeedback(messages.setupError);
      return;
    }

    setState("enabling");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState("denied");
        showFeedback(messages.permissionDenied);
        return;
      }

      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(config.publicKey),
        }));

      await parseJsonResponse(
        await fetch("/api/push/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, subscription: subscription.toJSON() }),
        }),
      );

      setState("on");
      showFeedback(messages.enabledBody);

      try {
        if (config.testAvailable) {
          await parseJsonResponse(
            await fetch("/api/push/test", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            }),
          );
        } else {
          await registration.showNotification(messages.enabledTitle, {
            body: messages.enabledBody,
            icon: "/favicon.svg",
            badge: "/favicon.svg",
            tag: "hxhstatus-notifications-enabled",
            data: { url: "/" },
          });
        }
      } catch {
        // Confirmation is best-effort; the push subscription is already active.
      }
    } catch {
      setState("error");
      showFeedback(messages.setupError);
    }
  }

  async function disableNotifications() {
    setState("disabling");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => null);
        await subscription.unsubscribe();
      }

      setState("off");
      showFeedback(messages.disabled);
    } catch {
      setState("error");
      showFeedback(messages.setupError);
    }
  }

  const label =
    state === "on"
      ? messages.on
      : state === "enabling"
        ? messages.enabling
        : state === "disabling"
          ? messages.disabling
          : state === "denied"
            ? messages.blocked
            : state === "unsupported"
              ? messages.unsupported
              : state === "error"
              ? messages.tryAgain
              : messages.enable;
  const Icon = busy
    ? LoaderCircle
    : state === "denied" || state === "unsupported"
      ? BellOff
      : subscribed
        ? BellRing
        : Bell;

  return (
    <div className="push-notification-control">
      <button
        aria-label={subscribed ? messages.disable : messages.description}
        aria-pressed={subscribed}
        className="push-notification-button"
        data-state={state}
        disabled={busy || state === "unsupported"}
        onClick={subscribed ? disableNotifications : enableNotifications}
        title={subscribed ? messages.disable : messages.description}
        type="button"
      >
        <Icon
          aria-hidden="true"
          className={busy ? "push-notification-spinner" : undefined}
          size={15}
          strokeWidth={2}
        />
        <span className="push-notification-label">{label}</span>
      </button>
      {feedback ? (
        <p
          className="push-notification-feedback"
          data-error={state === "error" || state === "denied"}
          role="status"
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
