import { riskColorClass, riskLabel } from "@/lib/risk";
import { cn } from "@/lib/utils";

export function RiskBadge({
  level,
  score,
  className,
}: {
  level: "low" | "medium" | "high";
  score?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        riskColorClass(level),
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {riskLabel(level)}
      {typeof score === "number" && <span className="opacity-70">· {score}</span>}
    </span>
  );
}