"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, LoaderCircle, Share2 } from "lucide-react";

import { formatMessage, type Messages } from "@/lib/i18n";

type CaptureAction = "copy" | "share";

type CaptureFeedback = {
  action: CaptureAction;
  label: string;
  message: string;
  tone: "error" | "ready" | "success";
};

type ImageAsset = {
  blob: Blob;
  file: File;
};

type SectionCaptureActionsProps = {
  fileName: string;
  imageUrl: string;
  label: string;
  messages: Messages["captureActions"];
};

function downloadImage(imageUrl: string, fileName: string) {
  const link = document.createElement("a");

  link.href = imageUrl;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
}

function isErrorNamed(error: unknown, name: string) {
  return error instanceof DOMException && error.name === name;
}

export default function SectionCaptureActions({
  fileName,
  imageUrl,
  label,
  messages,
}: SectionCaptureActionsProps) {
  const assetRef = useRef<ImageAsset | null>(null);
  const assetPromiseRef = useRef<Promise<ImageAsset> | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const [busy, setBusy] = useState<CaptureAction | null>(null);
  const [feedback, setFeedback] = useState<CaptureFeedback | null>(null);

  useEffect(
    () => () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    },
    [],
  );

  function clearFeedback() {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }

    setFeedback(null);
  }

  function showFeedback(nextFeedback: CaptureFeedback) {
    clearFeedback();
    setFeedback(nextFeedback);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 4000);
  }

  function getImageAsset(): Promise<ImageAsset> {
    if (assetRef.current) {
      return Promise.resolve(assetRef.current);
    }

    if (assetPromiseRef.current) {
      return assetPromiseRef.current;
    }

    const assetPromise = fetch(imageUrl, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Image request failed with ${response.status}.`);
        }

        const blob = await response.blob();

        if (blob.type !== "image/png") {
          throw new Error("The share asset is not a PNG image.");
        }

        return {
          blob,
          file: new File([blob], fileName, { type: "image/png" }),
        };
      })
      .then((asset) => {
        assetRef.current = asset;
        return asset;
      })
      .catch((error: unknown) => {
        assetPromiseRef.current = null;
        throw error;
      });

    assetPromiseRef.current = assetPromise;
    return assetPromise;
  }

  function warmImage() {
    void getImageAsset().catch(() => undefined);
  }

  async function handleCopy() {
    clearFeedback();
    setBusy("copy");

    try {
      const supportsPng =
        typeof ClipboardItem !== "undefined" &&
        (typeof ClipboardItem.supports !== "function" ||
          ClipboardItem.supports("image/png"));
      const canCopyImage =
        supportsPng && typeof navigator.clipboard?.write === "function";

      if (!canCopyImage) {
        downloadImage(imageUrl, fileName);
        showFeedback({
          action: "copy",
          label: messages.downloaded,
          message: formatMessage(messages.copyUnavailable, { label }),
          tone: "success",
        });
        return;
      }

      const assetPromise = getImageAsset();
      const pngPromise = assetPromise.then(({ blob }) => blob);

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngPromise }),
        ]);
        showFeedback({
          action: "copy",
          label: messages.copied,
          message: formatMessage(messages.copySuccess, { label }),
          tone: "success",
        });
      } catch {
        await assetPromise;
        downloadImage(imageUrl, fileName);
        showFeedback({
          action: "copy",
          label: messages.downloaded,
          message: formatMessage(messages.copyFallback, { label }),
          tone: "success",
        });
      }
    } catch {
      showFeedback({
        action: "copy",
        label: messages.tryAgain,
        message: formatMessage(messages.loadError, { label }),
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    clearFeedback();
    setBusy("share");

    try {
      if (
        typeof navigator.share !== "function" ||
        typeof navigator.canShare !== "function"
      ) {
        downloadImage(imageUrl, fileName);
        showFeedback({
          action: "share",
          label: messages.downloaded,
          message: formatMessage(messages.shareUnavailable, { label }),
          tone: "success",
        });
        return;
      }

      const hadCachedAsset = assetRef.current !== null;
      const { file } = await getImageAsset();
      const shareData: ShareData = {
        files: [file],
        text: formatMessage(messages.shareText, { label }),
        title: formatMessage(messages.shareTitle, { label }),
      };
      const fileOnlyShareData: ShareData = { files: [file] };

      if (!navigator.canShare(fileOnlyShareData)) {
        downloadImage(imageUrl, fileName);
        showFeedback({
          action: "share",
          label: messages.downloaded,
          message: formatMessage(messages.shareUnavailable, { label }),
          tone: "success",
        });
        return;
      }

      try {
        await navigator.share(
          navigator.canShare(shareData) ? shareData : fileOnlyShareData,
        );
        showFeedback({
          action: "share",
          label: messages.shared,
          message: formatMessage(messages.shareSuccess, { label }),
          tone: "success",
        });
      } catch (error) {
        if (isErrorNamed(error, "AbortError")) {
          return;
        }

        if (!hadCachedAsset && isErrorNamed(error, "NotAllowedError")) {
          showFeedback({
            action: "share",
            label: messages.shareReady,
            message: messages.shareReadyMessage,
            tone: "ready",
          });
          return;
        }

        downloadImage(imageUrl, fileName);
        showFeedback({
          action: "share",
          label: messages.downloaded,
          message: formatMessage(messages.shareFallback, { label }),
          tone: "success",
        });
      }
    } catch {
      showFeedback({
        action: "share",
        label: messages.tryAgain,
        message: formatMessage(messages.loadError, { label }),
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  const copyFeedback = feedback?.action === "copy" ? feedback : null;
  const shareFeedback = feedback?.action === "share" ? feedback : null;
  const copyButtonLabel =
    busy === "copy"
      ? messages.preparing
      : (copyFeedback?.label ?? messages.copy);
  const shareButtonLabel =
    busy === "share"
      ? messages.preparing
      : (shareFeedback?.label ?? messages.share);
  const CopyIcon =
    busy === "copy"
      ? LoaderCircle
      : copyFeedback?.tone === "success"
        ? Check
        : Copy;
  const ShareIcon =
    busy === "share"
      ? LoaderCircle
      : shareFeedback?.tone === "success"
        ? Check
        : Share2;

  return (
    <div className="capture-actions" onPointerEnter={warmImage}>
      <button
        aria-busy={busy === "share"}
        aria-label={formatMessage(messages.buttonAria, {
          action: shareButtonLabel,
          label,
        })}
        className="capture-action"
        data-state={shareFeedback?.tone}
        disabled={busy !== null}
        onClick={handleShare}
        onFocus={warmImage}
        onPointerDown={warmImage}
        type="button"
      >
        <ShareIcon
          aria-hidden="true"
          className={
            busy === "share"
              ? "capture-action-icon is-loading"
              : "capture-action-icon"
          }
          size={15}
          strokeWidth={2}
        />
        <span>{shareButtonLabel}</span>
      </button>
      <button
        aria-busy={busy === "copy"}
        aria-label={formatMessage(messages.buttonAria, {
          action: copyButtonLabel,
          label,
        })}
        className="capture-action"
        data-state={copyFeedback?.tone}
        disabled={busy !== null}
        onClick={handleCopy}
        onFocus={warmImage}
        onPointerDown={warmImage}
        type="button"
      >
        <CopyIcon
          aria-hidden="true"
          className={
            busy === "copy"
              ? "capture-action-icon is-loading"
              : "capture-action-icon"
          }
          size={15}
          strokeWidth={2}
        />
        <span>{copyButtonLabel}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {feedback?.message}
      </span>
    </div>
  );
}
