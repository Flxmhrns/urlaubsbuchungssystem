/**
 * PATCH /api/profile
 *
 * Erlaubt dem eingeloggten Nutzer, seine eigene E-Mail und/oder sein
 * Passwort zu ändern. Das aktuelle Passwort ist immer erforderlich.
 */
import { NextResponse } from "next/server";
import { auth }         from "@/auth";
import { prisma }       from "@/lib/prisma";
import bcrypt           from "bcryptjs";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body   = await req.json();
  const { currentPassword, newEmail, newPassword } = body;

  if (!currentPassword) {
    return NextResponse.json({ error: "Aktuelles Passwort ist erforderlich." }, { status: 400 });
  }
  if (!newEmail && !newPassword) {
    return NextResponse.json({ error: "Keine Änderungen angegeben." }, { status: 400 });
  }

  // Nutzer mit Passwort-Hash laden
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
  }

  // Aktuelles Passwort prüfen
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Das aktuelle Passwort ist falsch." }, { status: 403 });
  }

  const data: Record<string, unknown> = {};

  // Neue E-Mail validieren
  if (newEmail) {
    const trimmed = newEmail.trim().toLowerCase();
    if (trimmed === user.email) {
      return NextResponse.json({ error: "Das ist bereits deine aktuelle E-Mail-Adresse." }, { status: 400 });
    }
    const exists = await prisma.user.findUnique({ where: { email: trimmed } });
    if (exists) {
      return NextResponse.json({ error: "Diese E-Mail-Adresse wird bereits verwendet." }, { status: 409 });
    }
    data.email = trimmed;
  }

  // Neues Passwort hashen
  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Das neue Passwort muss mindestens 8 Zeichen lang sein." }, { status: 400 });
    }
    data.password = await bcrypt.hash(newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ data: updated });
}
