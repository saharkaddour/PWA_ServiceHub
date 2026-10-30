import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ServiceForm from "@/components/ServiceForm";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";

export default async function NewServicePage() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user || user.role !== "PROVIDER") redirect("/services");
  return (
    <main style={{ width: "min(100% - 2.5rem, 42rem)", margin: "0 auto", padding: "2rem 0 4rem" }}>
      <h1>Create a service</h1>
      <ServiceForm />
    </main>
  );
}
