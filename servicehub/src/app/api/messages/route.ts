import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { createMessage, listMessageConversations } from "@/lib/messages";

async function currentUser() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  return user && ["CUSTOMER", "PROVIDER"].includes(user.role) ? user : null;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Customer or provider authentication required." }, { status: 401 });
  try {
    return NextResponse.json({ conversations: await listMessageConversations(user.id) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Messages could not be loaded. Please retry." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Customer or provider authentication required." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const bookingId = typeof input.bookingId === "string" ? input.bookingId.trim() : "";
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!bookingId || bookingId.length > 200 || !text || text.length > 2000) {
    return NextResponse.json({ error: "A booking and a message of 1–2,000 characters are required." }, { status: 400 });
  }
  try {
    const message = await createMessage({ bookingId, text, senderId: user.id });
    if (!message) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Message could not be sent. Please retry." }, { status: 500 });
  }
}
