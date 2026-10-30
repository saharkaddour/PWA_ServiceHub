import Link from "next/link";

export default function OfflinePage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>You are offline</h1>
      <p>Reconnect to load this page. Previously viewed services may still be available.</p>
      <Link href="/services">Return to services</Link>
    </main>
  );
}
