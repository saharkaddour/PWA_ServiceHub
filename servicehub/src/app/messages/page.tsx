import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MessagesPage from "@/components/MessagesPage";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { listMessageConversations } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function MessagesRoute() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login");
  if (user.role !== "CUSTOMER" && user.role !== "PROVIDER") redirect("/profile");
  return <MessagesPage initialConversations={await listMessageConversations(user.id)} currentUserId={user.id} />;
}
