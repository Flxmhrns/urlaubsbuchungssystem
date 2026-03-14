"use client";
/**
 * Login-Seite
 * Client Component – verwaltet Formular-State und ruft NextAuth signIn auf.
 */
import { useState, FormEvent } from "react";
import { signIn }              from "next-auth/react";
import { useRouter }           from "next/navigation";

export default function LoginPage() {
  const router   = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Ungültige E-Mail-Adresse oder falsches Passwort.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 px-4">
      <div className="w-full max-w-md">

        {/* Kopfbereich */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
            {/* Kalender-Icon */}
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Urlaubssystem</h1>
          <p className="text-primary-200 mt-1 text-sm">Bitte melde dich an</p>
        </div>

        {/* Formular-Karte */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} noValidate>

            {/* Fehlermeldung */}
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* E-Mail */}
            <div className="mb-4">
              <label htmlFor="email" className="form-label">E-Mail-Adresse</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="name@firma.de"
                disabled={loading}
              />
            </div>

            {/* Passwort */}
            <div className="mb-6">
              <label htmlFor="password" className="form-label">Passwort</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Anmelden…
                </>
              ) : (
                "Anmelden"
              )}
            </button>
          </form>

          {/* Hinweis Testnutzer */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center font-medium mb-2">Test-Zugangsdaten</p>
            <div className="grid grid-cols-1 gap-1 text-xs text-gray-500">
              <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
                <span className="font-medium">Manager (Engineering)</span>
                <span>k.weber@firma.de</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
                <span className="font-medium">Manager (Marketing)</span>
                <span>s.mueller@firma.de</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
                <span className="font-medium">Mitarbeiter</span>
                <span>a.schmidt@firma.de</span>
              </div>
              <p className="text-center mt-1 text-gray-400">Passwort: <code className="font-mono">password123</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
