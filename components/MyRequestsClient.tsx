"use client";
/**
 * MyRequestsClient – interaktive Antragsübersicht des Mitarbeiters.
 *
 * Empfängt die initialen Anträge als Props (von der Server Component).
 * PENDING-Anträge können direkt storniert werden (DELETE-API).
 * Nach der Stornierung verschwindet der Eintrag aus der Liste.
 */
import { useState }  from "react";
import Link          from "next/link";
import StatusBadge   from "@/components/StatusBadge";
import { formatDateRange, countWorkingDays } from "@/lib/utils";
import type { VacationStatus } from "@/lib/types";

interface Request {
  id:            number;
  startDate:     string;
  endDate:       string;
  status:        string;
  reason:        string | null;
  rejectionNote: string | null;
  createdAt:     string;
}

interface Props {
  initialRequests: Request[];
}

export default function MyRequestsClient({ initialRequests }: Props) {
  const [requests,     setRequests]     = useState<Request[]>(initialRequests);
  const [confirmId,    setConfirmId]    = useState<number | null>(null);
  const [loadingId,    setLoadingId]    = useState<number | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── Statistik aus aktuellem State ────────────────────────────
  const pendingCount  = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCancel(id: number) {
    setLoadingId(id);
    try {
      const res  = await fetch(`/api/vacation-requests/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.error ?? "Fehler beim Stornieren.", "err");
      } else {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        showToast("Antrag erfolgreich storniert.", "ok");
      }
    } catch {
      showToast("Netzwerkfehler.", "err");
    } finally {
      setLoadingId(null);
      setConfirmId(null);
    }
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white font-medium transition-all ${
          toast.type === "ok" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Status-Übersicht ──────────────────────────────────── */}
      {requests.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Ausstehend</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Genehmigt</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Abgelehnt</p>
          </div>
        </div>
      )}

      {/* ── Tabelle / Leer-State ─────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        {requests.length === 0 ? (
          <div className="text-center py-16 px-4 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-medium text-gray-500 mb-1">Noch keine Anträge vorhanden</p>
            <p className="text-sm">Stelle deinen ersten Urlaubsantrag!</p>
            <Link href="/new-request" className="mt-4 inline-block btn-primary">
              Jetzt beantragen
            </Link>
          </div>
        ) : (
          <>
            {/* ── Desktop-Tabelle ─────────────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Zeitraum", "Arbeitstage", "Begründung", "Status", "Eingereicht am", "Aktion"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {requests.map((req) => {
                    const isLoading    = loadingId === req.id;
                    const isConfirming = confirmId === req.id;

                    return (
                      <tr key={req.id} className={`hover:bg-gray-50 transition-colors ${isConfirming ? "bg-red-50" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDateRange(req.startDate, req.endDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {countWorkingDays(req.startDate, req.endDate)} Tage
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                          {req.reason ? (
                            <span className="truncate block max-w-xs" title={req.reason}>{req.reason}</span>
                          ) : (
                            <span className="text-gray-300 italic">—</span>
                          )}
                          {req.rejectionNote && (
                            <span className="block text-xs text-red-500 mt-0.5" title={req.rejectionNote}>
                              Ablehnung: {req.rejectionNote}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={req.status as VacationStatus} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(req.createdAt).toLocaleDateString("de-DE")}
                        </td>

                        {/* Stornieren – nur für PENDING */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.status === "PENDING" && (
                            isConfirming ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-red-600 font-medium">Wirklich stornieren?</span>
                                <button
                                  onClick={() => handleCancel(req.id)}
                                  disabled={isLoading}
                                  className="btn-danger text-xs py-1 px-2"
                                >
                                  {isLoading ? "…" : "Ja"}
                                </button>
                                <button
                                  onClick={() => setConfirmId(null)}
                                  className="btn-secondary text-xs py-1 px-2"
                                >
                                  Nein
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmId(req.id)}
                                className="text-xs text-gray-400 hover:text-red-600 underline transition-colors"
                              >
                                Stornieren
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile-Liste ────────────────────────────────── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {requests.map((req) => {
                const isLoading    = loadingId === req.id;
                const isConfirming = confirmId === req.id;

                return (
                  <div key={req.id} className={`px-4 py-4 space-y-2 ${isConfirming ? "bg-red-50" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDateRange(req.startDate, req.endDate)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {countWorkingDays(req.startDate, req.endDate)} Arbeitstage
                        </p>
                        {req.reason && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{req.reason}</p>
                        )}
                        {req.rejectionNote && (
                          <p className="text-xs text-red-500 mt-1">{req.rejectionNote}</p>
                        )}
                      </div>
                      <StatusBadge status={req.status as VacationStatus} />
                    </div>

                    {/* Mobile Stornieren */}
                    {req.status === "PENDING" && (
                      isConfirming ? (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-red-600 font-medium flex-1">Wirklich stornieren?</span>
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={isLoading}
                            className="btn-danger text-xs py-1 px-3"
                          >
                            {isLoading ? "…" : "Ja, stornieren"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="btn-secondary text-xs py-1 px-3"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(req.id)}
                          className="text-xs text-gray-400 hover:text-red-600 underline transition-colors"
                        >
                          Antrag stornieren
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
