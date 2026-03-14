/**
 * NextAuth v5 Konfiguration
 *
 * Nutzt den Credentials-Provider (E-Mail + Passwort).
 * Session-Strategie: JWT (Standard für Credentials).
 * Das Passwort wird mit bcrypt geprüft.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const config: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email:    { label: "E-Mail",   type: "email"    },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!passwordValid) return null;

        // Gibt das User-Objekt zurück; wird in den JWT-Callback übernommen.
        return {
          id:           String(user.id),
          name:         user.name,
          email:        user.email,
          role:         user.role,
          departmentId: user.departmentId,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * JWT-Callback: Erweitert das Token um benutzerdefinierte Felder.
     * Wird beim Login und bei jedem Request aufgerufen.
     */
    jwt({ token, user }) {
      if (user) {
        token.id           = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role         = (user as any).role         as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.departmentId = (user as any).departmentId as number | null;
      }
      return token;
    },

    /**
     * Session-Callback: Schreibt Token-Daten in die Session,
     * damit sie im Frontend per `useSession()` / `auth()` verfügbar sind.
     */
    session({ session, token }) {
      session.user.id = token.id as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).role         = token.role         as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).departmentId = token.departmentId as number | null;
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: { strategy: "jwt" },
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
