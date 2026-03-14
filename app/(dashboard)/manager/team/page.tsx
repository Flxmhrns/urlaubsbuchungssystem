/**
 * Manager-Seite: Team-Verwaltung (Server Component)
 *
 * Lädt alle Mitarbeiter der Abteilung und delegiert die
 * interaktiven Teile (Bearbeiten, Jahreswechsel) an TeamManagementClient.
 */
import { auth }                 from "@/auth";
import { prisma }               from "@/lib/prisma";
import { redirect }             from "next/navigation";
import Link                     from "next/link";
import TeamManagementClient     from "@/components/TeamManagementClient";

export default async function TeamPage() {
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

  const employees = await prisma.user.findMany({
    where:   { departmentId: department.id, role: "EMPLOYEE" },
    orderBy: { name: "asc" },
    select: {
      id:                true,
      name:              true,
      email:             true,
      vacationDaysTotal: true,
      vacationDaysUsed:  true,
    },
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Team-Verwaltung</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Abteilung: <span className="font-medium text-gray-700">{department.name}</span>
            {" · "}{employees.length} {employees.length === 1 ? "Mitarbeiter" : "Mitarbeiter"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/manager/approvals" className="btn-secondary text-sm">
            Genehmigungen
          </Link>
          <Link href="/manager/calendar" className="btn-secondary text-sm">
            Kalender
          </Link>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p>Keine Mitarbeiter in dieser Abteilung.</p>
        </div>
      ) : (
        <TeamManagementClient initialEmployees={employees} />
      )}
    </div>
  );
}
