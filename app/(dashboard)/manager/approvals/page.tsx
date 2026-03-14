/**
 * Manager-Seite: Genehmigungs-Dashboard (Server Component)
 *
 * Lädt alle Anträge der eigenen Abteilung server-seitig;
 * delegiert die interaktiven Teile (Approve/Reject) an ApprovalsClient.
 */
import { auth }            from "@/auth";
import { prisma }          from "@/lib/prisma";
import { redirect }        from "next/navigation";
import ApprovalsClient     from "@/components/ApprovalsClient";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (role !== "MANAGER") redirect("/dashboard");

  const managerId = Number(session.user.id);

  // Manager-Abteilung ermitteln
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

  // Alle Anträge der Abteilung laden (PENDING zuerst, dann neueste)
  const requests = await prisma.vacationRequest.findMany({
    where: {
      user: { departmentId: department.id },
    },
    include: {
      user:        { select: { id: true, name: true } },
      processedBy: { select: { name: true } },
    },
    orderBy: [
      { status: "asc" },    // PENDING zuerst (alphabetisch vor APPROVED/REJECTED)
      { createdAt: "desc" },
    ],
  });

  // Datum-Objekte zu Strings serialisieren (für Client Component)
  const serialized = requests.map((r) => ({
    ...r,
    startDate:   r.startDate.toISOString(),
    endDate:     r.endDate.toISOString(),
    createdAt:   r.createdAt.toISOString(),
    updatedAt:   r.updatedAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
  }));

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1>Genehmigungen</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Abteilung: <span className="font-medium text-gray-700">{department.name}</span>
          {pendingCount > 0 && (
            <span className="ml-2 badge-pending">{pendingCount} ausstehend</span>
          )}
        </p>
      </div>

      <ApprovalsClient initialRequests={serialized} />
    </div>
  );
}
