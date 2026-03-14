"use client";
/**
 * TeamManagementClient
 *
 * Zeigt alle Mitarbeiter der Abteilung mit:
 *  • Urlaubsstatistik (Gesamt / Verbraucht / Verbleibend)
 *  • Inline-Bearbeitungsformular (Tage manuell anpassen)
 *  • Jahreswechsel-Dialog (Resturlaub + neues Grundkontingent)
 */
import { useState } from "react";

interface Employee {
  id:                number;
  name:              string;
  email:             string;
  vacationDaysTotal: number;
  vacationDaysUsed:  number;
}

interface Props {
  initialEmployees: Employee[];
}

// ── Jahreswechsel-Modal ──────────────────────────────────────
function CarryOverModal({
  employees,
  onClose,
  onSuccess,
}: {
  employees: Employee[];
  onClose:   () => void;
  onSuccess: (updated: Employee[]) => void;
}) {
  const [newAnnualDays, setNewAnnualDays] = useState(28);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  const previews = employees.map((e) => ({
    ...e,
    carryOver: Math.max(0, e.vacationDaysTotal - e.vacationDaysUsed),
    newTotal:  newAnnualDays + Math.max(0, e.vacationDaysTotal - e.vacationDaysUsed),
  }));

  async function handleCarryOver() {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/users/carry-over", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newAnnualDays }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Fehler beim Jahreswechsel.");
      } else {
        // Lokal aktualisieren
        onSuccess(
          employees.map((e) => ({
            ...e,
            vacationDaysTotal: newAnnualDays + Math.max(0, e.vacationDaysTotal - e.vacationDaysUsed),
            vacationDaysUsed:  0,
          })),
        );
        onClose();
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary-700 text-white rounded-t-2xl px-6 py-4">
          <h2 className="text-lg font-bold">Jahreswechsel / Resturlaub übertragen</h2>
          <p className="text-primary-200 text-sm mt-0.5">
            Nicht verbrauchte Urlaubstage werden ins neue Jahr mitgenommen.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Neues Grundkontingent */}
          <div>
            <label className="form-label">Neues Jahres-Grundkontingent (Tage)</label>
            <input
              type="number"
              min={0}
              max={365}
              value={newAnnualDays}
              onChange={(e) => setNewAnnualDays(Number(e.target.value))}
              className="form-input w-32"
            />
            <p className="text-xs text-gray-400 mt-1">
              Das ist das neue Jahresbudget vor dem Übertrag. Typisch: 25–30 Tage.
            </p>
          </div>

          {/* Vorschau-Tabelle */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Vorschau</p>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Mitarbeiter</th>
                    <th className="px-4 py-2 text-right">Resturlaub</th>
                    <th className="px-4 py-2 text-right">+ Neues Budget</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">= Gesamt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previews.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-2.5 text-right text-amber-600">+{p.carryOver} Tage</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">+{newAnnualDays} Tage</td>
                      <td className="px-4 py-2.5 text-right font-bold text-green-700">{p.newTotal} Tage</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Verbrauchte Tage werden auf 0 zurückgesetzt. Die Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>
          )}

          {/* Aktionen */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCarryOver}
              disabled={loading || newAnnualDays < 0}
              className="btn-primary flex-1 justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Wird durchgeführt…
                </>
              ) : (
                "Jahreswechsel durchführen"
              )}
            </button>
            <button onClick={onClose} className="btn-secondary">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline-Edit-Formular für einen Mitarbeiter ───────────────
function EditForm({
  employee,
  onSave,
  onCancel,
}: {
  employee: Employee;
  onSave:   (updated: Employee) => void;
  onCancel: () => void;
}) {
  const [total,   setTotal]   = useState(employee.vacationDaysTotal);
  const [used,    setUsed]    = useState(employee.vacationDaysUsed);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const remaining = total - used;
  const isValid   = total >= 0 && used >= 0 && used <= total;

  async function handleSave() {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/users/${employee.id}/vacation-days`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ vacationDaysTotal: total, vacationDaysUsed: used }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Fehler beim Speichern.");
      } else {
        onSave({ ...employee, vacationDaysTotal: total, vacationDaysUsed: used });
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 p-4 bg-primary-50 rounded-lg border border-primary-200 space-y-3">
      <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Tage anpassen</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label text-xs">Jahresurlaub gesamt</label>
          <input
            type="number" min={0} max={365}
            value={total}
            onChange={(e) => setTotal(Number(e.target.value))}
            className="form-input text-sm"
          />
        </div>
        <div>
          <label className="form-label text-xs">Bereits verbraucht</label>
          <input
            type="number" min={0} max={total}
            value={used}
            onChange={(e) => setUsed(Number(e.target.value))}
            className="form-input text-sm"
          />
        </div>
      </div>

      {/* Live-Vorschau Resturlaub */}
      <div className={`text-sm font-medium ${remaining < 0 ? "text-red-600" : "text-green-700"}`}>
        Verbleibend: <span className="font-bold">{remaining} Tage</span>
        {remaining < 0 && <span className="ml-2 text-xs">(ungültig!)</span>}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !isValid}
          className="btn-primary text-sm"
        >
          {loading ? "Speichert…" : "Speichern"}
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ─────────────────────────────────────────
export default function TeamManagementClient({ initialEmployees }: Props) {
  const [employees,      setEmployees]      = useState<Employee[]>(initialEmployees);
  const [editingId,      setEditingId]      = useState<number | null>(null);
  const [showCarryOver,  setShowCarryOver]  = useState(false);
  const [toast,          setToast]          = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleSaved(updated: Employee) {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditingId(null);
    showToast(`Urlaubstage von ${updated.name} erfolgreich aktualisiert.`, "ok");
  }

  function handleCarryOverSuccess(updated: Employee[]) {
    setEmployees(updated);
    showToast("Jahreswechsel erfolgreich durchgeführt!", "ok");
  }

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white font-medium transition-all ${
          toast.type === "ok" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Jahreswechsel-Banner */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200 p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-primary-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Jahreswechsel / Resturlaub übertragen
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Nicht verbrauchte Urlaubstage werden ins neue Jahr mitgenommen.
            Verbrauchte Tage werden auf 0 zurückgesetzt.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Aktuell werden Resttage <span className="font-medium text-amber-600">nicht automatisch</span> übertragen
            — diese Funktion führt den Übertrag manuell durch.
          </p>
        </div>
        <button
          onClick={() => setShowCarryOver(true)}
          className="btn-primary flex-shrink-0"
        >
          Jahreswechsel starten
        </button>
      </div>

      {/* Mitarbeiter-Karten */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base">Mitarbeiter ({employees.length})</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {employees.map((emp) => {
            const remaining  = emp.vacationDaysTotal - emp.vacationDaysUsed;
            const usedPct    = Math.min(100, Math.round((emp.vacationDaysUsed  / emp.vacationDaysTotal) * 100) || 0);
            const isEditing  = editingId === emp.id;

            return (
              <div key={emp.id} className="px-6 py-5">
                {/* Hauptzeile */}
                <div className="flex items-start justify-between gap-4 flex-wrap">

                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center flex-shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-400 truncate">{emp.email}</p>
                    </div>
                  </div>

                  {/* Tage-Anzeige */}
                  <div className="flex items-center gap-6 text-center flex-wrap">
                    <div>
                      <p className="text-xl font-bold text-gray-800">{emp.vacationDaysTotal}</p>
                      <p className="text-xs text-gray-400">Gesamt</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-500">{emp.vacationDaysUsed}</p>
                      <p className="text-xs text-gray-400">Verbraucht</p>
                    </div>
                    <div>
                      <p className={`text-xl font-bold ${remaining > 5 ? "text-green-600" : remaining > 0 ? "text-amber-600" : "text-red-500"}`}>
                        {remaining}
                      </p>
                      <p className="text-xs text-gray-400">Verbleibend</p>
                    </div>

                    {/* Bearbeiten-Button */}
                    <button
                      onClick={() => setEditingId(isEditing ? null : emp.id)}
                      className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                        isEditing
                          ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                      }`}
                    >
                      {isEditing ? "✕ Abbrechen" : "✎ Bearbeiten"}
                    </button>
                  </div>
                </div>

                {/* Fortschrittsbalken */}
                <div className="mt-3 ml-13">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        usedPct >= 90 ? "bg-red-500" : usedPct >= 70 ? "bg-amber-500" : "bg-primary-500"
                      }`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{usedPct}% verbraucht</p>
                </div>

                {/* Inline-Edit-Formular */}
                {isEditing && (
                  <EditForm
                    employee={emp}
                    onSave={handleSaved}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Jahreswechsel-Modal */}
      {showCarryOver && (
        <CarryOverModal
          employees={employees}
          onClose={() => setShowCarryOver(false)}
          onSuccess={handleCarryOverSuccess}
        />
      )}
    </div>
  );
}
