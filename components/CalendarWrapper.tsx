"use client";
/**
 * CalendarWrapper – Client Component
 *
 * Dünner Wrapper, der VacationCalendar per dynamic import mit ssr:false lädt.
 * Notwendig, weil `ssr: false` in Next.js nur in Client Components erlaubt ist.
 */
import dynamic from "next/dynamic";

const VacationCalendar = dynamic(
  () => import("@/components/VacationCalendar"),
  {
    ssr:     false,
    loading: () => (
      <div className="h-[540px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center text-gray-400 text-sm">
        Kalender wird geladen…
      </div>
    ),
  },
);

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

export default function CalendarWrapper({ events }: Props) {
  return <VacationCalendar events={events} />;
}
