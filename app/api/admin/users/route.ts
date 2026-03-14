/**
 * GET  /api/admin/users  – Alle Benutzer (außer ADMIN selbst)
 * POST /api/admin/users  – Neuen Benutzer anlegen
 *
 * Nur für Benutzer mit Rolle ADMIN.
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

// ── GET ──────────────────────────────────────────────────────
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where:   { role: { not: "ADMIN" } },
    select: {
      id: true, name: true, email: true, role: true,
      departmentId: true, vacationDaysTotal: true, vacationDaysUsed: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ data: users });
}

// ── POST ─────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, departmentId, vacationDaysTotal } = body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Name, E-Mail und Passwort sind Pflichtfelder." }, { status: 400 });
  }
  if (role !== "EMPLOYEE" && role !== "MANAGER") {
    return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "E-Mail-Adresse bereits vergeben." }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name:              name.trim(),
      email:             email.trim().toLowerCase(),
      password:          hashed,
      role,
      departmentId:      departmentId ?? null,
      vacationDaysTotal: vacationDaysTotal ?? 30,
    },
    select: {
      id: true, name: true, email: true, role: true,
      departmentId: true, vacationDaysTotal: true, vacationDaysUsed: true,
      department: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
