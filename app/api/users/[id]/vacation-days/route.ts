/**
 * API Route: PATCH /api/users/[id]/vacation-days
 *
 * Erlaubt einem Manager, die Urlaubstage eines Mitarbeiters
 * seiner Abteilung manuell anzupassen.
 *
 * Body: { vacationDaysTotal?: number, vacationDaysUsed?: number }
 */
import { NextResponse } from "next/server";
import { auth }         from "@/auth";
import { prisma }       from "@/lib/prisma";

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
      { error: "Nur Abteilungsleiter dürfen Urlaubstage anpassen." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const targetUserId = Number(id);
  if (isNaN(targetUserId)) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  const managerId = Number(session.user.id);

  try {
    // Manager-Abteilung ermitteln
    const dept = await prisma.department.findFirst({
      where: { managerId },
    });
    if (!dept) {
      return NextResponse.json({ error: "Keine Abteilung gefunden." }, { status: 404 });
    }

    // Ziel-Mitarbeiter laden + Abteilungsprüfung
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "Mitarbeiter nicht gefunden." }, { status: 404 });
    }
    if (targetUser.departmentId !== dept.id) {
      return NextResponse.json(
        { error: "Dieser Mitarbeiter gehört nicht zu deiner Abteilung." },
        { status: 403 },
      );
    }

    // Body parsen
    const body = await req.json();
    const { vacationDaysTotal, vacationDaysUsed } = body;

    // Mindestens ein Feld muss übergeben werden
    if (vacationDaysTotal === undefined && vacationDaysUsed === undefined) {
      return NextResponse.json(
        { error: "Mindestens ein Feld (vacationDaysTotal oder vacationDaysUsed) ist erforderlich." },
        { status: 400 },
      );
    }

    // Validierung
    if (vacationDaysTotal !== undefined) {
      if (!Number.isInteger(vacationDaysTotal) || vacationDaysTotal < 0 || vacationDaysTotal > 365) {
        return NextResponse.json(
          { error: "Gesamturlaub muss eine ganze Zahl zwischen 0 und 365 sein." },
          { status: 400 },
        );
      }
    }
    if (vacationDaysUsed !== undefined) {
      if (!Number.isInteger(vacationDaysUsed) || vacationDaysUsed < 0 || vacationDaysUsed > 365) {
        return NextResponse.json(
          { error: "Verbrauchte Tage müssen eine ganze Zahl zwischen 0 und 365 sein." },
          { status: 400 },
        );
      }
    }

    // Konsistenzprüfung: used darf nicht > total sein
    const newTotal = vacationDaysTotal ?? targetUser.vacationDaysTotal;
    const newUsed  = vacationDaysUsed  ?? targetUser.vacationDaysUsed;
    if (newUsed > newTotal) {
      return NextResponse.json(
        { error: `Verbrauchte Tage (${newUsed}) dürfen nicht größer sein als Gesamttage (${newTotal}).` },
        { status: 400 },
      );
    }

    // Aktualisieren
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data:  {
        ...(vacationDaysTotal !== undefined && { vacationDaysTotal }),
        ...(vacationDaysUsed  !== undefined && { vacationDaysUsed  }),
      },
      select: {
        id: true,
        name: true,
        vacationDaysTotal: true,
        vacationDaysUsed: true,
      },
    });

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error("[PATCH /api/users/:id/vacation-days]", error);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}
