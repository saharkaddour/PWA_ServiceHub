import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { createBooking, listBookings } from "@/lib/bookings";
import { getService } from "@/lib/services";

export async function GET() {
  const user = await currentUser();
  if (!user || !["CUSTOMER", "PROVIDER"].includes(user.role)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const role = user.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
    return NextResponse.json({
      bookings: await listBookings(user.id, role),
    });
  } catch (error) {
    console.error("Failed to load bookings", error);
    return NextResponse.json({ error: "Bookings could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Only customers can request services." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const serviceId = typeof input.serviceId === "string" ? input.serviceId : "";
  const preferredDate = typeof input.preferredDate === "string" ? input.preferredDate : "";
  const note = typeof input.note === "string" ? input.note.trim() : "";
  const clientRequestId = typeof input.clientRequestId === "string" ? input.clientRequestId : "";
  if (!serviceId || !clientRequestId || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) ||
      new Date(`${preferredDate}T00:00:00`) < new Date(new Date().toDateString()) ||
      note.length > 500) {
    return NextResponse.json({ error: "A future preferred date and a note of 500 characters or fewer are required." }, { status: 400 });
  }
  const service = await getService(serviceId);
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });
  try {
    return NextResponse.json({
      booking: await createBooking({
        serviceId,
        serviceTitle: service.title,
        customerId: user.id,
        providerId: service.providerId,
        preferredDate,
        note,
        clientRequestId,
      }),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create booking", error);
    return NextResponse.json({ error: "Booking could not be created." }, { status: 500 });
  }
}

async function currentUser() {
  const cookieStore = await cookies();
  return getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
}
