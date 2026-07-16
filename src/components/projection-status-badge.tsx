import clsx from "clsx";
import { labelProjectionStatus } from "@/lib/labels";

const styles: Record<string, string> = {
  ABERTA: "bg-accent-soft text-accent ring-1 ring-accent/25",
  GANHO: "bg-fund-soft text-fund ring-1 ring-fund/25",
  PERDIDO: "bg-critical-soft text-critical ring-1 ring-critical/25",
};

export function ProjectionStatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("badge", styles[status] || "bg-paper text-muted ring-1 ring-line")}>
      {labelProjectionStatus(status)}
    </span>
  );
}
