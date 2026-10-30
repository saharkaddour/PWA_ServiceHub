"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Service } from "@/lib/services";
import BookingRequest from "./BookingRequest";
import styles from "./ServiceDetail.module.css";

const SNAPSHOT_PREFIX = "servicehub-service-";

export default function ServiceDetail({
  initialService,
  canEdit = false,
  canRequest = false,
}: {
  initialService: Service;
  canEdit?: boolean;
  canRequest?: boolean;
}) {
  const router = useRouter();
  const [service, setService] = useState(initialService);
  const [isOfflineCopy, setIsOfflineCopy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const key = `${SNAPSHOT_PREFIX}${initialService.id}`;
    localStorage.setItem(key, JSON.stringify(initialService));

    if (!navigator.onLine) {
      const saved = localStorage.getItem(key);
      if (saved) {
        window.setTimeout(() => {
          setService(JSON.parse(saved) as Service);
          setIsOfflineCopy(true);
        }, 0);
      }
      return;
    }

    fetch(`/api/services/${initialService.id}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Service unavailable.");
        const data: { service: Service } = await response.json();
        localStorage.setItem(key, JSON.stringify(data.service));
        setService(data.service);
        setIsOfflineCopy(false);
      })
      .catch(() => setIsOfflineCopy(true));
  }, [initialService]);

  async function handleDelete() {
    if (!window.confirm(`Delete "${service.title}" permanently?`)) {
      return;
    }

    setDeleteError("");
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: "DELETE",
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Service could not be deleted.");
      }

      localStorage.removeItem(`${SNAPSHOT_PREFIX}${service.id}`);
      router.push("/services");
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Service could not be deleted.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link href="/services">← Services</Link>
      <div className={styles.header}>
        <span>{service.category}</span>
        <h1>{service.title}</h1>
        <strong>€{service.price.toFixed(2)}</strong>
      </div>
      {isOfflineCopy && <p className={styles.offline}>Offline copy — may be outdated</p>}
      <div className={styles.card}>
        <p>{service.description}</p>
        {canRequest && <BookingRequest serviceId={service.id} serviceTitle={service.title} />}
        {canEdit && (
          <>
            <div className={styles.actions}>
              <Link href={`/services/${service.id}/edit`} className={styles.edit}>
                Edit service
              </Link>
              <button
                type="button"
                className={styles.delete}
                onClick={handleDelete}
                disabled={isDeleting || isOfflineCopy}
              >
                {isDeleting ? "Deleting…" : "Delete service"}
              </button>
            </div>
            {isOfflineCopy && (
              <p className={styles.mutationHelp}>
                Reconnect to edit or delete this service.
              </p>
            )}
            {deleteError && <p className={styles.error}>{deleteError}</p>}
          </>
        )}
      </div>
    </main>
  );
}
