/**
 * API Route: /api/vacation-requests/[id]
 *
 * GET    – Einzelnen Antrag abrufen
 * PATCH  – Status ändern (nur Manager der zugehörigen Abteilung)
 *           body: { action: "approve" | "reject", rejectionNote?: string }
 * DELETE – Ausstehenden Antrag stornieren (nur der Antragsteller selbst)
 */
import { NextResponse }     from "next/server";
import { auth }             from "@/auth";
import { prisma }           from "@/lib/prisma";
import { countWorkingDays } from "@/lib/utils";

// ─────────────────────────────────────────────
// Hilfsfunktion: Manager-Berechtigungsprüfung
// ─────────────────────────────────────────────
async function getManagerDepartment(managerId: number) {
  return prisma.department.findFirst({
    where: { managerId },
  });
}

// ─────────────────────────────────────────────
// GET /api/vacation-requests/[id]
// ─────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;
  const requestId = Number(id);

  if (isNaN(requestId)) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  try {
    const vacationRequest = await prisma.vacationRequest.findUnique({
      where:   { id: requestId },
      include: { user: { select: { id: true, name: true, departmentId: true } } },
    });

    if (!vacationRequest) {
      return NextResponse.json({ error: "Antrag nicht gefunden." }, { status: 404 });
    }

    const userId = Number(session.user.id);
    const role   = (session.user as any).role as string;

    // Employee darf nur eigene Anträge sehen
    if (role === "EMPLOYEE" && vacationRequest.userId !== userId) {
      return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
    }

    // Manager darf nur Anträge seiner Abteilung sehen
    if (role === "MANAGER") {
      const dept = await getManagerDepartment(userId);
      if (!dept || vacationRequest.user.departmentId !== dept.id) {
        return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
      }
    }

    return NextResponse.json({ data: vacationRequest });
  } catch (error) {
    console.error("[GET /api/vacation-requests/:id]", error);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// PATCH /api/vacation-requests/[id]
// ─────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const role = (session.user as any).role as string;
  if (role !== "MANAGER") {
    return NextResponse.json(
      { error: "Nur Abteilungsleiter dürfen Anträge bearbeiten." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const requestId = Number(id);

  if (isNaN(requestId)) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  try {
    const body          = await req.json();
    const { action, rejectionNote } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Ungültige Aktion. Erlaubt: 'approve' oder 'reject'." },
        { status: 400 },
      );
    }

    const managerId = Number(session.user.id);

    // Manager-Abteilung ermitteln
    const dept = await getManagerDepartment(managerId);
    if (!dept) {
      return NextResponse.json({ error: "Keine Abteilung gefunden." }, { status: 404 });
    }

    // Antrag laden
    const vacationRequest = await prisma.vacationRequest.findUnique({
      where:   { id: requestId },
      include: { user: true },
    });

    if (!vacationRequest) {
      return NextResponse.json({ error: "Antrag nicht gefunden." }, { status: 404 });
    }

    // Berechtigungsprüfung: Antrag muss zur Manager-Abteilung gehören
    if (vacationRequest.user.departmentId !== dept.id) {
      return NextResponse.json({ error: "Kein Zugriff auf diesen Antrag." }, { status: 403 });
    }

    // Bereits abgelehnte Anträge können nicht erneut bearbeitet werden
    if (vacationRequest.status === "REJECTED") {
      return NextResponse.json(
        { error: "Abgelehnte Anträge können nicht erneut bearbeitet werden." },
        { status: 409 },
      );
    }

    // Genehmigen ist nur für ausstehende Anträge möglich
    if (action === "approve" && vacationRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Nur ausstehende Anträge können genehmigt werden." },
        { status: 409 },
      );
    }

    // Gemeinsames Include für alle Antworten (inkl. Audit-Felder)
    const auditInclude = {
      user:        { select: { id: true, name: true } },
      processedBy: { select: { name: true } },
    } as const;

    // Gemeinsame Audit-Daten
    const auditData = {
      processedById: managerId,
      processedAt:   new Date(),
    };

    if (action === "approve") {
      // ── Genehmigen (PENDING → APPROVED): Urlaubstage abziehen ──
      const days = countWorkingDays(vacationRequest.startDate, vacationRequest.endDate);

      const [updatedRequest] = await prisma.$transaction([
        prisma.vacationRequest.update({
          where:   { id: requestId },
          data:    { status: "APPROVED", rejectionNote: null, ...auditData },
          include: auditInclude,
        }),
        prisma.user.update({
          where: { id: vacationRequest.userId },
          data:  { vacationDaysUsed: { increment: days } },
        }),
      ]);

      return NextResponse.json({ data: updatedRequest });
    } else {
      // ── Ablehnen (PENDING → REJECTED oder APPROVED → REJECTED) ──
      const days        = countWorkingDays(vacationRequest.startDate, vacationRequest.endDate);
      const wasApproved = vacationRequest.status === "APPROVED";

      if (wasApproved) {
        // APPROVED → REJECTED: Urlaubstage in einer Transaktion zurückbuchen
        const [updatedRequest] = await prisma.$transaction([
          prisma.vacationRequest.update({
            where:   { id: requestId },
            data:    { status: "REJECTED", rejectionNote: rejectionNote?.trim() || null, ...auditData },
            include: auditInclude,
          }),
          prisma.user.update({
            where: { id: vacationRequest.userId },
            data:  { vacationDaysUsed: { decrement: days } },
          }),
        ]);
        return NextResponse.json({ data: updatedRequest });
      } else {
        // PENDING → REJECTED: kein Einfluss auf Urlaubskontingent
        const updatedRequest = await prisma.vacationRequest.update({
          where:   { id: requestId },
          data:    { status: "REJECTED", rejectionNote: rejectionNote?.trim() || null, ...auditData },
          include: auditInclude,
        });
        return NextResponse.json({ data: updatedRequest });
      }
    }
  } catch (error) {
    console.error("[PATCH /api/vacation-requests/:id]", error);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// DELETE /api/vacation-requests/[id]
// Mitarbeiter storniert seinen eigenen PENDING-Antrag
// ─────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const { id } = await params;
  const requestId = Number(id);

  if (isNaN(requestId)) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  const userId = Number(session.user.id);

  try {
    const vacationRequest = await prisma.vacationRequest.findUnique({
      where: { id: requestId },
    });

    if (!vacationRequest) {
      return NextResponse.json({ error: "Antrag nicht gefunden." }, { status: 404 });
    }

    // Nur der Antragsteller selbst darf stornieren
    if (vacationRequest.userId !== userId) {
      return NextResponse.json({ error: "Kein Zugriff auf diesen Antrag." }, { status: 403 });
    }

    // Nur ausstehende Anträge können storniert werden
    if (vacationRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Nur ausstehende Anträge können storniert werden." },
        { status: 409 },
      );
    }

    await prisma.vacationRequest.delete({ where: { id: requestId } });

    return NextResponse.json({ data: { id: requestId } });
  } catch (error) {
    console.error("[DELETE /api/vacation-requests/:id]", error);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}
