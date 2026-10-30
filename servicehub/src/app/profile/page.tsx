import ProfileCard from "@/components/ProfileCard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";

export const metadata = {
  title: "My profile | ServiceHub",
  description: "View and update your ServiceHub display name.",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) {
    redirect("/login");
  }
  return (
    <main>
      <ProfileCard initialProfile={user} />
    </main>
  );
}
