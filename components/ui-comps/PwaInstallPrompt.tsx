"use client";

import { useEffect, useState } from "react";
import { Paper, Group, Text, Button, ActionIcon } from "@mantine/core";
import { IconX, IconDownload } from "@tabler/icons-react";

const DISMISS_KEY = "qitb-pwa-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own non-standard flag for "launched from home screen"
    (window.navigator as any).standalone === true
  );
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  // Register the service worker regardless of whether we show any install UI.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    }
  }, []);

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    if (isIOS()) {
      // iOS Safari has no beforeinstallprompt API at all - the only way to
      // "install" is Share -> Add to Home Screen, so just point that out.
      setIosHint(true);
      setVisible(true);
      return;
    }

    const handler = (event: any) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "true");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Paper
      shadow="md"
      radius="md"
      p="sm"
      withBorder
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 1000,
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="sm" style={{ flex: 1 }}>
          {iosHint
            ? "Install QITB: tap Share, then \"Add to Home Screen\"."
            : "Install QITB for quicker, offline-capable access."}
        </Text>
        {!iosHint && (
          <Button size="xs" leftSection={<IconDownload size={14} />} onClick={install}>
            Install
          </Button>
        )}
        <ActionIcon variant="subtle" size="sm" onClick={dismiss} aria-label="Dismiss">
          <IconX size={14} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
