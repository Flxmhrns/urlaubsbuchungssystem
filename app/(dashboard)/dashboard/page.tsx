/**
 * Dashboard-Seite (Server Component)
 *
 * Zeigt:
 *  • Urlaubsübersicht (Kontingent, verbraucht, ausstehend, verbleibend)
 *  • Letzte 5 Anträge
 *  • (Manager) Hinweis auf ausstehende Genehmigungen
 */
import { auth }          from "@/auth";
import { prisma }        from "@/lib/prisma";
import { redirect }      from "next/navigation";
import Link              from "next/link";
import StatusBadge       from "@/components/StatusBadge";
import { formatDateRange, countWorkingDays } from "@/lib/utils";
import type { VacationStatus } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId    = Number(session.user.id);
  const role      = (session.user as any).role as string;
  const isManager = role === "MANAGER";

  // ── Nutzerdaten ──────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { department: true },
  });
  if (!user) redirect("/login");

  // ── Letzte 5 eigene Anträge ──────────────────────────────
  const recentRequests = await prisma.vacationRequest.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    5,
  });

  // ── Ausstehende Tage berechnen ───────────────────────────
  const pendingRequests = recentRequests.filter((r) => r.status === "PENDING");
  const pendingDays = pendingRequests.reduce(
    (sum, r) => sum + countWorkingDays(r.startDate, r.endDate), 0
  );

  const remainingDays = user.vacationDaysTotal - user.vacationDaysUsed;

  // ── (Manager) Ausstehende Genehmigungen ─────────────────
  let pendingApprovalsCount = 0;
  if (isManager) {
    const dept = await prisma.department.findFirst({ where: { managerId: userId } });
    if (dept) {
      pendingApprovalsCount = await prisma.vacationRequest.count({
        where: { status: "PENDING", user: { departmentId: dept.id } },
      });
    }
  }

  // ── Fortschritts-Prozentsatz ─────────────────────────────
  const usedPercent = Math.min(
    100,
    Math.round((user.vacationDaysUsed / user.vacationDaysTotal) * 100)
  );

  return (
    <div className="space-y-6">

      {/* Seitenüberschrift */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Willkommen, {user.name.split(" ")[0]}!</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {user.department?.name} · {isManager ? "Abteilungsleiter" : "Mitarbeiter"}
          </p>
        </div>
        {!isManager && (
          <Link href="/new-request" className="btn-primary">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Urlaub beantragen
          </Link>
        )}
      </div>

      {/* ── Manager-Banner ───────────────────────────────────── */}
      {isManager && pendingApprovalsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-amber-800">
                {pendingApprovalsCount} ausstehende{" "}
                {pendingApprovalsCount === 1 ? "Genehmigung" : "Genehmigungen"}
              </p>
              <p className="text-sm text-amber-600">Deiner Abteilung warten auf Bearbeitung.</p>
            </div>
          </div>
          <Link href="/manager/approvals" className="btn-primary text-sm">
            Jetzt bearbeiten
          </Link>
        </div>
      )}

      {/* ── Urlaubsübersicht-Karten ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gesamt"
          value={user.vacationDaysTotal}
          unit="Tage"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Verbraucht"
          value={user.vacationDaysUsed}
          unit="Tage"
          color="gray"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <StatCard
          label="Ausstehend"
          value={pendingDays}
          unit="Tage"
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Verfügbar"
          value={remainingDays}
          unit="Tage"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
        />
      </div>

      {/* Fortschrittsbalken */}
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Urlaubsverbrauch</span>
          <span className="text-sm text-gray-500">
            {user.vacationDaysUsed} / {user.vacationDaysTotal} Tage ({usedPercent}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        {pendingDays > 0 && (
          <p className="text-xs text-amber-600 mt-1.5">
            +{pendingDays} Tage zur Genehmigung ausstehend
          </p>
        )}
      </div>

      {/* ── Letzte Anträge ───────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2>Letzte Anträge</h2>
          <Link href="/my-requests" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Alle anzeigen →
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Noch keine Anträge gestellt.</p>
            {!isManager && (
              <Link href="/new-request" className="mt-3 inline-block btn-primary text-sm">
                Ersten Antrag stellen
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentRequests.map((req) => (
              <div key={req.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateRange(req.startDate, req.endDate)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {countWorkingDays(req.startDate, req.endDate)} Arbeitstage
                    {req.reason && ` · ${req.reason}`}
                  </p>
                </div>
                <StatusBadge status={req.status as VacationStatus} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hilfs-Komponente: Stat-Karte ─────────────────────────────
function StatCard({
  label, value, unit, color, icon,
}: {
  label: string;
  value: number;
  unit:  string;
  color: "blue" | "gray" | "amber" | "green";
  icon:  React.ReactNode;
}) {
  const colorMap = {
    blue:  "bg-blue-50  text-blue-600",
    gray:  "bg-gray-100 text-gray-500",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div className="card flex items-start gap-3 p-4">
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{unit} {label}</p>
      </div>
    </div>
  );
}
