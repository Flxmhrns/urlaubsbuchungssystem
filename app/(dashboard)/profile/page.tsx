"use client";
/**
 * Profil-Seite – E-Mail und Passwort ändern.
 * Für alle Rollen (Employee, Manager, Admin).
 */
import { useSession } from "next-auth/react";
import { useState }   from "react";

function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {msg}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {msg}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  // E-Mail-Formular
  const [emailForm, setEmailForm] = useState({ currentPassword: "", newEmail: "" });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult,  setEmailResult]  = useState<{ ok: boolean; msg: string } | null>(null);

  // Passwort-Formular
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwResult,  setPwResult]  = useState<{ ok: boolean; msg: string } | null>(null);

  // ── E-Mail ändern ──────────────────────────────────────────
  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailResult(null);
    setEmailLoading(true);

    const res  = await fetch("/api/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        currentPassword: emailForm.currentPassword,
        newEmail:        emailForm.newEmail,
      }),
    });
    const json = await res.json();
    setEmailLoading(false);

    if (res.ok) {
      setEmailResult({ ok: true, msg: "E-Mail-Adresse erfolgreich geändert." });
      setEmailForm({ currentPassword: "", newEmail: "" });
    } else {
      setEmailResult({ ok: false, msg: json.error ?? "Fehler." });
    }
  }

  // ── Passwort ändern ────────────────────────────────────────
  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordResult(null);

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwResult({ ok: false, msg: "Die neuen Passwörter stimmen nicht überein." });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwResult({ ok: false, msg: "Das neue Passwort muss mindestens 8 Zeichen lang sein." });
      return;
    }

    setPwLoading(true);
    const res  = await fetch("/api/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      }),
    });
    const json = await res.json();
    setPwLoading(false);

    if (res.ok) {
      setPwResult({ ok: true, msg: "Passwort erfolgreich geändert." });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setPwResult({ ok: false, msg: json.error ?? "Fehler." });
    }
  }

  function setPasswordResult(v: { ok: boolean; msg: string } | null) {
    setPwResult(v);
  }

  const roleLabel = (user as any)?.role === "ADMIN"
    ? "Administrator"
    : (user as any)?.role === "MANAGER"
    ? "Abteilungsleiter"
    : "Mitarbeiter";

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1>Mein Profil</h1>
        <p className="text-sm text-gray-500 mt-0.5">E-Mail-Adresse und Passwort verwalten</p>
      </div>

      {/* Profil-Info-Karte */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
          {user?.name?.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded font-medium ${
            (user as any)?.role === "ADMIN"
              ? "bg-purple-100 text-purple-700"
              : (user as any)?.role === "MANAGER"
              ? "bg-amber-100 text-amber-700"
              : "bg-primary-100 text-primary-700"
          }`}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── E-Mail ändern ──────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base">E-Mail-Adresse ändern</h2>
            <p className="text-xs text-gray-400 mt-0.5">Aktuelle Adresse: <span className="font-medium text-gray-600">{user?.email}</span></p>
          </div>
        </div>

        <form onSubmit={submitEmail} className="space-y-4">
          <div>
            <label className="form-label">Neue E-Mail-Adresse</label>
            <input
              type="email"
              required
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm((f) => ({ ...f, newEmail: e.target.value }))}
              className="form-input"
              placeholder="neue@email.de"
            />
          </div>
          <div>
            <label className="form-label">Aktuelles Passwort zur Bestätigung</label>
            <input
              type="password"
              required
              value={emailForm.currentPassword}
              onChange={(e) => setEmailForm((f) => ({ ...f, currentPassword: e.target.value }))}
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          {emailResult && (
            emailResult.ok
              ? <SuccessBanner msg={emailResult.msg} />
              : <ErrorBanner   msg={emailResult.msg} />
          )}

          <button type="submit" disabled={emailLoading} className="btn-primary">
            {emailLoading ? "Wird gespeichert…" : "E-Mail ändern"}
          </button>
        </form>
      </div>

      {/* ── Passwort ändern ────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base">Passwort ändern</h2>
            <p className="text-xs text-gray-400 mt-0.5">Mindestens 8 Zeichen</p>
          </div>
        </div>

        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label className="form-label">Aktuelles Passwort</label>
            <input
              type="password"
              required
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              className="form-input"
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Neues Passwort</label>
              <input
                type="password"
                required
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="form-input"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="form-label">Passwort bestätigen</label>
              <input
                type="password"
                required
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                className="form-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Passwort-Stärke-Indikator */}
          {pwForm.newPassword && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => {
                  const strength = Math.min(
                    4,
                    (pwForm.newPassword.length >= 8  ? 1 : 0) +
                    (pwForm.newPassword.length >= 12 ? 1 : 0) +
                    (/[A-Z]/.test(pwForm.newPassword) ? 1 : 0) +
                    (/[0-9!@#$%^&*]/.test(pwForm.newPassword) ? 1 : 0),
                  );
                  return (
                    <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                      level <= strength
                        ? strength <= 1 ? "bg-red-400"
                        : strength <= 2 ? "bg-amber-400"
                        : strength <= 3 ? "bg-yellow-400"
                        : "bg-green-500"
                        : "bg-gray-200"
                    }`} />
                  );
                })}
              </div>
              <p className="text-xs text-gray-400">
                {pwForm.newPassword.length < 8 ? "Zu kurz" :
                 /[A-Z]/.test(pwForm.newPassword) && /[0-9!@#$%^&*]/.test(pwForm.newPassword) && pwForm.newPassword.length >= 12 ? "Sehr sicher" :
                 /[A-Z]/.test(pwForm.newPassword) || /[0-9]/.test(pwForm.newPassword) ? "Mittel – Groß-/Kleinschreibung + Zahlen empfohlen" :
                 "Schwach – Füge Zahlen oder Sonderzeichen hinzu"}
              </p>
            </div>
          )}

          {pwResult && (
            pwResult.ok
              ? <SuccessBanner msg={pwResult.msg} />
              : <ErrorBanner   msg={pwResult.msg} />
          )}

          <button type="submit" disabled={pwLoading} className="btn-primary">
            {pwLoading ? "Wird gespeichert…" : "Passwort ändern"}
          </button>
        </form>
      </div>

    </div>
  );
}
