import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { RoleGuard } from "@/components/RoleGuard";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { QrCode, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Case = Database["public"]["Tables"]["patient_cases"]["Row"];

export const Route = createFileRoute("/patient")({
  component: () => (
    <RoleGuard allow={["patient"]}>
      <PatientDash />
    </RoleGuard>
  ),
});

function PatientDash() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("patient_cases")
        .select("*")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false });
      setCases(data ?? []);
    };
    load();

    const channel = supabase
      .channel("patient-cases")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_cases", filter: `patient_user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My cases</h1>
            <p className="text-sm text-muted-foreground">
              Track your visits and waiting status
            </p>
          </div>
          <Link to="/intake">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New visit
            </Button>
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <QrCode className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">No cases yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit a new intake to join the queue.
            </p>
            <Link to="/intake" className="mt-4 inline-block">
              <Button>Start intake</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {cases.map((c) => (
              <Link
                key={c.id}
                to="/case/$id"
                params={{ id: c.id }}
                className="block rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {c.symptoms.slice(0, 3).join(", ")}
                      {c.symptoms.length > 3 ? `, +${c.symptoms.length - 3}` : ""}
                    </div>
                  </div>
                  <RiskBadge level={c.risk_level} score={c.risk_score} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>Status: <strong className="text-foreground">{c.status.replace("_", " ")}</strong></span>
                  <span>Wait: ~{c.estimated_wait_minutes} min</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}