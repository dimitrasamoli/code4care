import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { RoleGuard } from "@/components/RoleGuard";
import { Boxes, Activity, AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Case = Database["public"]["Tables"]["patient_cases"]["Row"];
type Audit = Database["public"]["Tables"]["audit_chain"]["Row"];

export const Route = createFileRoute("/admin")({
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AdminDash />
    </RoleGuard>
  ),
});

function AdminDash() {
  const [cases, setCases] = useState<Case[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);

  const load = async () => {
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("patient_cases").select("*").order("created_at", { ascending: false }),
      supabase.from("audit_chain").select("*").order("id", { ascending: false }).limit(50),
    ]);
    setCases(c ?? []);
    setAudit(a ?? []);
  };

  useEffect(() => {
    load();
    const ch1 = supabase.channel("admin-cases").on("postgres_changes", { event: "*", schema: "public", table: "patient_cases" }, load).subscribe();
    const ch2 = supabase.channel("admin-audit").on("postgres_changes", { event: "*", schema: "public", table: "audit_chain" }, load).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todays = cases.filter((c) => new Date(c.created_at) >= today);
    const treated = todays.filter((c) => c.status === "treated");
    const highRisk = cases.filter((c) => c.risk_level === "high" && c.status !== "treated");
    const waiting = cases.filter((c) => c.status === "waiting");
    const avgWait = waiting.length
      ? Math.round(waiting.reduce((s, c) => s + c.estimated_wait_minutes, 0) / waiting.length)
      : 0;
    return { total: todays.length, treated: treated.length, highRisk: highRisk.length, queue: waiting.length, avgWait };
  }, [cases]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <h1 className="text-2xl font-bold">Admin Overview</h1>
            <p className="text-sm text-muted-foreground">System activity and audit trail</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Activity} label="Patients today" value={stats.total} />
          <StatCard icon={AlertTriangle} label="High risk active" value={stats.highRisk} tone="high" />
          <StatCard icon={Clock} label="Avg wait (min)" value={stats.avgWait} />
          <StatCard icon={CheckCircle2} label="Treated today" value={stats.treated} tone="low" />
          <StatCard icon={Boxes} label="Current queue" value={stats.queue} />
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Audit chain (latest 50 blocks)</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Every priority assignment and status change creates an immutable hashed
            block. Each block links to the previous one — tampering breaks the chain.
          </p>

          <div className="space-y-2">
            {audit.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                No audit blocks yet
              </div>
            )}
            {audit.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      Block #{a.id}
                    </span>
                    <span className="text-sm font-medium capitalize">{a.action_type.replace("_", " ")}</span>
                    {a.previous_status && (
                      <span className="text-xs text-muted-foreground">
                        {a.previous_status} → <strong>{a.new_status}</strong>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-2 grid gap-1 font-mono text-[10px] text-muted-foreground sm:grid-cols-2">
                  <div>case: <span className="text-foreground">{a.case_id.slice(0, 12)}…</span></div>
                  <div>actor: <span className="text-foreground">{a.actor_role ?? "system"}</span></div>
                  <div>prev: <span className="text-foreground">{a.previous_hash ? a.previous_hash.slice(0, 24) + "…" : "GENESIS"}</span></div>
                  <div>hash: <span className="text-primary">{a.current_hash.slice(0, 24)}…</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "high" | "low";
}) {
  const color =
    tone === "high"
      ? "text-risk-high bg-risk-high-bg"
      : tone === "low"
        ? "text-risk-low bg-risk-low-bg"
        : "text-primary bg-primary/10";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}