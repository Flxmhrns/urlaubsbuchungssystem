"use client";
/**
 * ApprovalsClient – interaktiver Teil des Genehmigungs-Dashboards.
 *
 * Neu:
 *  • Filter nach Mitarbeitername (gilt für beide Abschnitte)
 *  • Statusfilter (Alle / Genehmigt / Abgelehnt) für bearbeitete Anträge
 *  • Audit-Log: „Bearbeitet am DD.MM.YYYY von <Manager>" unter dem Status-Badge
 */
import React, { useState } from "react";
import StatusBadge         from "@/components/StatusBadge";
import { formatDateRange, countWorkingDays } from "@/lib/utils";
import type { VacationStatus } from "@/lib/types";

// ── Typen ────────────────────────────────────────────────────────────────────

interface Request {
  id:            number;
  startDate:     string;
  endDate:       string;
  status:        string;
  reason:        string | null;
  rejectionNote: string | null;
  user: { id: number; name: string };
  processedAt:   string | null;
  processedBy:   { name: string } | null;
}

interface Props {
  initialRequests: Request[];
}

type StatusFilter = "all" | "APPROVED" | "REJECTED";

// ── Komponente ───────────────────────────────────────────────────────────────

export default function ApprovalsClient({ initialRequests }: Props) {
  // Kerndaten
  const [requests,      setRequests]      = useState<Request[]>(initialRequests);
  const [loadingId,     setLoadingId]     = useState<number | null>(null);
  const [rejectingId,   setRejectingId]   = useState<number | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [toast,         setToast]         = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Filter
  const [searchQuery,  setSearchQuery]  = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // ── Abgeleitete Listen ───────────────────────────────────────────────────

  const lc = searchQuery.toLowerCase();

  const pendingRequests   = requests.filter((r) => r.status === "PENDING");
  const processedRequests = requests.filter((r) => r.status !== "PENDING");

  const filteredPending = pendingRequests.filter((r) =>
    !lc || r.user.name.toLowerCase().includes(lc),
  );

  const filteredProcessed = processedRequests.filter((r) =>
    (!lc || r.user.name.toLowerCase().includes(lc)) &&
    (statusFilter === "all" || r.status === statusFilter),
  );

  // ── Hilfsfunktionen ──────────────────────────────────────────────────────

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleAction(id: number, action: "approve" | "reject", note?: string) {
    setLoadingId(id);
    try {
      const res  = await fetch(`/api/vacation-requests/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, rejectionNote: note }),
      });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.error ?? "Fehler beim Verarbeiten.", "err");
      } else {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status:        action === "approve" ? "APPROVED" : "REJECTED",
                  rejectionNote: note ?? null,
                  processedAt:   json.data.processedAt   ?? null,
                  processedBy:   json.data.processedBy   ?? null,
                }
              : r,
          ),
        );
        showToast(
          action === "approve"
            ? `Antrag von ${json.data.user.name} genehmigt.`
            : `Antrag von ${json.data.user.name} abgelehnt.`,
          "ok",
        );
      }
    } catch {
      showToast("Netzwerkfehler.", "err");
    } finally {
      setLoadingId(null);
      setRejectingId(null);
      setRejectionNote("");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white font-medium transition-all ${
          toast.type === "ok" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Filter-Leiste ─────────────────────────────────────────────────── */}
      <div className="card px-4 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">

        {/* Namenssuche */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Mitarbeiter suchen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input text-sm pl-9 w-full"
          />
        </div>

        {/* Trennlinie (nur Desktop) */}
        <div className="hidden sm:block h-6 w-px bg-gray-200" />

        {/* Status-Filter (für bearbeitete Anträge) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 whitespace-nowrap">Bearbeitete:</span>
          {(["all", "APPROVED", "REJECTED"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                statusFilter === s
                  ? s === "APPROVED"
                    ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                    : s === "REJECTED"
                    ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                    : "bg-primary-100 text-primary-700 ring-1 ring-primary-300"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "Alle" : s === "APPROVED" ? "Genehmigt" : "Abgelehnt"}
            </button>
          ))}
        </div>

        {/* Ergebnis-Zähler */}
        {lc && (
          <span className="text-xs text-gray-400 sm:ml-auto whitespace-nowrap">
            {filteredPending.length + filteredProcessed.length} Treffer
          </span>
        )}
      </div>

      {/* ── Ausstehende Anträge ───────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-base">Ausstehende Anträge</h2>
          <span className="badge-pending">{pendingRequests.length}</span>
        </div>

        {filteredPending.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
            {lc
              ? <p className="font-medium text-gray-500">Keine ausstehenden Anträge für „{searchQuery}".</p>
              : <><p className="font-medium text-gray-500">Alle Anträge bearbeitet!</p>
                  <p className="text-sm mt-0.5">Keine ausstehenden Genehmigungen.</p></>
            }
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPending.map((req) => {
              const days        = countWorkingDays(req.startDate, req.endDate);
              const isLoading   = loadingId  === req.id;
              const isRejecting = rejectingId === req.id;

              return (
                <div key={req.id} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {req.user.name.charAt(0)}
                        </div>
                        <p className="font-semibold text-gray-900">{req.user.name}</p>
                      </div>
                      <p className="text-sm text-gray-700 pl-10">
                        <span className="font-medium">{formatDateRange(req.startDate, req.endDate)}</span>
                        <span className="ml-2 text-gray-400">· {days} Arbeitstag{days !== 1 ? "e" : ""}</span>
                      </p>
                      {req.reason && (
                        <p className="text-sm text-gray-500 pl-10 mt-1 italic">„{req.reason}"</p>
                      )}
                    </div>

                    {!isRejecting && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAction(req.id, "approve")}
                          disabled={isLoading}
                          className="btn-success"
                        >
                          {isLoading ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Genehmigen
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setRejectingId(req.id)}
                          disabled={isLoading}
                          className="btn-danger"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Ablehnen
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ablehnungs-Dialog */}
                  {isRejecting && (
                    <div className="mt-3 pl-10 space-y-2">
                      <label className="form-label text-xs">Ablehnungsgrund (optional)</label>
                      <textarea
                        rows={2}
                        value={rejectionNote}
                        onChange={(e) => setRejectionNote(e.target.value)}
                        placeholder="Begründung für die Ablehnung…"
                        className="form-input text-sm resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(req.id, "reject", rejectionNote)}
                          disabled={isLoading}
                          className="btn-danger text-xs"
                        >
                          {isLoading ? "Wird abgelehnt…" : "Ablehnen bestätigen"}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectionNote(""); }}
                          className="btn-secondary text-xs"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bereits bearbeitete Anträge ───────────────────────────────────── */}
      {processedRequests.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-base text-gray-600">Bereits bearbeitet</h2>
            {filteredProcessed.length !== processedRequests.length && (
              <span className="text-xs text-gray-400">
                {filteredProcessed.length} von {processedRequests.length}
              </span>
            )}
          </div>

          {filteredProcessed.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">Keine bearbeiteten Anträge für die gewählten Filter.</p>
            </div>
          ) : (
            <>
              {/* Desktop-Tabelle */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Mitarbeiter", "Zeitraum", "Tage", "Status & Audit", "Notiz", "Aktion"].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProcessed.map((req) => {
                      const isLoading   = loadingId  === req.id;
                      const isRejecting = rejectingId === req.id;

                      return (
                        <React.Fragment key={req.id}>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3 text-sm font-medium text-gray-700">
                              {req.user.name}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-500">
                              {formatDateRange(req.startDate, req.endDate)}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-500">
                              {countWorkingDays(req.startDate, req.endDate)}
                            </td>

                            {/* Status + Audit-Info */}
                            <td className="px-6 py-3">
                              <StatusBadge status={req.status as VacationStatus} />
                              {req.processedAt && (
                                <p className="text-xs text-gray-400 mt-1 leading-tight">
                                  {new Date(req.processedAt).toLocaleDateString("de-DE")}
                                  {req.processedBy && (
                                    <span className="text-gray-300"> · {req.processedBy.name}</span>
                                  )}
                                </p>
                              )}
                            </td>

                            <td className="px-6 py-3 text-xs text-gray-400 max-w-xs truncate">
                              {req.rejectionNote ?? "—"}
                            </td>

                            {/* Aktion: Ablehnen für genehmigte Anträge */}
                            <td className="px-6 py-3">
                              {req.status === "APPROVED" && (
                                isRejecting ? (
                                  <button
                                    onClick={() => { setRejectingId(null); setRejectionNote(""); }}
                                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                                  >
                                    Abbrechen
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setRejectingId(req.id)}
                                    disabled={isLoading}
                                    className="btn-danger text-xs py-1 px-2"
                                  >
                                    Ablehnen
                                  </button>
                                )
                              )}
                            </td>
                          </tr>

                          {/* Inline-Ablehnungsformular */}
                          {isRejecting && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 bg-red-50 border-b border-red-100">
                                <p className="text-xs font-medium text-red-700 mb-2">
                                  Genehmigung zurückziehen – Urlaubstage werden dem Mitarbeiter gutgeschrieben.
                                </p>
                                <div className="flex items-start gap-3">
                                  <textarea
                                    rows={2}
                                    value={rejectionNote}
                                    onChange={(e) => setRejectionNote(e.target.value)}
                                    placeholder="Ablehnungsgrund (optional)…"
                                    className="form-input text-sm resize-none flex-1"
                                    autoFocus
                                  />
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => handleAction(req.id, "reject", rejectionNote)}
                                      disabled={isLoading}
                                      className="btn-danger text-xs whitespace-nowrap"
                                    >
                                      {isLoading ? "Wird abgelehnt…" : "Ablehnen bestätigen"}
                                    </button>
                                    <button
                                      onClick={() => { setRejectingId(null); setRejectionNote(""); }}
                                      className="btn-secondary text-xs whitespace-nowrap"
                                    >
                                      Abbrechen
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredProcessed.map((req) => {
                  const isLoading   = loadingId  === req.id;
                  const isRejecting = rejectingId === req.id;

                  return (
                    <div key={req.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{req.user.name}</p>
                          <p className="text-xs text-gray-400">{formatDateRange(req.startDate, req.endDate)}</p>
                          {req.rejectionNote && (
                            <p className="text-xs text-red-400 mt-0.5">{req.rejectionNote}</p>
                          )}
                          {/* Audit-Info (Mobile) */}
                          {req.processedAt && (
                            <p className="text-xs text-gray-300 mt-0.5">
                              {new Date(req.processedAt).toLocaleDateString("de-DE")}
                              {req.processedBy && ` · ${req.processedBy.name}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={req.status as VacationStatus} />
                          {req.status === "APPROVED" && !isRejecting && (
                            <button
                              onClick={() => setRejectingId(req.id)}
                              disabled={isLoading}
                              className="btn-danger text-xs py-1 px-2"
                            >
                              Ablehnen
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mobile Ablehnungsformular */}
                      {isRejecting && (
                        <div className="bg-red-50 rounded-lg p-3 space-y-2">
                          <p className="text-xs text-red-700 font-medium">
                            Urlaubstage werden gutgeschrieben.
                          </p>
                          <textarea
                            rows={2}
                            value={rejectionNote}
                            onChange={(e) => setRejectionNote(e.target.value)}
                            placeholder="Ablehnungsgrund (optional)…"
                            className="form-input text-sm resize-none w-full"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(req.id, "reject", rejectionNote)}
                              disabled={isLoading}
                              className="btn-danger text-xs flex-1"
                            >
                              {isLoading ? "Wird abgelehnt…" : "Ablehnen bestätigen"}
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectionNote(""); }}
                              className="btn-secondary text-xs flex-1"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
