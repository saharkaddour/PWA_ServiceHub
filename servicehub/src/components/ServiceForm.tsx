"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./ServiceForm.module.css";
import type { Service } from "@/lib/services";

type ServiceFormProps = {
  service?: Service;
};

export default function ServiceForm({ service }: ServiceFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(service?.title ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [category, setCategory] = useState(service?.category ?? "");
  const [price, setPrice] = useState(service?.price.toString() ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(
        service ? `/api/services/${service.id}` : "/api/services",
        {
          method: service ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            category,
            price: Number(price),
          }),
        },
      );
      const data: { service?: Service; error?: string } = await response.json();
      if (!response.ok || !data.service) {
        throw new Error(data.error || "Service could not be saved.");
      }
      router.push(`/services/${data.service.id}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Service could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required /></label>
      <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={5} required /></label>
      <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={60} required /></label>
      <label>Price<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></label>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : service ? "Save changes" : "Publish service"}</button>
    </form>
  );
}
