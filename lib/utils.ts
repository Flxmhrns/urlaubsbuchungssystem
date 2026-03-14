/**
 * Allgemeine Hilfsfunktionen
 */

import type { VacationStatus } from "./types";

// ============================================================
// Datumsformatierung (deutsches Format)
// ============================================================

/**
 * Formatiert ein Datum als "DD.MM.YYYY"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("de-DE", {
    day:   "2-digit",
    month: "2-digit",
    year:  "numeric",
  });
}

/**
 * Formatiert einen Zeitraum als "DD.MM.YYYY – DD.MM.YYYY"
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

// ============================================================
// Arbeitstage berechnen (Mo–Fr, bundesweite Feiertage)
// ============================================================

/**
 * Berechnet das Ostersonntag-Datum für ein Jahr
 * nach dem Anonymen Gregorianischen Algorithmus.
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-basiert
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Gibt alle bundesweiten deutschen Feiertage eines Jahres als Set
 * von ISO-Datumsstrings ("YYYY-MM-DD") zurück.
 *
 * Enthalten: Neujahr, Karfreitag, Ostermontag, Tag der Arbeit,
 * Christi Himmelfahrt, Pfingstmontag, Tag der Deutschen Einheit,
 * 1. und 2. Weihnachtstag.
 *
 * Hinweis: Landesspezifische Feiertage (z. B. Heilige Drei Könige,
 * Fronleichnam, Allerheiligen) sind nicht enthalten.
 */
function getGermanHolidays(year: number): Set<string> {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const easter  = getEasterDate(year);
  const addDays = (base: Date, days: number): Date => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  };

  return new Set([
    // ── Feste Feiertage ───────────────────────────────────
    fmt(new Date(year,  0,  1)),  // Neujahr
    fmt(new Date(year,  4,  1)),  // Tag der Arbeit
    fmt(new Date(year,  9,  3)),  // Tag der Deutschen Einheit
    fmt(new Date(year, 11, 25)),  // 1. Weihnachtstag
    fmt(new Date(year, 11, 26)),  // 2. Weihnachtstag
    // ── Bewegliche Feiertage (Osterbasis) ─────────────────
    fmt(addDays(easter,  -2)),    // Karfreitag
    fmt(addDays(easter,   1)),    // Ostermontag
    fmt(addDays(easter,  39)),    // Christi Himmelfahrt
    fmt(addDays(easter,  50)),    // Pfingstmontag
  ]);
}

/**
 * Berechnet die Anzahl der Arbeitstage (Mo–Fr) zwischen zwei Daten (inklusiv).
 * Bundesweite deutsche Feiertage werden automatisch ausgeschlossen.
 */
export function countWorkingDays(start: Date | string, end: Date | string): number {
  const startDate = new Date(start);
  const endDate   = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (startDate > endDate) return 0;

  // Feiertage für alle betroffenen Kalenderjahre sammeln
  const startYear = startDate.getFullYear();
  const endYear   = endDate.getFullYear();
  const holidays  = new Set<string>();
  for (let y = startYear; y <= endYear; y++) {
    getGermanHolidays(y).forEach((h) => holidays.add(h));
  }

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dow = current.getDay();
    // Kein Wochenende und kein Feiertag → Arbeitstag
    if (dow !== 0 && dow !== 6 && !holidays.has(fmt(current))) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

// ============================================================
// Status-Übersetzung und Styling
// ============================================================

const STATUS_LABELS: Record<VacationStatus, string> = {
  PENDING:  "Ausstehend",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
};

const STATUS_BADGE_CLASS: Record<VacationStatus, string> = {
  PENDING:  "badge-pending",
  APPROVED: "badge-approved",
  REJECTED: "badge-rejected",
};

export function getStatusLabel(status: VacationStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getStatusBadgeClass(status: VacationStatus): string {
  return STATUS_BADGE_CLASS[status] ?? "";
}

// ============================================================
// Kalender-Farben nach Status
// ============================================================

export function getEventColor(status: VacationStatus): string {
  switch (status) {
    case "APPROVED": return "#16a34a"; // grün
    case "PENDING":  return "#d97706"; // amber
    case "REJECTED": return "#dc2626"; // rot
    default:         return "#6b7280"; // grau
  }
}
