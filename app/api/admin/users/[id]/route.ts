/**
 * PATCH  /api/admin/users/[id]  – Benutzer bearbeiten (Abt., Rolle, Name, …)
 * DELETE /api/admin/users/[id]  – Benutzer löschen
 *
 * Nur für ADMIN.
 */
import { NextResponse } from "next/server";
import { auth }         from "@/auth";
import { prisma }       from "@/lib/prisma";
import bcrypt           from "bcryptjs";

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
  const userId = Number(id);
  if (isNaN(userId)) return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });

  const body = await req.json();
  const { name, email, password, role, departmentId, vacationDaysTotal } = body;

  // Benutzer darf keine ADMIN-Rolle bekommen
  if (role === "ADMIN") {
    return NextResponse.json({ error: "ADMIN-Rolle kann nicht vergeben werden." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name       !== undefined) data.name              = name.trim();
  if (email      !== undefined) data.email             = email.trim().toLowerCase();
  if (role       !== undefined) data.role              = role;
  if ("departmentId"      in body) data.departmentId   = departmentId;
  if (vacationDaysTotal   !== undefined) data.vacationDaysTotal = vacationDaysTotal;
  if (password   !== undefined && password.trim()) {
    data.password = await bcrypt.hash(password, 12);
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        departmentId: true, vacationDaysTotal: true, vacationDaysUsed: true,
        department: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: user });
  } catch {
    return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
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
  const userId = Number(id);
  if (isNaN(userId)) return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });

  // Prüfen ob dieser User Manager einer Abteilung ist
  const dept = await prisma.department.findFirst({ where: { managerId: userId } });
  if (dept) {
    // managerId in der Abteilung auf null setzen
    await prisma.department.update({ where: { id: dept.id }, data: { managerId: null } });
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ data: { id: userId } });
  } catch {
    return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
  }
}
