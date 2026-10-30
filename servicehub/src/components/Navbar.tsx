import Link from "next/link";
import { cookies } from "next/headers";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import NotificationToggle from "./NotificationToggle";
import styles from "./Navbar.module.css";

export default async function Navbar() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/services" className={styles.brand}>ServiceHub</Link>
        <div className={styles.links}>
          <Link href="/services">Services</Link>
          {user && ["CUSTOMER", "PROVIDER"].includes(user.role) && (
            <>
              <Link href="/bookings">Bookings</Link>
              <Link href="/messages">Messages</Link>
            </>
          )}
          {user?.role === "PROVIDER" && <NotificationToggle />}
        </div>
      </nav>
    </header>
  );
}
