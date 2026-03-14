/**
 * Admin – Teamhierarchie (Server Component)
 *
 * Lädt Abteilungen + Mitglieder server-seitig und delegiert
 * die interaktive Drag-&-Drop-Darstellung an HierarchyBoard.
 */
import { auth }          from "@/auth";
import { prisma }        from "@/lib/prisma";
import { redirect }      from "next/navigation";
import HierarchyBoard    from "@/components/HierarchyBoard";

export default async function HierarchyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  // Alle Abteilungen mit ihren Mitgliedern laden
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      managerId: true,
      employees: {
        where:   { role: { not: "ADMIN" } },
        select:  { id: true, name: true, email: true, role: true,
                   departmentId: true, vacationDaysTotal: true, vacationDaysUsed: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Benutzer ohne Abteilungszuordnung
  const unassigned = await prisma.user.findMany({
    where:   { departmentId: null, role: { not: "ADMIN" } },
    select:  { id: true, name: true, email: true, role: true,
               departmentId: true, vacationDaysTotal: true, vacationDaysUsed: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1>Teamhierarchie</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Mitarbeiter per Drag &amp; Drop zwischen Abteilungen verschieben · Abteilungsleiter zuweisen · Konten verwalten
        </p>
      </div>

      <HierarchyBoard
        initialDepartments={departments}
        initialUnassigned={unassigned}
      />
    </div>
  );
}
