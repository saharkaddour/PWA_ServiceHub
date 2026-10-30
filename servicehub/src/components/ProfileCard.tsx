"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Profile } from "@/lib/profile";
import styles from "./ProfileCard.module.css";

const PROFILE_SNAPSHOT_KEY = "servicehub-profile-snapshot";

type ProfileSnapshot = Pick<Profile, "name" | "email" | "role">;

type ProfileCardProps = {
  initialProfile: Profile;
};

function isProfileSnapshot(value: unknown): value is ProfileSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Record<string, unknown>;
  return (
    typeof snapshot.name === "string" &&
    typeof snapshot.email === "string" &&
    typeof snapshot.role === "string"
  );
}

export default function ProfileCard({ initialProfile }: ProfileCardProps) {
  const router = useRouter();
  const initialSnapshot: ProfileSnapshot = {
    name: initialProfile.name,
    email: initialProfile.email,
    role: initialProfile.role,
  };
  const [profile, setProfile] = useState<ProfileSnapshot | null>(
    initialSnapshot,
  );
  const [displayName, setDisplayName] = useState(initialSnapshot.name);
  const [isOfflineCopy, setIsOfflineCopy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    function loadSavedSnapshot(markAsOffline: boolean): boolean {
      const savedSnapshot = localStorage.getItem(PROFILE_SNAPSHOT_KEY);
      if (!savedSnapshot) {
        return false;
      }

      try {
        const parsedSnapshot: unknown = JSON.parse(savedSnapshot);
        if (!isMounted || !isProfileSnapshot(parsedSnapshot)) {
          return false;
        }

        setProfile(parsedSnapshot);
        setDisplayName(parsedSnapshot.name);
        setIsOfflineCopy(markAsOffline);
        return true;
      } catch {
        return false;
      }
    }

    async function loadProfile() {
      const hasSavedSnapshot = loadSavedSnapshot(!navigator.onLine);
      if (hasSavedSnapshot) {
        setIsLoading(false);
      }

      if (!navigator.onLine) {
        if (!hasSavedSnapshot && isMounted) {
          setError("We could not load your profile. Please reconnect and try again.");
          setIsLoading(false);
        }
        return;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4000);

      try {
        setIsLoading(false);
        const response = await fetch("/api/profile", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Profile could not be loaded.");
        }

        const data: { profile?: Profile } = await response.json();
        if (!data.profile || !isMounted) {
          return;
        }

        const snapshot: ProfileSnapshot = {
          name: data.profile.name,
          email: data.profile.email,
          role: data.profile.role,
        };
        localStorage.setItem(PROFILE_SNAPSHOT_KEY, JSON.stringify(snapshot));
        setProfile(snapshot);
        setDisplayName(snapshot.name);
        setIsOfflineCopy(false);
      } catch {
        if (!hasSavedSnapshot && !loadSavedSnapshot(true)) {
          if (isMounted) {
            setError("We could not load your profile. Please try again.");
          }
        } else if (isMounted) {
          setIsOfflineCopy(true);
        }
      } finally {
        window.clearTimeout(timeout);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();
    function handleOffline() {
      if (isMounted) {
        setIsOfflineCopy(true);
      }
    }

    function handleOnline() {
      if (isMounted) {
        void loadProfile();
      }
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      isMounted = false;
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName }),
      });
      const data: { profile?: Profile; error?: string } = await response.json();

      if (!response.ok || !data.profile) {
        throw new Error(data.error || "Profile could not be updated.");
      }

      const snapshot: ProfileSnapshot = {
        name: data.profile.name,
        email: data.profile.email,
        role: data.profile.role,
      };
      localStorage.setItem(PROFILE_SNAPSHOT_KEY, JSON.stringify(snapshot));
      setProfile(snapshot);
      setDisplayName(snapshot.name);
      setIsOfflineCopy(false);
      setMessage("Your display name was updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Profile could not be updated.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <Link href="/">← Home</Link>
        <p>Identity &amp; profile</p>
        <h1>My profile</h1>
        <span>Manage the details shown to other ServiceHub users.</span>
      </div>

      {isLoading && <p className={styles.status}>Loading profile…</p>}
      {error && <p className={styles.error}>{error}</p>}

      {profile && (
        <div className={styles.card}>
          <p
            id="profile-offline-notice"
            hidden={!isOfflineCopy}
            className={styles.offlineNotice}
          >
            Offline copy — may be outdated
          </p>
          <dl className={styles.details}>
            <div>
              <dt>Name</dt>
              <dd>{profile.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{profile.role}</dd>
            </div>
          </dl>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              name="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              disabled={isSaving || isOfflineCopy}
              required
            />
            <p className={styles.help}>
              Your role and email are managed by the account system.
            </p>
            <button type="submit" disabled={isSaving || isOfflineCopy}>
              {isSaving ? "Saving…" : "Save display name"}
            </button>
            {message && <p className={styles.success}>{message}</p>}
          </form>
          <button type="button" className={styles.logout} onClick={handleLogout}>
            Log out
          </button>
          <Link href="/services" className={styles.catalogLink}>
            Browse services
          </Link>
          {profile.role === "PROVIDER" && (
            <Link href="/services/new" className={styles.catalogLink}>
              Publish a service
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
