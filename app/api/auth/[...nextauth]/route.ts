/**
 * NextAuth Route Handler
 * Delegiert alle /api/auth/* Anfragen an NextAuth.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
