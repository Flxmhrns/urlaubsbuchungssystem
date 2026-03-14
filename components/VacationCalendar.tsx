"use client";
/**
 * VacationCalendar – react-big-calendar Monatsansicht
 *
 * Zeigt Urlaube der Abteilung in eindeutigen Farben pro Mitarbeiter.
 * Genehmigte Events sind vollständig eingefärbt, ausstehende transparent.
 * Klick auf einen Eintrag öffnet ein Detail-Popover.
 *
 * Wichtig: view + onView + date + onNavigate müssen explizit als
 * kontrollierte Props übergeben werden, damit Woche/Agenda/Navigation
 * korrekt funktionieren.
 */
import { useState, useMemo }                        from "react";
import { Calendar, dateFnsLocalizer, Views }         from "react-big-calendar";
import type { View }                                 from "react-big-calendar";
import { format, parse, startOfWeek, getDay }        from "date-fns";
import { de }                                        from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { VacationStatus }                       from "@/lib/types";

// ── Farben pro Mitarbeiter ────────────────────────────────────
const USER_COLORS = [
  "#2563eb", // blau
  "#dc2626", // rot
  "#9333ea", // lila
  "#ea580c", // orange
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // hellgrün
  "#b45309", // braun
];

function getUserColor(userId: number, sortedUserIds: number[]): string {
  const idx = sortedUserIds.indexOf(userId);
  return USER_COLORS[idx % USER_COLORS.length];
}

// ── date-fns Localizer (Deutsch, Wochenstart Montag) ──────────
const locales = { "de-DE": de };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

// ── Deutsche Beschriftungen ──────────────────────────────────
const messages = {
  allDay:          "Ganztägig",
  previous:        "‹",
  next:            "›",
  today:           "Heute",
  month:           "Monat",
  week:            "Woche",
  day:             "Tag",
  agenda:          "Agenda",
  date:            "Datum",
  time:            "Zeit",
  event:           "Ereignis",
  noEventsInRange: "Keine Urlaube in diesem Zeitraum.",
  showMore:        (total: number) => `+${total} weitere`,
};

// ── Typen ────────────────────────────────────────────────────
interface CalEvent {
  id:     number;
  title:  string;
  start:  Date;
  end:    Date;
  status: VacationStatus;
  userId: number;
}

interface Props {
  events: {
    id:        number;
    title:     string;
    startDate: string;
    endDate:   string;
    status:    string;
    userId:    number;
  }[];
}

// ── Komponente ───────────────────────────────────────────────
export default function VacationCalendar({ events }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  // Kontrollierter State für Ansicht und Datum
  // (notwendig damit Woche/Agenda-Buttons und Navigation funktionieren)
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Sortierte Liste eindeutiger UserIds → deterministische Farbzuweisung
  const sortedUserIds = useMemo(
    () => [...new Set(events.map((e) => e.userId))].sort((a, b) => a - b),
    [events],
  );

  // Mitarbeiter-Legende: userId → { name, color }
  const userLegend = useMemo(
    () =>
      sortedUserIds.map((uid) => ({
        userId: uid,
        name:   events.find((e) => e.userId === uid)?.title ?? String(uid),
        color:  getUserColor(uid, sortedUserIds),
      })),
    [sortedUserIds, events],
  );

  // Events in das react-big-calendar Format konvertieren
  const calEvents: CalEvent[] = useMemo(
    () =>
      events.map((e) => {
        const end = new Date(e.endDate);
        // react-big-calendar behandelt `end` exklusiv → +1 Tag für Ganztagesevents
        end.setDate(end.getDate() + 1);
        return {
          id:     e.id,
          title:  e.title,
          start:  new Date(e.startDate),
          end,
          status: e.status as VacationStatus,
          userId: e.userId,
        };
      }),
    [events],
  );

  // Event-Styling per Mitarbeiter; ausstehende Events leicht transparent
  const eventPropGetter = (event: CalEvent) => {
    const color = getUserColor(event.userId, sortedUserIds);
    return {
      style: {
        backgroundColor: event.status === "PENDING" ? `${color}99` : color,
        borderColor:     color,
        borderRadius:    "4px",
        color:           "#fff",
        fontSize:        "0.75rem",
        padding:         "1px 4px",
        borderLeft:      event.status === "PENDING" ? `3px dashed ${color}` : undefined,
      },
    };
  };

  return (
    <div>
      {/* Legende: ein Eintrag pro Mitarbeiter */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm">
        {userLegend.map(({ userId, name, color }) => (
          <div key={userId} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-600">{name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 border-l pl-4 ml-1">
          <span className="inline-block w-3 h-3 rounded-sm opacity-60 flex-shrink-0 bg-gray-400" />
          <span className="text-gray-400 text-xs">transparent = ausstehend</span>
        </div>
      </div>

      {/* Kalender
          ─ Kein overflow-hidden: würde Klick-Events auf Buttons abschneiden
          ─ Feste Höhe am Container, height:"100%" am Calendar selbst        */}
      <div style={{ height: 600 }}>
        <Calendar<CalEvent>
          localizer={localizer}
          events={calEvents}
          // Kontrollierte Props – Pflicht für funktionale Navigation
          view={currentView}
          onView={(v) => setCurrentView(v)}
          date={currentDate}
          onNavigate={(d) => setCurrentDate(d)}
          views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
          culture="de-DE"
          messages={messages}
          eventPropGetter={eventPropGetter}
          onSelectEvent={(event) => setSelectedEvent(event)}
          popup
          style={{ height: "100%" }}
        />
      </div>

      {/* Detail-Modal bei Klick auf Event */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Farbiger Header-Streifen in Mitarbeiterfarbe */}
            <div
              className="h-2 rounded-t-xl -mx-6 -mt-6 mb-4"
              style={{ backgroundColor: getUserColor(selectedEvent.userId, sortedUserIds) }}
            />
            <h3 className="font-bold text-gray-900 text-lg">{selectedEvent.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedEvent.start.toLocaleDateString("de-DE")}
              {" – "}
              {new Date(selectedEvent.end.getTime() - 86400000).toLocaleDateString("de-DE")}
            </p>
            <div className="mt-3">
              <span className={
                selectedEvent.status === "APPROVED" ? "badge-approved" : "badge-pending"
              }>
                {selectedEvent.status === "APPROVED" ? "Genehmigt" : "Ausstehend"}
              </span>
            </div>
            <button
              className="mt-5 w-full btn-secondary text-sm"
              onClick={() => setSelectedEvent(null)}
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
