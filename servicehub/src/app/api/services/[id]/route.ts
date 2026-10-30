import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import { deleteService, getService, updateService } from "@/lib/services";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
    const service = await getService(id, user?.role === "PROVIDER" ? user.id : undefined);
    if (!service) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }
    return NextResponse.json({ service });
  } catch (error) {
    console.error("Failed to load service", error);
    return NextResponse.json({ error: "Service could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Only providers can edit services." }, { status: 403 });
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
  const allowed = ["title", "description", "category", "price", "status"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    return NextResponse.json({ error: "Only service fields can be updated." }, { status: 400 });
  }
  const updates: Record<string, unknown> = {};
  for (const field of ["title", "description", "category", "price"]) {
    if (field in input) {
      updates[field] = input[field];
    }
  }
  if ("status" in input) {
    if (input.status !== "PUBLISHED" && input.status !== "ARCHIVED") {
      return NextResponse.json({ error: "Invalid service status." }, { status: 400 });
    }
    updates.status = input.status;
  }
  const validated = Object.keys(updates).some((field) => field !== "status")
    ? validatePatchInput(updates)
    : { value: updates };
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const service = await updateService(id, user.id, validated.value);
    if (!service) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }
    return NextResponse.json({ service });
  } catch (error) {
    console.error("Failed to update service", error);
    return NextResponse.json({ error: "Service could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Only providers can delete services." }, { status: 403 });
  }
  try {
    if (!(await deleteService(id, user.id))) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete service", error);
    return NextResponse.json({ error: "Service could not be deleted." }, { status: 500 });
  }
}

function validatePatchInput(input: Record<string, unknown>) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const price = typeof input.price === "number" ? input.price : Number.NaN;
  if (!title || title.length > 100 || !description || description.length > 1000 ||
      !category || category.length > 60 || !Number.isFinite(price) || price < 0) {
    return { error: "Title, description, category, and a non-negative price are required." };
  }
  return { value: { ...input, title, description, category, price } };
}
