"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierListing } from "@/lib/suppliers";
import styles from "./SupplierForm.module.css";

const DRAFT_KEY = "servicehub-supplier-listing-draft";

export default function SupplierForm({ listing }: { listing?: SupplierListing }) {
  const router = useRouter();
  const isDraftHydrated = useRef(Boolean(listing));
  const [name, setName] = useState(listing?.name ?? "");
  const [category, setCategory] = useState(listing?.category ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [price, setPrice] = useState(listing?.price.toString() ?? "");
  const [isDraft, setIsDraft] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (listing) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) {
      isDraftHydrated.current = true;
      return;
    }
    try {
      const draft = JSON.parse(saved) as Partial<Record<string, string>>;
      window.setTimeout(() => {
        setName(draft.name ?? "");
        setCategory(draft.category ?? "");
        setDescription(draft.description ?? "");
        setPrice(draft.price ?? "");
        setIsDraft(true);
        isDraftHydrated.current = true;
      }, 0);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
      isDraftHydrated.current = true;
    }
  }, [listing]);

  useEffect(() => {
    if (listing || !isDraftHydrated.current) return;
    const draft = { name, category, description, price };
    if (Object.values(draft).some((value) => value.trim().length > 0)) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [category, description, listing, name, price]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      if (!navigator.onLine) {
        setIsDraft(true);
        throw new Error("You are offline. Reconnect to publish this draft.");
      }

      const response = await fetch(
        listing ? `/api/suppliers/${listing.id}` : "/api/suppliers",
        {
          method: listing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, category, description, price: Number(price) }),
        },
      );
      const data: { listing?: SupplierListing; error?: string } = await response.json();
      if (!response.ok || !data.listing) throw new Error(data.error || "Listing could not be saved.");
      if (!listing) localStorage.removeItem(DRAFT_KEY);
      router.push("/my-suppliers");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Listing could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {isDraft && <p className={styles.draft}>Draft not submitted</p>}
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
      <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={60} required /></label>
      <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={5} required /></label>
      <label>Price<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></label>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : listing ? "Save changes" : "Publish listing"}</button>
    </form>
  );
}
