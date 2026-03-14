"use client";
/**
 * Navbar – Haupt-Navigation
 * Client Component (benötigt handleSignOut Server Action über form).
 */
import Link             from "next/link";
import { usePathname }  from "next/navigation";
import { handleSignOut } from "@/app/actions";
import { useState }     from "react";

interface NavbarProps {
  user: {
    name?:         string | null;
    email?:        string | null;
    role?:         string;
    departmentId?: number | null;
  };
}

interface NavLink {
  href:  string;
  label: string;
}

const EMPLOYEE_LINKS: NavLink[] = [
  { href: "/dashboard",   label: "Dashboard"      },
  { href: "/my-requests", label: "Meine Anträge"  },
  { href: "/new-request", label: "Neuer Antrag"   },
];

const MANAGER_LINKS: NavLink[] = [
  { href: "/dashboard",          label: "Dashboard"     },
  { href: "/manager/approvals",  label: "Genehmigungen" },
  { href: "/manager/calendar",   label: "Kalender"      },
  { href: "/manager/team",       label: "Team"          },
];

const ADMIN_LINKS: NavLink[] = [
  { href: "/dashboard",        label: "Übersicht"   },
  { href: "/admin/hierarchy",  label: "Hierarchie"  },
];

export default function Navbar({ user }: NavbarProps) {
  const pathname        = usePathname();
  const isManager       = user.role === "MANAGER";
  const isAdmin         = user.role === "ADMIN";
  const links           = isAdmin ? ADMIN_LINKS : isManager ? MANAGER_LINKS : EMPLOYEE_LINKS;
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-primary-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo + Links (Desktop) */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 text-white font-bold text-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Urlaubssystem</span>
            </Link>

            {/* Desktop-Links */}
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-primary-900 text-white"
                      : "text-primary-100 hover:bg-primary-600 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Rechter Bereich: Nutzerinfo + Logout */}
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="hidden sm:flex flex-col items-end group"
              title="Profil bearbeiten"
            >
              <span className="text-white text-sm font-medium leading-none group-hover:underline">
                {user.name}
              </span>
              <span className={`text-xs mt-0.5 px-1.5 py-0.5 rounded font-medium ${
                isAdmin
                  ? "bg-purple-400 text-purple-900"
                  : isManager
                  ? "bg-amber-400 text-amber-900"
                  : "bg-primary-500 text-primary-100"
              }`}>
                {isAdmin ? "Administrator" : isManager ? "Abteilungsleiter" : "Mitarbeiter"}
              </span>
            </Link>

            {/* Logout-Button (Server Action via form) */}
            <form action={handleSignOut}>
              <button
                type="submit"
                title="Abmelden"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-primary-100
                           hover:bg-primary-600 hover:text-white text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Abmelden</span>
              </button>
            </form>

            {/* Mobile-Menü-Button */}
            <button
              className="md:hidden text-primary-100 hover:text-white p-1.5"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menü öffnen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-Menü */}
      {mobileOpen && (
        <div className="md:hidden border-t border-primary-600 bg-primary-800 px-4 pb-3 pt-2 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                isActive(link.href)
                  ? "bg-primary-900 text-white"
                  : "text-primary-100 hover:bg-primary-600"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-primary-600">
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-primary-600 transition-colors"
            >
              <svg className="w-4 h-4 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-primary-100">{user.name}</p>
                <p className="text-xs text-primary-400">{user.email} · Profil bearbeiten</p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
