import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";
import {
  deleteSupplierListing,
  getSupplierListing,
  updateSupplierListing,
} from "@/lib/suppliers";
import { validateInput } from "@/app/api/suppliers/route";

type Context = { params: Promise<{ id: string }> };

async function supplierFromSession() {
  const cookieStore = await cookies();
  return getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    const listing = await getSupplierListing(id);
    if (!listing) return NextResponse.json({ error: "Supplier listing not found." }, { status: 404 });
    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Failed to load supplier listing", error);
    return NextResponse.json({ error: "Supplier listing could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const user = await supplierFromSession();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "SUPPLIER") return NextResponse.json({ error: "Only suppliers can edit listings." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const validated = validateInput(body);
  if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

  try {
    const listing = await updateSupplierListing(id, user.id, validated.value);
    if (!listing) return NextResponse.json({ error: "Supplier listing not found." }, { status: 404 });
    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Failed to update supplier listing", error);
    return NextResponse.json({ error: "Supplier listing could not be updated." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const user = await supplierFromSession();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "SUPPLIER") return NextResponse.json({ error: "Only suppliers can delete listings." }, { status: 403 });
  try {
    if (!(await deleteSupplierListing(id, user.id))) {
      return NextResponse.json({ error: "Supplier listing not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete supplier listing", error);
    return NextResponse.json({ error: "Supplier listing could not be deleted." }, { status: 500 });
  }
}
