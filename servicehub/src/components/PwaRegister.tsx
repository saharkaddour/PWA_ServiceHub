"use client";

import { useEffect } from "react";
import { getPendingBookings, removePendingBooking, savePendingBooking } from "@/lib/booking-queue";

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
  if (!navigator.onLine || !("Notification" in window) || Notification.permission !== "granted") {
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
  const knownIds = JSON.parse(localStorage.getItem(knownKey) || "[]") as string[];
  const knownSet = new Set(knownIds);
  const newBookings = pendingBookings.filter(
    (booking: { id: string }) => !knownSet.has(booking.id),
  );
  localStorage.setItem(knownKey, JSON.stringify(pendingBookings.map((booking: { id: string }) => booking.id)));
  if (newBookings.length === 0) return;

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification("New booking request", {
    body: `${newBookings[0].serviceTitle} has a new service request.`,
    icon: "/icons/icon-192.png",
    tag: `servicehub-booking-${newBookings[0].id}`,
    data: { url: "/bookings" },
  });
}

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Service worker registration failed", error);
      });
    }
    syncOfflineBookings().catch((error: unknown) => console.error("Offline booking sync failed", error));
    window.addEventListener("online", syncOfflineBookings);
    const timer = window.setInterval(() => {
      monitorProviderBookings().catch((error: unknown) => {
        console.error("Booking notification check failed", error);
      });
    }, 5000);
    monitorProviderBookings().catch((error: unknown) => {
      console.error("Initial booking notification check failed", error);
    });
    return () => {
      window.removeEventListener("online", syncOfflineBookings);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
