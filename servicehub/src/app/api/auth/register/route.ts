import { NextResponse } from "next/server";
import {
  createSession,
  createUser,
  findUserByEmail,
  isProfileRole,
  SESSION_COOKIE,
} from "@/lib/auth";

const MAX_NAME_LENGTH = 80;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
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
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role ?? "CUSTOMER";

  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "Name is required and must be 80 characters or fewer." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!isProfileRole(role) || role === "MODERATOR") {
    return NextResponse.json({ error: "Choose a valid account role." }, { status: 400 });
  }

  try {
    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const user = await createUser({ name, email, password, role });
    const token = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Failed to create account", error);
    return NextResponse.json({ error: "Account could not be created." }, { status: 500 });
  }
}
