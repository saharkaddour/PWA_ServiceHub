import Link from "next/link";
import { cookies } from "next/headers";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import NotificationToggle from "@/components/NotificationToggle";
import styles from "./Navbar.module.css";

export default async function Navbar() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!user) {
    return null;
  }

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/profile" className={styles.brand}>
          ServiceHub
        </Link>
        <div className={styles.links}>
          <Link href="/profile">Profile</Link>
          <Link href="/services">Services</Link>
          {(user.role === "CUSTOMER" || user.role === "PROVIDER") && <Link href="/bookings">Bookings</Link>}
          {(user.role === "CUSTOMER" || user.role === "PROVIDER") && <Link href="/messages">Messages</Link>}
          {user.role === "PROVIDER" && <Link href="/services/new">Publish service</Link>}
          <Link href="/suppliers">Suppliers</Link>
          {user.role === "SUPPLIER" && <Link href="/my-suppliers">My listings</Link>}
          {(user.role === "CUSTOMER" || user.role === "PROVIDER") && <NotificationToggle />}
          <LogoutButton />
        </div>
      </nav>
    </header>
  );
}
