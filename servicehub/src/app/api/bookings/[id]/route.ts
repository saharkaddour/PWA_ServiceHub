import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { bookingStatuses, updateBookingStatus } from "@/lib/bookings";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user || !["CUSTOMER", "PROVIDER"].includes(user.role)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const status = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).status : undefined;
  if (!bookingStatuses.includes(status as typeof bookingStatuses[number])) {
    return NextResponse.json({ error: "Invalid booking status." }, { status: 400 });
  }
  const { id } = await context.params;
  const role = user.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
  const result = await updateBookingStatus(id, user.id, role, status as typeof bookingStatuses[number]);
  if (result === null) return NextResponse.json({ error: "Booking not found or already changed." }, { status: 404 });
  if (!result) return NextResponse.json({ error: "You cannot make that status change." }, { status: 403 });
  return NextResponse.json({ booking: result });
}
