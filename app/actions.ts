"use server";
/**
 * Globale Server Actions
 */
import { signOut } from "@/auth";

/** Abmelden und zur Login-Seite weiterleiten. */
export async function handleSignOut() {
  await signOut({ redirectTo: "/login" });
}
