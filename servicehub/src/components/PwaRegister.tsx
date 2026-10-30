"use client";

import { useEffect } from "react";
import { getPendingBookings, removePendingBooking, savePendingBooking } from "@/lib/booking-queue";
import { hasActivePush, registerNotificationsWorker } from "@/lib/notifications-client";

async function syncOfflineBookings() {
  if (!navigator.onLine) return;
  for (const booking of await getPendingBookings()) {
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(booking),
      });
      if (!response.ok) throw new Error("Sync failed.");
      await removePendingBooking(booking.clientRequestId);
    } catch {
      await savePendingBooking({ ...booking, state: "SYNC_FAILED", error: "Sync failed — Retry" });
    }

  }
}

async function monitorProviderBookings() {
  if (!navigator.onLine || !("serviceWorker" in navigator) || !("Notification" in window) || Notification.permission !== "granted" || hasActivePush()) {
    return;
  }
  const userResponse = await fetch("/api/auth/me", { cache: "no-store" });
  if (!userResponse.ok) return;
  const { user } = await userResponse.json();
  if (user?.role !== "PROVIDER") return;

  const response = await fetch("/api/bookings", { cache: "no-store" });
  if (!response.ok) return;
  const { bookings } = await response.json();
  const pendingBookings = bookings.filter((booking: { status: string }) => booking.status === "PENDING");
  const knownKey = `servicehub-known-bookings-${user.id}`;
  let knownIds: string[] = [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(knownKey) || "[]");
    if (Array.isArray(stored)) knownIds = stored.filter((id): id is string => typeof id === "string");
  } catch {
    // Recover from old or damaged local notification history.
  }
  const knownSet = new Set(knownIds);
  const newBookings = pendingBookings.filter(
    (booking: { id: string }) => !knownSet.has(booking.id),
  );
  if (newBookings.length === 0) return;

  const registration = await registerNotificationsWorker();
  for (const booking of newBookings) {
    await registration.showNotification("New booking request", {
      body: `${booking.serviceTitle} has a new service request.`,
      icon: "/icons/icon-192.png",
      tag: `servicehub-booking-${booking.id}`,
      data: { url: "/bookings" },
    });
    knownSet.add(booking.id);
    localStorage.setItem(knownKey, JSON.stringify([...knownSet]));
  }
}

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      registerNotificationsWorker().catch((error: unknown) => {
        console.error("Service worker registration failed", error);
      });
    }
    syncOfflineBookings().catch((error: unknown) => console.error("Offline booking sync failed", error));
    window.addEventListener("online", syncOfflineBookings);
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        await monitorProviderBookings();
      } catch (error) {
        console.error("Booking notification check failed", error);
      } finally {
        checking = false;
      }
    };
    const timer = window.setInterval(() => {
      void check();
    }, 5000);
    void check();
    window.addEventListener("servicehub-notifications-enabled", check);
    return () => {
      window.removeEventListener("online", syncOfflineBookings);
      window.clearInterval(timer);
      window.removeEventListener("servicehub-notifications-enabled", check);
    };
  }, []);

  return null;
}
