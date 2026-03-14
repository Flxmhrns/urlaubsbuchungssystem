/**
 * API Route: GET /api/dashboard
 *
 * Gibt Dashboard-Daten für den eingeloggten Nutzer zurück:
 *   – Urlaubskontingent (total, used, remaining, pending)
 *   – Letzte 5 eigene Anträge
 *   – (Manager) Anzahl ausstehender Genehmigungen in der Abteilung
 */
import { NextResponse } from "next/server";
import { auth }         from "@/auth";
import { prisma }       from "@/lib/prisma";
import { countWorkingDays } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const role   = (session.user as any).role as string;

  try {
    // Aktuellen Nutzer laden
    const user = await prisma.user.findUnique({
      where:   { id: userId },
      include: { department: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
    }

    // Letzte 5 eigene Anträge
    const recentRequests = await prisma.vacationRequest.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    5,
    });

    // Ausstehende Tage berechnen (Summe der Arbeitstage in PENDING-Anträgen)
    const pendingRequests = await prisma.vacationRequest.findMany({
      where: { userId, status: "PENDING" },
    });

    const pendingDays = pendingRequests.reduce(
      (sum, r) => sum + countWorkingDays(r.startDate, r.endDate),
      0,
    );

    const remainingDays = user.vacationDaysTotal - user.vacationDaysUsed;

    const dashboardData: Record<string, unknown> = {
      user: {
        id:               user.id,
        name:             user.name,
        role:             user.role,
        departmentName:   user.department?.name ?? null,
        vacationDaysTotal: user.vacationDaysTotal,
        vacationDaysUsed:  user.vacationDaysUsed,
        vacationDaysRemaining: remainingDays,
        vacationDaysPending:   pendingDays,
      },
      recentRequests,
    };

    // Manager: Anzahl ausstehender Genehmigungen
    if (role === "MANAGER") {
      const department = await prisma.department.findFirst({
        where: { managerId: userId },
      });

      if (department) {
        const pendingCount = await prisma.vacationRequest.count({
          where: {
            status: "PENDING",
            user:   { departmentId: department.id },
          },
        });
        dashboardData.pendingApprovalsCount = pendingCount;
        dashboardData.departmentName        = department.name;
      }
    }

    return NextResponse.json({ data: dashboardData });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}
