import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import BookingsList from "@/components/BookingsList";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { listBookings } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login");
  if (user.role !== "CUSTOMER" && user.role !== "PROVIDER") redirect("/profile");
  const role = user.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
  return <BookingsList initialBookings={await listBookings(user.id, role)} role={role} />;
}
