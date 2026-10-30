import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import {
  createSupplierListing,
  listSupplierListings,
} from "@/lib/suppliers";

function validateInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be an object." };
  }
  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const price = typeof input.price === "number" ? input.price : Number.NaN;
  if (!name || name.length > 100 || !category || category.length > 60 ||
      !description || description.length > 1000 ||
      !Number.isFinite(price) || price < 0) {
    return { error: "Name, category, description, and a non-negative price are required." };
  }
  return { value: { name, category, description, price } };
}

export async function GET() {
  try {
    return NextResponse.json({ listings: await listSupplierListings() });
  } catch (error) {
    console.error("Failed to load supplier listings", error);
    return NextResponse.json({ error: "Supplier listings could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "SUPPLIER") {
    return NextResponse.json({ error: "Only suppliers can create listings." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const validated = validateInput(body);
  if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

  try {
    return NextResponse.json(
      { listing: await createSupplierListing({ ...validated.value, supplierId: user.id }) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create supplier listing", error);
    return NextResponse.json({ error: "Supplier listing could not be created." }, { status: 500 });
  }
}

export { validateInput };
