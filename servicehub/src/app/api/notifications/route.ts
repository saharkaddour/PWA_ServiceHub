import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { getPushConfig, parsePushSubscription, savePushSubscription } from "@/lib/push";

async function provider() {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  return user?.role === "PROVIDER" ? user : null;
}

export async function GET() {
  if (!await provider()) return NextResponse.json({ error: "Provider authentication required." }, { status: 403 });
  return NextResponse.json({ publicKey: getPushConfig()?.publicKey ?? null }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const user = await provider();
  if (!user) return NextResponse.json({ error: "Provider authentication required." }, { status: 403 });
  if (!getPushConfig()) return NextResponse.json({ error: "Background notifications are not configured." }, { status: 503 });
  const subscription = parsePushSubscription(await request.json().catch(() => null));
  if (!subscription) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  try {
    await savePushSubscription(user.id, subscription);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Notification subscription could not be saved. Please retry." }, { status: 500 });
  }
}
