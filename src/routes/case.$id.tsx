import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { estimateWaitMinutes } from "@/lib/risk";
import { Activity, Loader2, CheckCircle2, Clock, AlertCircle, Hospital, IdCard, Ambulance } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Case = Database["public"]["Tables"]["patient_cases"]["Row"];

export const Route = createFileRoute("/case/$id")({
  component: CaseView,
});

function CaseView() {
  const { id } = Route.useParams();
  // Prevent the patient from navigating back to the intake form / home from this page.
  useBlocker({
    shouldBlockFn: ({ next }) => !next.pathname.startsWith("/case/"),
    enableBeforeUnload: false,
  });
  const [pcase, setCase] = useState<Case | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [liveWait, setLiveWait] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const recompute = useCallback(async (data: Case) => {
    if (data.status !== "waiting") {
      setPosition(null);
      setLiveWait(null);
      return;
    }
    // Count patients ahead in queue:
    //  1) anyone currently being treated (in_progress) — they finish first
    //  2) waiting patients with strictly higher risk_score
    //  3) waiting patients with the SAME risk_score who arrived earlier (FIFO tiebreak)
    const [{ count: inProgress }, { count: higher }, { count: sameEarlier }] =
      await Promise.all([
        supabase
          .from("patient_cases")
          .select("id", { count: "exact", head: true })
          .eq("status", "in_progress"),
        supabase
          .from("patient_cases")
          .select("id", { count: "exact", head: true })
          .eq("status", "waiting")
          .gt("risk_score", data.risk_score),
        supabase
          .from("patient_cases")
          .select("id", { count: "exact", head: true })
          .eq("status", "waiting")
          .eq("risk_score", data.risk_score)
          .lt("created_at", data.created_at)
          .neq("id", data.id),
      ]);
    const ahead = (inProgress ?? 0) + (higher ?? 0) + (sameEarlier ?? 0);
    const pos = ahead + 1;
    setPosition(pos);
    setLiveWait(estimateWaitMinutes(data.risk_level, ahead));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("patient_cases").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      setCase(data);
      if (data) await recompute(data);
      setLoading(false);
    };
    load();

    // Re-evaluate the queue any time ANY case changes (someone arrives/leaves).
    const channel = supabase
      .channel(`case-watch-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_cases" },
        async () => {
          const { data } = await supabase
            .from("patient_cases")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (data) {
            setCase(data);
            await recompute(data);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, recompute]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pcase) {
    return (
      <div className="min-h-screen bg-background">
        <CaseHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-bold">Δεν βρέθηκε η περίπτωση</h1>
        </div>
      </div>
    );
  }

  const statusInfo = {
    waiting: { icon: Clock, label: "Σε αναμονή", color: "text-risk-medium bg-risk-medium-bg" },
    in_progress: { icon: Loader2, label: "Εξετάζεστε", color: "text-primary bg-primary/10" },
    treated: { icon: CheckCircle2, label: "Ολοκληρώθηκε", color: "text-risk-low bg-risk-low-bg" },
  }[pcase.status];

  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-background">
      <CaseHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elevated)]">
          <div className="text-center">
            <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${statusInfo.color}`}>
              <StatusIcon className={`h-8 w-8 ${pcase.status === "in_progress" ? "animate-spin" : ""}`} />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {pcase.full_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Η περίπτωσή σας έχει καταχωρηθεί
            </p>
          </div>

          {/* Patient ID — prominent */}
          <div className="mt-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <IdCard className="h-4 w-4" /> Patient ID
            </div>
            <div className="mt-2 font-mono text-3xl font-bold tracking-wider text-foreground">
              {pcase.patient_code}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Κρατήστε αυτόν τον αριθμό — είναι μοναδικός για εσάς
            </div>
          </div>

          {pcase.ambulance_arrival && (
            <div className="mt-4 flex items-center justify-center gap-3 rounded-xl border border-risk-high/30 bg-risk-high-bg px-4 py-3 text-risk-high">
              <Ambulance className="h-5 w-5" />
              <div className="text-sm font-bold">
                Διακομιδή με ασθενοφόρο
                {pcase.ambulance_plate && (
                  <span className="ml-2 rounded bg-foreground px-2 py-0.5 font-mono text-background">
                    {pcase.ambulance_plate}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Status" value={statusInfo.label} />
            <Stat
              label="Εκτιμώμενη αναμονή"
              value={
                pcase.status === "treated"
                  ? "—"
                  : `~${liveWait ?? pcase.estimated_wait_minutes} λεπτά`
              }
            />
            <Stat
              label="Θέση στην ουρά"
              value={position && pcase.status === "waiting" ? `#${position}` : "—"}
            />
          </div>

          {pcase.assigned_hospital && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-background p-4">
              <Hospital className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Εφημερεύον Νοσοκομείο
                </div>
                <div className="mt-0.5 text-base font-semibold text-foreground">
                  {pcase.assigned_hospital}
                </div>
              </div>
            </div>
          )}

          <p className="mt-6 rounded-lg bg-accent/40 p-4 text-center text-sm text-muted-foreground">
            Ο χρόνος αναμονής είναι εκτίμηση. Επείγοντα περιστατικά μπορούν να
            αλλάξουν τη σειρά ανά πάσα στιγμή. Το ιατρικό προσωπικό θα σας
            καλέσει όταν είναι έτοιμο.
          </p>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 text-center">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

// Lock-down header for the patient waiting page — no link back to the form.
function CaseHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Activity className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-foreground">Code4Care</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Σελίδα Αναμονής
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}