"use client";

import { useEffect, useState } from "react";
import type { Booking, BookingStatus } from "@/lib/bookings";
import { getPendingBookings, removePendingBooking, savePendingBooking, type PendingBooking } from "@/lib/booking-queue";
import styles from "./BookingsList.module.css";

const labels: Record<BookingStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export default function BookingsList({
  initialBookings,
  role,
}: {
  initialBookings: Booking[];
  role: "CUSTOMER" | "PROVIDER";
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [pending, setPending] = useState<PendingBooking[]>([]);
  const [error, setError] = useState("");

  async function sync() {
    if (!navigator.onLine) return;
    const queued = await getPendingBookings();
    for (const item of queued) {
      try {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!response.ok) throw new Error("Sync failed.");
        const data: { booking: Booking } = await response.json();
        await removePendingBooking(item.clientRequestId);
        setBookings((current) => [data.booking, ...current.filter((booking) => booking.clientRequestId !== data.booking.clientRequestId)]);
      } catch {
        await savePendingBooking({ ...item, state: "SYNC_FAILED", error: "Sync failed — Retry" });
      }
    }
    setPending(await getPendingBookings());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getPendingBookings().then(setPending).catch(() => setError("Offline requests could not be loaded."));
      sync().catch(() => setError("Requests could not be synchronized."));
    }, 0);
    window.addEventListener("online", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", sync);
    };
  }, []);

  async function updateStatus(id: string, status: BookingStatus) {
    setError("");
    const response = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data: { booking?: Booking; error?: string } = await response.json();
    if (!response.ok || !data.booking) {
      setError(data.error || "Booking status could not be updated.");
      return;
    }
    setBookings((current) => current.map((booking) => booking.id === id ? data.booking! : booking));
  }

  return (
    <main className={styles.page}>
      <p>Booking requests</p>
      <h1>{initialBookings.length ? "Your requests" : "No requests yet"}</h1>
      {error && <p className={styles.error}>{error}</p>}
      {pending.map((item) => (
        <article className={styles.card} key={item.clientRequestId}>
          <h2>{item.serviceTitle}</h2>
          <p>Preferred date: {item.preferredDate}</p>
          <strong>{item.state === "SYNC_FAILED" ? "Sync failed — Retry" : "Pending sync"}</strong>
          {item.state === "SYNC_FAILED" && <button type="button" onClick={sync}>Retry</button>}
        </article>
      ))}
      {bookings.map((booking) => (
        <article className={styles.card} key={booking.id}>
          <h2>{booking.serviceTitle}</h2>
          <p>Preferred date: {booking.preferredDate}</p>
          {booking.note && <p>{booking.note}</p>}
          <strong>{labels[booking.status]}</strong>
          {booking.status === "PENDING" && (
            <div className={styles.actions}>
              {role === "CUSTOMER" ? (
                <button type="button" onClick={() => updateStatus(booking.id, "CANCELLED")}>Cancel request</button>
              ) : (
                <>
                  <button type="button" onClick={() => updateStatus(booking.id, "ACCEPTED")}>Accept</button>
                  <button type="button" onClick={() => updateStatus(booking.id, "REJECTED")}>Reject</button>
                </>
              )}
            </div>
          )}
        </article>
      ))}
    </main>
  );
}
