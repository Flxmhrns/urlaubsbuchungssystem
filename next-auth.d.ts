/**
 * TypeScript-Erweiterungen für NextAuth v5.
 * Fügt benutzerdefinierte Felder (role, departmentId) zur Session hinzu.
 */
import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role:         string;
    departmentId: number | null;
  }

  interface Session {
    user: {
      id:           string;
      role:         string;
      departmentId: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:           string;
    role:         string;
    departmentId: number | null;
  }
}
