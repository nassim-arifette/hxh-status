"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, LoaderCircle, Share2 } from "lucide-react";

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
          label: "Downloaded",
          message: `Image copying is unavailable, so ${label} was downloaded as a PNG.`,
          tone: "success",
        });
        return;
      }

      const pngPromise = getImageAsset().then(({ blob }) => blob);

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngPromise }),
        ]);
        showFeedback({
          action: "copy",
          label: "Copied",
          message: `${label} copied as a PNG image.`,
          tone: "success",
        });
      } catch {
        downloadImage(imageUrl, fileName);
        showFeedback({
          action: "copy",
          label: "Downloaded",
          message: `${label} could not be copied, so the PNG was downloaded instead.`,
          tone: "success",
        });
      }
    } catch {
      showFeedback({
        action: "copy",
        label: "Try again",
        message: `${label} could not be loaded.`,
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
      const probeFile =
        assetRef.current?.file ??
        new File([], fileName, { type: "image/png" });
      const canShareImage =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [probeFile] });

      if (!canShareImage) {
        downloadImage(imageUrl, fileName);
        showFeedback({
          action: "share",
          label: "Downloaded",
          message: `Image sharing is unavailable, so ${label} was downloaded as a PNG.`,
          tone: "success",
        });
        return;
      }

      if (!assetRef.current) {
        await getImageAsset();
        showFeedback({
          action: "share",
          label: "Share ready",
          message: "Image ready. Tap Share again to open your share sheet.",
          tone: "ready",
        });
        return;
      }

      const shareData: ShareData = {
        files: [assetRef.current.file],
        text: `${label} from hxhstatus.com`,
        title: `${label} - HxH Status`,
      };

      try {
        await navigator.share(shareData);
        showFeedback({
          action: "share",
          label: "Shared",
          message: `${label} shared as a PNG image.`,
          tone: "success",
        });
      } catch (error) {
        if (isErrorNamed(error, "AbortError")) {
          return;
        }

        downloadImage(imageUrl, fileName);
        showFeedback({
          action: "share",
          label: "Downloaded",
          message: `${label} could not be shared, so the PNG was downloaded instead.`,
          tone: "success",
        });
      }
    } catch {
      showFeedback({
        action: "share",
        label: "Try again",
        message: `${label} could not be loaded.`,
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  const copyFeedback = feedback?.action === "copy" ? feedback : null;
  const shareFeedback = feedback?.action === "share" ? feedback : null;
  const copyButtonLabel =
    busy === "copy" ? "Preparing" : (copyFeedback?.label ?? "Copy");
  const shareButtonLabel =
    busy === "share" ? "Preparing" : (shareFeedback?.label ?? "Share");
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
        aria-label={`${shareButtonLabel}: ${label} PNG image`}
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
        aria-label={`${copyButtonLabel}: ${label} PNG image`}
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
