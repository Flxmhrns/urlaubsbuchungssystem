/**
 * Manager-Seite: Abteilungs-Kalender (Server Component)
 *
 * Lädt alle genehmigten und ausstehenden Urlaube der Abteilung
 * und übergibt sie an die VacationCalendar Client Component.
 */
import { auth }            from "@/auth";
import { prisma }          from "@/lib/prisma";
import { redirect }        from "next/navigation";
import Link                from "next/link";
// CalendarWrapper ist eine Client Component und darf ssr:false verwenden
import CalendarWrapper     from "@/components/CalendarWrapper";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (role !== "MANAGER") redirect("/dashboard");

  const managerId = Number(session.user.id);

  const department = await prisma.department.findFirst({
    where: { managerId },
  });

  if (!department) {
    return (
      <div className="card text-center py-12 text-gray-400">
        <p>Du bist keiner Abteilung als Leiter zugeordnet.</p>
      </div>
    );
  }

  // Alle genehmigten + ausstehenden Urlaube der Abteilung
  const requests = await prisma.vacationRequest.findMany({
    where: {
      status: { in: ["APPROVED", "PENDING"] },
      user:   { departmentId: department.id },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  // Für Client Component serialisieren
  const events = requests.map((r) => ({
    id:        r.id,
    title:     r.user.name,
    startDate: r.startDate.toISOString(),
    endDate:   r.endDate.toISOString(),
    status:    r.status,
    userId:    r.user.id,
  }));

  // Mitarbeiterliste für Sidebar
  const employees = await prisma.user.findMany({
    where:   { departmentId: department.id, role: "EMPLOYEE" },
    orderBy: { name: "asc" },
    select:  { id: true, name: true, vacationDaysTotal: true, vacationDaysUsed: true },
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Abteilungs-Kalender</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {department.name} · {events.length} {events.length === 1 ? "Eintrag" : "Einträge"}
          </p>
        </div>
        <Link href="/manager/approvals" className="btn-secondary text-sm">
          Zu den Genehmigungen
        </Link>
      </div>

      {/* Haupt-Layout: Kalender + Mitarbeiter-Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Kalender (3/4 Breite) */}
        <div className="lg:col-span-3">
          <div className="card p-4">
            <CalendarWrapper events={events} />
          </div>
        </div>

        {/* Mitarbeiter-Sidebar (1/4 Breite) */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Mitarbeiter
            </h3>
            <div className="space-y-3">
              {employees.map((emp) => {
                const remaining = emp.vacationDaysTotal - emp.vacationDaysUsed;
                const pct       = Math.min(100, Math.round((emp.vacationDaysUsed / emp.vacationDaysTotal) * 100));
                return (
                  <div key={emp.id}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-700 truncate">{emp.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                        {remaining}d
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 ml-8">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kurzübersicht ausstehende */}
          {events.filter((e) => e.status === "PENDING").length > 0 && (
            <div className="card p-4 bg-amber-50 border-amber-200">
              <p className="text-sm font-semibold text-amber-800 mb-2">Ausstehend</p>
              <div className="space-y-1">
                {events
                  .filter((e) => e.status === "PENDING")
                  .map((e) => (
                    <p key={e.id} className="text-xs text-amber-700">
                      {e.title} · {new Date(e.startDate).toLocaleDateString("de-DE")}
                    </p>
                  ))}
              </div>
              <Link href="/manager/approvals" className="mt-3 block text-xs font-medium text-amber-700 hover:text-amber-900 underline">
                Jetzt bearbeiten →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
