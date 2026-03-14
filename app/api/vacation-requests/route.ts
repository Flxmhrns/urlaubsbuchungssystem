/**
 * API Route: /api/vacation-requests
 *
 * GET  – Urlaubsanträge abrufen
 *         Employee: eigene Anträge
 *         Manager:  alle Anträge der eigenen Abteilung
 *
 * POST – Neuen Urlaubsantrag erstellen (nur Employee/Manager für sich selbst)
 */
import { NextResponse }  from "next/server";
import { auth }          from "@/auth";
import { prisma }        from "@/lib/prisma";
import { countWorkingDays } from "@/lib/utils";

// ─────────────────────────────────────────────
// GET /api/vacation-requests
// ─────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const role   = (session.user as any).role as string;

  try {
    if (role === "MANAGER") {
      // Manager: Anträge aller Mitarbeiter der eigenen Abteilung
      const department = await prisma.department.findFirst({
        where: { managerId: userId },
      });

      if (!department) {
        return NextResponse.json({ error: "Keine Abteilung gefunden." }, { status: 404 });
      }

      const requests = await prisma.vacationRequest.findMany({
        where: {
          user: { departmentId: department.id },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ data: requests });
    } else {
      // Employee: nur eigene Anträge
      const requests = await prisma.vacationRequest.findMany({
        where:   { userId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ data: requests });
    }
  } catch (error) {
    console.error("[GET /api/vacation-requests]", error);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/vacation-requests
// ─────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const userId = Number(session.user.id);

  try {
    const body = await req.json();
    const { startDate, endDate, reason } = body;

    // ── Eingabevalidierung ──────────────────
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start- und Enddatum sind erforderlich." },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Ungültiges Datumsformat." }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json(
        { error: "Das Startdatum muss vor dem Enddatum liegen." },
        { status: 400 },
      );
    }

    // ── Resturlaub prüfen ───────────────────
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
    }

    const requestedDays = countWorkingDays(start, end);
    const remainingDays = user.vacationDaysTotal - user.vacationDaysUsed;

    if (requestedDays > remainingDays) {
      return NextResponse.json(
        {
          error: `Nicht genügend Resturlaub. Beantragt: ${requestedDays} Tage, verfügbar: ${remainingDays} Tage.`,
        },
        { status: 400 },
      );
    }

    // ── Überschneidung mit bestehenden Anträgen prüfen ──
    const overlapping = await prisma.vacationRequest.findFirst({
      where: {
        userId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          // Neuer Antrag überlappt mit bestehendem
          { startDate: { lte: end },   endDate: { gte: start } },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "In diesem Zeitraum existiert bereits ein Antrag." },
        { status: 409 },
      );
    }

    // ── Antrag erstellen ────────────────────
    const newRequest = await prisma.vacationRequest.create({
      data: {
        userId,
        startDate: start,
        endDate:   end,
        status:    "PENDING",
        reason:    reason?.trim() || null,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ data: newRequest }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/vacation-requests]", error);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}
