/**
 * Zentrale TypeScript-Typdefinitionen für das Urlaubsbuchungssystem
 */

// ============================================================
// Rollen
// ============================================================
export type Role = "EMPLOYEE" | "MANAGER";

// ============================================================
// Status eines Urlaubsantrags
// ============================================================
export type VacationStatus = "PENDING" | "APPROVED" | "REJECTED";

// ============================================================
// Erweiterte User-Session (für NextAuth)
// ============================================================
export interface SessionUser {
  id:           number;
  name:         string;
  email:        string;
  role:         Role;
  departmentId: number | null;
}

// ============================================================
// Urlaubsantrag mit User-Daten (für API-Antworten)
// ============================================================
export interface VacationRequestWithUser {
  id:            number;
  userId:        number;
  startDate:     string;   // ISO-String
  endDate:       string;   // ISO-String
  status:        VacationStatus;
  reason:        string | null;
  rejectionNote: string | null;
  createdAt:     string;   // ISO-String
  user: {
    id:   number;
    name: string;
  };
}

// ============================================================
// Kalender-Event (für react-big-calendar)
// ============================================================
export interface CalendarEvent {
  id:        number;
  title:     string;        // Mitarbeitername
  start:     Date;
  end:       Date;
  status:    VacationStatus;
  userId:    number;
}

// ============================================================
// API-Antwort-Wrapper
// ============================================================
export interface ApiResponse<T> {
  data?:    T;
  error?:   string;
  message?: string;
}
