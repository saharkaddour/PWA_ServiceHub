import Link from "next/link";
import type { SupplierListing } from "@/lib/suppliers";
import SupplierListingActions from "@/components/SupplierListingActions";
import styles from "./SupplierListings.module.css";

export default function SupplierListings({ listings, own = false }: { listings: SupplierListing[]; own?: boolean }) {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link href="/profile">← Profile</Link>
        <p>Supplier management</p>
        <h1>{own ? "My supplier listings" : "Supplier listings"}</h1>
        <span>{own ? "Manage the materials and goods you provide." : "Browse goods and materials from local suppliers."}</span>
        {own && <Link className={styles.action} href="/suppliers/new">Create listing</Link>}
      </div>
      {listings.length === 0 ? <p className={styles.empty}>No supplier listings are available yet.</p> : (
        <div className={styles.grid}>
          {listings.map((listing) => (
            <article className={styles.card} key={listing.id}>
              <Link href={`/suppliers/${listing.id}`} className={styles.cardContent}>
                <span>{listing.category}</span>
                <h2>{listing.name}</h2>
                <p>{listing.description}</p>
                <strong>€{listing.price.toFixed(2)}</strong>
              </Link>
              {own && (
                <SupplierListingActions
                  listingId={listing.id}
                  listingName={listing.name}
                />
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
