/**
 * PATCH  /api/admin/departments/[id]  – Abteilung umbenennen oder Manager setzen
 * DELETE /api/admin/departments/[id]  – Abteilung löschen (nur wenn leer)
 *
 * Nur für ADMIN.
 */
import { NextResponse } from "next/server";
import { auth }         from "@/auth";
import { prisma }       from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  if ((session.user as any).role !== "ADMIN") return null;
  return session;
}

// ── PATCH ─────────────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const { id } = await params;
  const deptId = Number(id);
  if (isNaN(deptId)) return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name      !== undefined) data.name      = body.name.trim();
  if ("managerId"    in body)       data.managerId = body.managerId; // null erlaubt

  try {
    const dept = await prisma.department.update({
      where: { id: deptId },
      data,
      select: { id: true, name: true, managerId: true },
    });
    return NextResponse.json({ data: dept });
  } catch {
    return NextResponse.json({ error: "Abteilung nicht gefunden." }, { status: 404 });
  }
}

// ── DELETE ────────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const { id } = await params;
  const deptId = Number(id);
  if (isNaN(deptId)) return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });

  // Nur leere Abteilungen können gelöscht werden
  const memberCount = await prisma.user.count({ where: { departmentId: deptId } });
  if (memberCount > 0) {
    return NextResponse.json(
      { error: "Nur leere Abteilungen können gelöscht werden. Bitte zuerst alle Mitglieder verschieben." },
      { status: 409 },
    );
  }

  try {
    await prisma.department.delete({ where: { id: deptId } });
    return NextResponse.json({ data: { id: deptId } });
  } catch {
    return NextResponse.json({ error: "Abteilung nicht gefunden." }, { status: 404 });
  }
}
