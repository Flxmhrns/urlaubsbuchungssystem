/**
 * Prisma Seed-Skript – Urlaubsbuchungssystem
 *
 * Erstellt folgende Testdaten:
 *   • 2 Abteilungen:  Engineering, Marketing
 *   • 2 Manager:      Klaus Weber (Engineering), Sandra Müller (Marketing)
 *   • 4 Mitarbeiter:  2 je Abteilung
 *   • Diverse Urlaubsanträge in verschiedenen Status
 *
 * Ausführen: npm run db:seed
 * Alle Passwörter im Klartext zum Testen: "password123"
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================
// Hilfsfunktion: Berechnet Arbeitstage (Mo–Fr) zwischen zwei Daten
// ============================================================
function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

async function main() {
  console.log("🌱 Starte Datenbankbefüllung...");

  // ----------------------------------------------------------
  // 1. Alle bestehenden Daten löschen (Reihenfolge beachten!)
  // ----------------------------------------------------------
  await prisma.vacationRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  console.log("🗑️  Bestehende Daten gelöscht.");

  // ----------------------------------------------------------
  // 2. Passwort-Hash für alle Testnutzer (Klartext: "password123")
  // ----------------------------------------------------------
  const passwordHash = await bcrypt.hash("password123", 12);

  // ----------------------------------------------------------
  // 3. Admin-Account anlegen
  // ----------------------------------------------------------
  await prisma.user.create({
    data: {
      name:     "Administrator",
      email:    "admin@firma.de",
      password: passwordHash,
      role:     "ADMIN",
    },
  });
  console.log("🔐 Admin-Account erstellt.");

  // ----------------------------------------------------------
  // 4. Abteilungen anlegen (ohne managerId — wird nach den
  //    Usern gesetzt, um Zirkelabhängigkeit zu vermeiden)
  // ----------------------------------------------------------
  const deptEngineering = await prisma.department.create({
    data: { name: "Engineering" },
  });
  const deptMarketing = await prisma.department.create({
    data: { name: "Marketing" },
  });
  console.log("🏢 Abteilungen erstellt.");

  // ----------------------------------------------------------
  // 4. Manager anlegen
  // ----------------------------------------------------------
  const managerKlaus = await prisma.user.create({
    data: {
      name: "Klaus Weber",
      email: "k.weber@firma.de",
      password: passwordHash,
      role: "MANAGER",
      departmentId: deptEngineering.id,
      vacationDaysTotal: 30,
      vacationDaysUsed: 5,
    },
  });

  const managerSandra = await prisma.user.create({
    data: {
      name: "Sandra Müller",
      email: "s.mueller@firma.de",
      password: passwordHash,
      role: "MANAGER",
      departmentId: deptMarketing.id,
      vacationDaysTotal: 30,
      vacationDaysUsed: 3,
    },
  });
  console.log("👔 Manager erstellt.");

  // ----------------------------------------------------------
  // 5. managerId in Abteilungen setzen
  // ----------------------------------------------------------
  await prisma.department.update({
    where: { id: deptEngineering.id },
    data: { managerId: managerKlaus.id },
  });
  await prisma.department.update({
    where: { id: deptMarketing.id },
    data: { managerId: managerSandra.id },
  });
  console.log("🔗 Abteilungsleiter verknüpft.");

  // ----------------------------------------------------------
  // 6. Mitarbeiter anlegen (je 2 pro Abteilung)
  // ----------------------------------------------------------
  const empAnna = await prisma.user.create({
    data: {
      name: "Anna Schmidt",
      email: "a.schmidt@firma.de",
      password: passwordHash,
      role: "EMPLOYEE",
      departmentId: deptEngineering.id,
      vacationDaysTotal: 28,
      vacationDaysUsed: 10,
    },
  });

  const empTom = await prisma.user.create({
    data: {
      name: "Tom Berger",
      email: "t.berger@firma.de",
      password: passwordHash,
      role: "EMPLOYEE",
      departmentId: deptEngineering.id,
      vacationDaysTotal: 28,
      vacationDaysUsed: 7,
    },
  });

  const empLaura = await prisma.user.create({
    data: {
      name: "Laura Fischer",
      email: "l.fischer@firma.de",
      password: passwordHash,
      role: "EMPLOYEE",
      departmentId: deptMarketing.id,
      vacationDaysTotal: 25,
      vacationDaysUsed: 8,
    },
  });

  const empMax = await prisma.user.create({
    data: {
      name: "Max Hoffmann",
      email: "m.hoffmann@firma.de",
      password: passwordHash,
      role: "EMPLOYEE",
      departmentId: deptMarketing.id,
      vacationDaysTotal: 25,
      vacationDaysUsed: 2,
    },
  });
  console.log("👥 Mitarbeiter erstellt.");

  // ----------------------------------------------------------
  // 7. Urlaubsanträge anlegen
  // ----------------------------------------------------------
  const today = new Date();
  const year = today.getFullYear();

  // Helper: Datum relativ zu heute
  const daysFromNow = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Anna Schmidt – GENEHMIGT (vergangener Urlaub, bereits in vacationDaysUsed enthalten)
  await prisma.vacationRequest.create({
    data: {
      userId: empAnna.id,
      startDate: new Date(`${year}-01-13`),
      endDate:   new Date(`${year}-01-17`),
      status:    "APPROVED",
      reason:    "Familienurlaub",
    },
  });
  await prisma.vacationRequest.create({
    data: {
      userId: empAnna.id,
      startDate: new Date(`${year}-03-10`),
      endDate:   new Date(`${year}-03-14`),
      status:    "APPROVED",
      reason:    "Erholung",
    },
  });

  // Anna Schmidt – AUSSTEHEND (zukünftig)
  await prisma.vacationRequest.create({
    data: {
      userId: empAnna.id,
      startDate: daysFromNow(14),
      endDate:   daysFromNow(18),
      status:    "PENDING",
      reason:    "Sommerurlaub",
    },
  });

  // Tom Berger – GENEHMIGT
  await prisma.vacationRequest.create({
    data: {
      userId: empTom.id,
      startDate: new Date(`${year}-02-03`),
      endDate:   new Date(`${year}-02-07`),
      status:    "APPROVED",
      reason:    "Skifahren",
    },
  });
  await prisma.vacationRequest.create({
    data: {
      userId: empTom.id,
      startDate: new Date(`${year}-04-14`),
      endDate:   new Date(`${year}-04-17`),
      status:    "APPROVED",
      reason:    "Kurzurlaub",
    },
  });

  // Tom Berger – AUSSTEHEND
  await prisma.vacationRequest.create({
    data: {
      userId: empTom.id,
      startDate: daysFromNow(20),
      endDate:   daysFromNow(24),
      status:    "PENDING",
      reason:    "Reise nach Portugal",
    },
  });

  // Tom Berger – ABGELEHNT
  await prisma.vacationRequest.create({
    data: {
      userId: empTom.id,
      startDate: daysFromNow(5),
      endDate:   daysFromNow(9),
      status:    "REJECTED",
      reason:    "Spontanurlaub",
      rejectionNote: "Zu viele Kollegen gleichzeitig abwesend.",
    },
  });

  // Laura Fischer – GENEHMIGT
  await prisma.vacationRequest.create({
    data: {
      userId: empLaura.id,
      startDate: new Date(`${year}-01-27`),
      endDate:   new Date(`${year}-01-31`),
      status:    "APPROVED",
      reason:    "Familienbesuch",
    },
  });
  await prisma.vacationRequest.create({
    data: {
      userId: empLaura.id,
      startDate: new Date(`${year}-03-24`),
      endDate:   new Date(`${year}-03-28`),
      status:    "APPROVED",
    },
  });

  // Laura Fischer – AUSSTEHEND (aktuell)
  await prisma.vacationRequest.create({
    data: {
      userId: empLaura.id,
      startDate: daysFromNow(7),
      endDate:   daysFromNow(11),
      status:    "PENDING",
      reason:    "Urlaub im Sommer",
    },
  });

  // Max Hoffmann – GENEHMIGT
  await prisma.vacationRequest.create({
    data: {
      userId: empMax.id,
      startDate: new Date(`${year}-02-17`),
      endDate:   new Date(`${year}-02-18`),
      status:    "APPROVED",
      reason:    "Brückentag",
    },
  });

  // Max Hoffmann – AUSSTEHEND (weit in der Zukunft)
  await prisma.vacationRequest.create({
    data: {
      userId: empMax.id,
      startDate: daysFromNow(30),
      endDate:   daysFromNow(40),
      status:    "PENDING",
      reason:    "Großer Sommerurlaub",
    },
  });

  // Manager Klaus Weber – GENEHMIGT (vergangen)
  await prisma.vacationRequest.create({
    data: {
      userId: managerKlaus.id,
      startDate: new Date(`${year}-01-02`),
      endDate:   new Date(`${year}-01-06`),
      status:    "APPROVED",
    },
  });

  console.log("📅 Urlaubsanträge erstellt.");

  // ----------------------------------------------------------
  // 8. Zusammenfassung ausgeben
  // ----------------------------------------------------------
  const userCount = await prisma.user.count();
  const deptCount = await prisma.department.count();
  const reqCount  = await prisma.vacationRequest.count();

  console.log("\n✅ Seed erfolgreich abgeschlossen!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   👤 Benutzer:        ${userCount}`);
  console.log(`   🏢 Abteilungen:     ${deptCount}`);
  console.log(`   📋 Urlaubsanträge:  ${reqCount}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🔑 Test-Zugangsdaten (alle Passwörter: 'password123'):");
  console.log("   ADMIN:       admin@firma.de");
  console.log("   MANAGER:     k.weber@firma.de    (Engineering)");
  console.log("                s.mueller@firma.de  (Marketing)");
  console.log("   MITARBEITER: a.schmidt@firma.de  (Engineering)");
  console.log("                t.berger@firma.de   (Engineering)");
  console.log("                l.fischer@firma.de  (Marketing)");
  console.log("                m.hoffmann@firma.de (Marketing)");
}

main()
  .catch((e) => {
    console.error("❌ Fehler beim Seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
