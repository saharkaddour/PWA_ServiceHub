"use client";

import { useRouter } from "next/navigation";
import styles from "./Navbar.module.css";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className={styles.logout} onClick={handleLogout}>
      Log out
    </button>
  );
}
