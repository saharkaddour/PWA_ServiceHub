"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { profileRoles, type ProfileRole } from "@/lib/profile-types";
import styles from "./AuthForm.module.css";

type AuthFormProps = {
  mode: "login" | "register";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ProfileRole>("CUSTOMER");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(
        isRegister ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isRegister ? { name, email, password, role } : { email, password },
          ),
        },
      );
      const data: { error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error || "Authentication failed.");
        return;
      }

      router.push("/profile");
    } catch {
      setError("The service is unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>ServiceHub</p>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className={styles.subtitle}>
          {isRegister
            ? "Join ServiceHub to discover and manage local services."
            : "Sign in to continue to your ServiceHub profile."}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {isRegister && (
            <label>
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoComplete="name"
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
            />
          </label>
          {isRegister && (
            <label>
              Account role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as ProfileRole)}
              >
                {profileRoles.filter((option) => option !== "MODERATOR").map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait…"
              : isRegister
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <p className={styles.switch}>
          {isRegister ? "Already have an account?" : "New to ServiceHub?"}{" "}
          <Link href={isRegister ? "/login" : "/create-account"}>
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
