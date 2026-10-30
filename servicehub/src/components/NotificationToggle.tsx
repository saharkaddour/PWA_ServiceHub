"use client";

import { useEffect, useState } from "react";
import { connectPush, registerNotificationsWorker } from "@/lib/notifications-client";
import styles from "./Navbar.module.css";

export default function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const supported = window.isSecureContext && "Notification" in window && "serviceWorker" in navigator;
      setPermission(supported ? Notification.permission : "unsupported");
      if (supported && Notification.permission === "granted") {
        connectPush(false).then(setPushEnabled).catch(() => {
          setMessage("Background notifications could not reconnect. Click to retry.");
        });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function enable() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !window.isSecureContext) {
      setPermission("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPermission("denied");
      setMessage("Allow notifications in your browser's site settings, then reload.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") {
        setMessage(granted === "denied" ? "Allow notifications in your browser's site settings, then reload." : "Notification permission was not granted.");
        return;
      }
      const registration = await registerNotificationsWorker();
      const connected = await connectPush(true);
      setPushEnabled(connected);
      await registration.showNotification("ServiceHub notifications enabled", {
        body: connected ? "You will receive new booking requests, including when the app is closed." : "You will receive new booking requests while the app is open.",
        icon: "/icons/icon-192.png",
        tag: "servicehub-notifications-enabled",
        data: { url: "/bookings" },
      });
      if (!connected) setMessage("Notifications work while the app is open. Background delivery needs server setup.");
      window.dispatchEvent(new Event("servicehub-notifications-enabled"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Notifications could not be enabled. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  if (permission === "unsupported") return <span role="status">Notifications need a supported browser and HTTPS (or localhost).</span>;
  return (
    <div>
      <button type="button" className={styles.notifications} onClick={enable} disabled={busy} aria-describedby={message ? "notification-status" : undefined}>
        {busy ? "Enabling notifications…" : permission === "granted"
          ? pushEnabled ? "Notifications on" : "Enable background notifications"
          : permission === "denied"
            ? "Notifications blocked"
            : "Enable notifications"}
      </button>
      {message && <p id="notification-status" role="status">{message}</p>}
    </div>
  );
}
