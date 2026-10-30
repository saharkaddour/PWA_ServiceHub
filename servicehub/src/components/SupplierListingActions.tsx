"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./SupplierListings.module.css";

export default function SupplierListingActions({
  listingId,
  listingName,
}: {
  listingId: string;
  listingName: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm(`Delete "${listingName}" permanently?`)) {
      return;
    }

    setError("");
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/suppliers/${listingId}`, {
        method: "DELETE",
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Listing could not be deleted.");
      }

      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Listing could not be deleted.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={styles.actions}>
      <Link href={`/suppliers/${listingId}/edit`} className={styles.edit}>
        Edit
      </Link>
      <button
        type="button"
        className={styles.delete}
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting…" : "Delete"}
      </button>
      {error && <p className={styles.actionError}>{error}</p>}
    </div>
  );
}
