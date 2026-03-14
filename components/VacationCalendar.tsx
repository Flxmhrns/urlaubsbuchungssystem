"use client";
/**
 * VacationCalendar – react-big-calendar Monatsansicht
 *
 * Zeigt genehmigte (grün) und ausstehende (amber) Urlaube
 * der Abteilung. Klick auf einen Eintrag öffnet ein Detail-Popover.
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
import { getEventColor }                             from "@/lib/utils";
import type { VacationStatus }                       from "@/lib/types";

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

  // Event-Styling per Status
  const eventPropGetter = (event: CalEvent) => ({
    style: {
      backgroundColor: getEventColor(event.status),
      borderColor:     getEventColor(event.status),
      borderRadius:    "4px",
      color:           "#fff",
      fontSize:        "0.75rem",
      padding:         "1px 4px",
    },
  });

  return (
    <div>
      {/* Legende */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#16a34a" }} />
          <span className="text-gray-600">Genehmigt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#d97706" }} />
          <span className="text-gray-600">Ausstehend</span>
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
            {/* Farbiger Header-Streifen */}
            <div
              className="h-2 rounded-t-xl -mx-6 -mt-6 mb-4"
              style={{ backgroundColor: getEventColor(selectedEvent.status) }}
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
