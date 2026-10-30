"use client";

import { useState } from "react";
import { savePendingBooking } from "@/lib/booking-queue";
import styles from "./BookingRequest.module.css";

export default function BookingRequest({
  serviceId,
  serviceTitle,
}: {
  serviceId: string;
  serviceTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const clientRequestId = crypto.randomUUID();
    const payload = { serviceId, preferredDate, note, clientRequestId, serviceTitle };
    if (!navigator.onLine) {
      await savePendingBooking({
        ...payload,
        state: "PENDING_SYNC",
      });
      setMessage("Pending sync — your request will be sent when you reconnect.");
      setOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "Request could not be sent.");
      setMessage("Request sent — check Bookings for its status.");
      setOpen(false);
      setPreferredDate("");
      setNote("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request could not be sent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.section}>
      {!open && (
        <button type="button" className={styles.request} onClick={() => setOpen(true)}>
          Request service
        </button>
      )}
      {open && (
        <form className={styles.form} onSubmit={submit}>
          <h2>Request this service</h2>
          <label>
            Preferred date
            <input
              type="date"
              value={preferredDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setPreferredDate(event.target.value)}
              required
            />
          </label>
          <label>
            Note <span>(optional)</span>
            <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className={styles.actions}>
            <button type="submit" className={styles.request} disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send request"}
            </button>
            <button type="button" className={styles.cancel} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      )}
      {message && <p className={styles.message}>{message}</p>}
    </section>
  );
}
