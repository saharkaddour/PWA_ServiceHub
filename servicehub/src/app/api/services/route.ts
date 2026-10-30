import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import {
  createService,
  listPublishedServices,
  listProviderServices,
} from "@/lib/services";

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_CATEGORY_LENGTH = 60;

function validateServiceInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be an object." };
  }
  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const category =
    typeof input.category === "string" ? input.category.trim() : "";
  const price = typeof input.price === "number" ? input.price : Number.NaN;

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return { error: "Title is required and must be 100 characters or fewer." };
  }
  if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: "Description is required and must be 1000 characters or fewer." };
  }
  if (!category || category.length > MAX_CATEGORY_LENGTH) {
    return { error: "Category is required and must be 60 characters or fewer." };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a non-negative number." };
  }
  return { value: { title, description, category, price } };
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
    const services = user?.role === "PROVIDER"
      ? await listProviderServices(user.id)
      : await listPublishedServices();
    return NextResponse.json({ services });
  } catch (error) {
    console.error("Failed to load services", error);
    return NextResponse.json({ error: "Services could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Only providers can create services." }, { status: 403 });
  }

  const validated = validateServiceInput(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    return NextResponse.json(
      { service: await createService({ ...validated.value, providerId: user.id }) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create service", error);
    return NextResponse.json({ error: "Service could not be created." }, { status: 500 });
  }
}

export { validateServiceInput };
