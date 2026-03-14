/**
 * Next.js Middleware – Zugriffsschutz für alle Routen.
 *
 * Regeln:
 *  1. Nicht eingeloggt + geschützte Route  → Weiterleitung zu /login
 *  2. Eingeloggt + /login                  → Weiterleitung zu /dashboard
 *  3. Nicht-MANAGER + /manager/*           → Weiterleitung zu /dashboard
 *  4. Nicht-ADMIN   + /admin/*             → Weiterleitung zu /dashboard
 */
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: ReturnType<typeof auth> extends Promise<infer T> ? T : never }) => {
  const { nextUrl }   = req;
  const session       = req.auth;
  const isLoggedIn    = !!session?.user;
  const pathname      = nextUrl.pathname;
  const role          = (session as any)?.user?.role as string | undefined;

  // Öffentliche Pfade (kein Auth erforderlich)
  const isPublicPath  = pathname.startsWith("/login");

  // Nicht eingeloggt → zum Login
  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Bereits eingeloggt und auf /login → zum Dashboard
  if (isLoggedIn && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // /manager/*: nur MANAGER
  if (pathname.startsWith("/manager") && role !== "MANAGER") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // /admin/*: nur ADMIN
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Alle Routen außer Next.js-Internas und statische Dateien schützen
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
