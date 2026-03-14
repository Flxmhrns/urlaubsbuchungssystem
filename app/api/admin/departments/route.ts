/**
 * GET  /api/admin/departments  – Alle Abteilungen mit Mitgliedern
 * POST /api/admin/departments  – Neue Abteilung anlegen
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

// ── GET ──────────────────────────────────────────────────────
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      managerId: true,
      employees: {
        where: { role: { not: "ADMIN" } },
        select: {
          id: true, name: true, email: true, role: true,
          departmentId: true, vacationDaysTotal: true, vacationDaysUsed: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: departments });
}

// ── POST ─────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name ist ein Pflichtfeld." }, { status: 400 });
  }

  try {
    const dept = await prisma.department.create({
      data: { name: name.trim() },
      select: { id: true, name: true, managerId: true },
    });
    return NextResponse.json({ data: { ...dept, employees: [] } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Abteilung existiert bereits." }, { status: 409 });
  }
}
