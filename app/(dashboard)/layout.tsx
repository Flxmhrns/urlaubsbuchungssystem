/**
 * Dashboard-Layout (Server Component)
 *
 * Schützt alle /dashboard, /my-requests, /new-request, /manager/* Routen.
 * Authentifizierungsprüfung hier + in der Middleware (doppelte Absicherung).
 */
import { auth }     from "@/auth";
import { redirect } from "next/navigation";
import Navbar       from "@/components/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Kein aktiver Session → zur Login-Seite
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        user={{
          name:         session.user.name,
          email:        session.user.email,
          role:         (session.user as any).role,
          departmentId: (session.user as any).departmentId,
        }}
      />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
