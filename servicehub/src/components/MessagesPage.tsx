"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Message, MessageConversation } from "@/lib/messages";
import styles from "./MessagesPage.module.css";

export default function MessagesPage({ initialConversations, currentUserId }: {
  initialConversations: MessageConversation[];
  currentUserId: string;
}) {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState(initialConversations);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const threadEnd = useRef<HTMLDivElement>(null);
  const requestedBooking = searchParams.get("booking");
  const selected = requestedBooking
    ? conversations.find((conversation) => conversation.bookingId === requestedBooking)
    : conversations[0];
  const selectedId = selected?.bookingId;
  const messageCount = selected?.messages.length ?? 0;

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId, messageCount]);

  useEffect(() => {
    let stopped = false;
    let loading = false;
    let controller: AbortController | undefined;
    async function refresh() {
      if (loading || document.hidden) return;
      loading = true;
      controller = new AbortController();
      try {
        const response = await fetch("/api/messages", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Messages could not be refreshed.");
        if (stopped) return;
        const incoming: MessageConversation[] = data.conversations;
        setConversations((current) => incoming.map((conversation) => {
          // A refresh started before a send may finish after it; preserve that sent message.
          const previous = current.find((item) => item.bookingId === conversation.bookingId);
          const messages = new Map(previous?.messages.map((message) => [message.id, message]));
          for (const message of conversation.messages) messages.set(message.id, message);
          return { ...conversation, messages: [...messages.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) };
        }));
        setRefreshError("");
      } catch (error) {
        if (!stopped) setRefreshError(error instanceof Error ? error.message : "Messages could not be refreshed.");
      } finally {
        loading = false;
      }
    }
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || sending) return;
    const bookingId = selected.bookingId;
    const draft = drafts[bookingId] ?? "";
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setSendError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, text }),
      });
      const data: { message?: Message; error?: string } = await response.json();
      const message = data.message;
      if (!response.ok || !message) throw new Error(data.error || "Message could not be sent.");
      setConversations((current) => current.map((conversation) => conversation.bookingId === bookingId
        ? { ...conversation, messages: [...conversation.messages.filter((item) => item.id !== message.id), message].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }
        : conversation));
      setDrafts((current) => current[bookingId] === draft ? { ...current, [bookingId]: "" } : current);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Message could not be sent. Please retry.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={styles.page}>
      <h1>Messages</h1>
      <p className={styles.intro}>Talk with your customer or provider about a booking.</p>
      {refreshError && <p className={styles.error} role="status">{refreshError} Retrying automatically.</p>}
      {conversations.length === 0 ? (
        <div className={styles.empty}>
          <h2>No conversations yet</h2>
          <p>Conversations become available when a service is booked.</p>
          <Link href="/services">Browse services</Link>
        </div>
      ) : (
        <div className={styles.layout}>
          <nav className={styles.sidebar} aria-label="Booking conversations">
            {conversations.map((conversation) => {
              const latest = conversation.messages.at(-1);
              return (
                <Link key={conversation.bookingId} href={`/messages?booking=${encodeURIComponent(conversation.bookingId)}`}
                  aria-current={selectedId === conversation.bookingId ? "page" : undefined}>
                  <strong>{conversation.serviceTitle}</strong>
                  <small>Booking {conversation.bookingId.slice(0, 8)}</small>
                  <span>{latest?.text || "Start a conversation"}</span>
                </Link>
              );
            })}
          </nav>
          {selected ? (
            <section className={styles.conversation} aria-label={`Messages about ${selected.serviceTitle}`}>
              <header className={styles.heading}><h2>{selected.serviceTitle}</h2><Link href="/bookings">View bookings</Link></header>
              <div className={styles.thread} role="log" aria-label="Message history" aria-live="polite" aria-relevant="additions">
                {selected.messages.length === 0 && <p className={styles.intro}>No messages yet. Send the first message below.</p>}
                {selected.messages.map((message) => (
                  <article className={`${styles.message} ${message.senderId === currentUserId ? styles.mine : ""}`} key={message.id}>
                    <strong>{message.senderId === currentUserId ? "You" : "Contact"}</strong>
                    <p>{message.text}</p>
                    <time dateTime={message.createdAt}>{message.createdAt.replace("T", " ").slice(0, 16)} UTC</time>
                  </article>
                ))}
                <div ref={threadEnd} />
              </div>
              <form className={styles.composer} onSubmit={send}>
                <label htmlFor="message-text">Your message</label>
                <textarea id="message-text" rows={3} maxLength={2000} required
                  value={drafts[selected.bookingId] ?? ""}
                  onChange={(event) => setDrafts((current) => ({ ...current, [selected.bookingId]: event.target.value }))}
                  placeholder="Write a message about this booking…" />
                {sendError && <p className={styles.error} role="alert">{sendError} Your draft has been kept.</p>}
                <div className={styles.controls}>
                  <small>{(drafts[selected.bookingId] ?? "").length}/2,000</small>
                  <button type="submit" disabled={sending || !(drafts[selected.bookingId] ?? "").trim()}>{sending ? "Sending…" : "Send message"}</button>
                </div>
              </form>
            </section>
          ) : <p className={styles.empty}>This conversation is unavailable. Select one of your bookings.</p>}
        </div>
      )}
    </main>
  );
}
