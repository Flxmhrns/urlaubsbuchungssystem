/**
 * StatusBadge – zeigt den Status eines Urlaubsantrags farblich an.
 */
import type { VacationStatus } from "@/lib/types";
import { getStatusLabel, getStatusBadgeClass } from "@/lib/utils";

interface StatusBadgeProps {
  status: VacationStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={getStatusBadgeClass(status)}>
      {getStatusLabel(status)}
    </span>
  );
}
