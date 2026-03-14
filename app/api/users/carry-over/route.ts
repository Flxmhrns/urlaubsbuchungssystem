/**
 * API Route: POST /api/users/carry-over
 *
 * Jahreswechsel-Funktion für Abteilungsleiter.
 *
 * Für jeden Mitarbeiter der Abteilung:
 *   1. Resturlaub berechnen (total - used)
 *   2. Neues Jahresbudget setzen (newAnnualDays + Resturlaub)
 *   3. vacationDaysUsed auf 0 zurücksetzen
 *   4. Alle ausstehenden / genehmigten Anträge aus dem Vorjahr
 *      bleiben erhalten (historische Daten), neue Anträge starten sauber
 *
 * Body: { newAnnualDays: number }  – das neue Grundkontingent (z. B. 28)
 *       Optional: { employeeIds: number[] } – nur bestimmte Mitarbeiter,
 *                 default: alle Mitarbeiter der Abteilung
 */
import { NextResponse } from "next/server";
import { auth }         from "@/auth";
import { prisma }       from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const role = (session.user as any).role as string;
  if (role !== "MANAGER") {
    return NextResponse.json(
      { error: "Nur Abteilungsleiter dürfen den Jahreswechsel durchführen." },
      { status: 403 },
    );
  }

  const managerId = Number(session.user.id);

  try {
    const body = await req.json();
    const { newAnnualDays, employeeIds } = body;

    // Validierung
    if (newAnnualDays === undefined || !Number.isInteger(newAnnualDays) || newAnnualDays < 0 || newAnnualDays > 365) {
      return NextResponse.json(
        { error: "newAnnualDays muss eine ganze Zahl zwischen 0 und 365 sein." },
        { status: 400 },
      );
    }

    // Manager-Abteilung ermitteln
    const dept = await prisma.department.findFirst({
      where: { managerId },
    });
    if (!dept) {
      return NextResponse.json({ error: "Keine Abteilung gefunden." }, { status: 404 });
    }

    // Mitarbeiter der Abteilung laden
    const employees = await prisma.user.findMany({
      where: {
        departmentId: dept.id,
        role:         "EMPLOYEE",
        // Falls employeeIds angegeben, nur diese verarbeiten
        ...(Array.isArray(employeeIds) && employeeIds.length > 0
          ? { id: { in: employeeIds.map(Number) } }
          : {}),
      },
    });

    if (employees.length === 0) {
      return NextResponse.json({ error: "Keine Mitarbeiter gefunden." }, { status: 404 });
    }

    // Jahreswechsel in einer Transaktion durchführen
    const results = await prisma.$transaction(
      employees.map((emp) => {
        const remaining    = Math.max(0, emp.vacationDaysTotal - emp.vacationDaysUsed);
        const newTotal     = newAnnualDays + remaining;

        return prisma.user.update({
          where: { id: emp.id },
          data:  {
            vacationDaysTotal: newTotal,
            vacationDaysUsed:  0,
          },
          select: {
            id:                true,
            name:              true,
            vacationDaysTotal: true,
            vacationDaysUsed:  true,
          },
        });
      }),
    );

    // Zusammenfassung für die Antwort
    const summary = employees.map((emp, i) => ({
      name:          emp.name,
      carryOver:     Math.max(0, emp.vacationDaysTotal - emp.vacationDaysUsed),
      newTotal:      results[i].vacationDaysTotal,
    }));

    return NextResponse.json({
      data: {
        updatedCount: results.length,
        newAnnualDays,
        employees:    summary,
      },
    });
  } catch (error) {
    console.error("[POST /api/users/carry-over]", error);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}
