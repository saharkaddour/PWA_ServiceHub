import Link from "next/link";
import type { Service } from "@/lib/services";
import styles from "./ServiceCatalog.module.css";

export default function ServiceCatalog({ services }: { services: Service[] }) {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link href="/profile">← Profile</Link>
        <p>Services &amp; catalog</p>
        <h1>Find a local service</h1>
        <span>Browse published services from local providers.</span>
      </div>
      {services.length === 0 ? (
        <p className={styles.empty}>No published services are available yet.</p>
      ) : (
        <div className={styles.grid}>
          {services.map((service) => (
            <Link href={`/services/${service.id}`} className={styles.card} key={service.id}>
              <span className={styles.category}>{service.category}</span>
              <h2>{service.title}</h2>
              <p>{service.description}</p>
              <strong>€{service.price.toFixed(2)}</strong>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
