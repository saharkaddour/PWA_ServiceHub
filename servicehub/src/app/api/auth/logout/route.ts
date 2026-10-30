import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  try {
    await deleteSession(cookieStore.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  } catch (error) {
    console.error("Failed to log out", error);
    return NextResponse.json({ error: "Logout is unavailable." }, { status: 500 });
  }
}
