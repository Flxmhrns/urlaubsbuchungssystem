"use client";
/**
 * Seite „Neuer Urlaubsantrag" (Client Component)
 *
 * Features:
 *  • Datumseingabe mit Live-Berechnung der Arbeitstage
 *  • Resturlaub-Anzeige
 *  • Validierung (Datum, genug Tage)
 *  • POST an /api/vacation-requests
 *  • Weiterleitung zu /my-requests nach Erfolg
 */
import { useState, useEffect, useMemo } from "react";
import { useRouter }                     from "next/navigation";
import Link                              from "next/link";
import { countWorkingDays, formatDate }  from "@/lib/utils";

interface DashboardUser {
  vacationDaysTotal:     number;
  vacationDaysUsed:      number;
  vacationDaysRemaining: number;
  vacationDaysPending:   number;
}

// Heutiges Datum als ISO-String (YYYY-MM-DD)
function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export default function NewRequestPage() {
  const router = useRouter();

  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [reason,    setReason]    = useState("");
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [userStats, setUserStats] = useState<DashboardUser | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Dashboard-Daten laden (für Resturlaub-Anzeige)
  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.user) setUserStats(json.data.user);
      })
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  // Arbeitstage live berechnen
  const workingDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (s > e) return 0;
    return countWorkingDays(s, e);
  }, [startDate, endDate]);

  // Validierungen
  const dateError = useMemo(() => {
    if (!startDate || !endDate) return "";
    if (new Date(startDate) > new Date(endDate))
      return "Das Enddatum muss nach dem Startdatum liegen.";
    return "";
  }, [startDate, endDate]);

  const hasEnoughDays = useMemo(() => {
    if (!userStats || workingDays === 0) return true;
    return workingDays <= userStats.vacationDaysRemaining;
  }, [workingDays, userStats]);

  const canSubmit = startDate && endDate && !dateError && hasEnoughDays && workingDays > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/vacation-requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ startDate, endDate, reason }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Unbekannter Fehler.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/my-requests"), 1800);
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  // Erfolgs-Anzeige
  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center card py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-green-700 mb-2">Antrag eingereicht!</h2>
        <p className="text-gray-500 text-sm">Dein Urlaubsantrag wurde erfolgreich gestellt und wartet auf Genehmigung.</p>
        <p className="text-xs text-gray-400 mt-3">Weiterleitung…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/dashboard" className="hover:text-primary-600">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-900">Neuer Antrag</span>
        </div>
        <h1>Urlaubsantrag stellen</h1>
      </div>

      {/* Resturlaub-Info */}
      {!loadingStats && userStats && (
        <div className="card p-4 bg-primary-50 border-primary-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-primary-700">{userStats.vacationDaysTotal}</p>
              <p className="text-xs text-gray-500">Gesamt</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-600">{userStats.vacationDaysUsed}</p>
              <p className="text-xs text-gray-500">Verbraucht</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">{userStats.vacationDaysPending}</p>
              <p className="text-xs text-gray-500">Ausstehend</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{userStats.vacationDaysRemaining}</p>
              <p className="text-xs text-gray-500">Verfügbar</p>
            </div>
          </div>
        </div>
      )}

      {/* Formular */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Fehlermeldung */}
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 flex gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Datumsfelder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="form-label">Startdatum *</label>
              <input
                id="startDate"
                type="date"
                required
                min={todayIso()}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="form-input"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="endDate" className="form-label">Enddatum *</label>
              <input
                id="endDate"
                type="date"
                required
                min={startDate || todayIso()}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* Datum-Fehler */}
          {dateError && (
            <p className="text-sm text-red-600">{dateError}</p>
          )}

          {/* Live-Arbeitstage + Warnungen */}
          {workingDays > 0 && (
            <div className={`p-3 rounded-lg border ${
              hasEnoughDays
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center gap-2">
                <svg className={`w-5 h-5 ${hasEnoughDays ? "text-green-600" : "text-red-500"}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {hasEnoughDays
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  }
                </svg>
                <div>
                  <p className={`text-sm font-medium ${hasEnoughDays ? "text-green-800" : "text-red-700"}`}>
                    {workingDays} Arbeitstag{workingDays !== 1 ? "e" : ""}
                    {startDate && endDate && ` (${formatDate(startDate)} – ${formatDate(endDate)})`}
                  </p>
                  {!hasEnoughDays && (
                    <p className="text-xs text-red-600 mt-0.5">
                      Nicht genug Resturlaub. Verfügbar: {userStats?.vacationDaysRemaining} Tage.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Begründung */}
          <div>
            <label htmlFor="reason" className="form-label">
              Begründung <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-input resize-none"
              placeholder="z. B. Familienurlaub, Reise, Erholung…"
              disabled={loading}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{reason.length}/500</p>
          </div>

          {/* Aktionen */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Wird eingereicht…
                </>
              ) : (
                "Antrag einreichen"
              )}
            </button>
            <Link href="/dashboard" className="btn-secondary">
              Abbrechen
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
