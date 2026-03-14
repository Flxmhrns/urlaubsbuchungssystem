/**
 * Seite „Meine Anträge" (Server Component)
 *
 * Lädt alle Anträge des eingeloggten Mitarbeiters und delegiert
 * die interaktiven Teile (Stornieren, Toast) an MyRequestsClient.
 */
import { auth }               from "@/auth";
import { prisma }             from "@/lib/prisma";
import { redirect }           from "next/navigation";
import Link                   from "next/link";
import MyRequestsClient       from "@/components/MyRequestsClient";

export default async function MyRequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = Number(session.user.id);

  const requests = await prisma.vacationRequest.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id:            true,
      startDate:     true,
      endDate:       true,
      status:        true,
      reason:        true,
      rejectionNote: true,
      createdAt:     true,
    },
  });

  // Daten serialisieren (Date → string) für die Client-Komponente
  const serialized = requests.map((r) => ({
    ...r,
    startDate: r.startDate.toISOString(),
    endDate:   r.endDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Meine Anträge</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {requests.length} {requests.length === 1 ? "Antrag" : "Anträge"} insgesamt
          </p>
        </div>
        <Link href="/new-request" className="btn-primary">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neuer Antrag
        </Link>
      </div>

      <MyRequestsClient initialRequests={serialized} />
    </div>
  );
}
