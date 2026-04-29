import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { RoleGuard } from "@/components/RoleGuard";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { appendAuditBlock } from "@/lib/audit";
import { SYMPTOMS } from "@/lib/risk";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Play, SlidersHorizontal, Stethoscope, Ambulance } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Case = Database["public"]["Tables"]["patient_cases"]["Row"];

export const Route = createFileRoute("/doctor")({
  component: () => (
    <RoleGuard allow={["doctor", "admin"]}>
      <DoctorDash />
    </RoleGuard>
  ),
});

function symptomLabels(ids: string[]) {
  return ids
    .map((id) => SYMPTOMS.find((s) => s.id === id)?.label ?? id)
    .join(", ");
}

function DoctorDash() {
  const { user, role } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [overrideCase, setOverrideCase] = useState<Case | null>(null);
  const [overrideScore, setOverrideScore] = useState<string>("");

  const load = async () => {
    const { data } = await supabase
      .from("patient_cases")
      .select("*")
      .in("status", ["waiting", "in_progress"])
      .order("ambulance_arrival", { ascending: false })
      .order("risk_score", { ascending: false })
      .order("created_at", { ascending: true });
    setCases(data ?? []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("doctor-cases")
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_cases" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (
    c: Case,
    next: "in_progress" | "treated",
  ) => {
    const { error } = await supabase
      .from("patient_cases")
      .update({ status: next })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await appendAuditBlock({
      caseId: c.id,
      actionType: "status_change",
      previousStatus: c.status,
      newStatus: next,
      riskScore: c.risk_score,
      actorId: user?.id ?? null,
      actorRole: role ?? null,
    });
    toast.success(`Case marked as ${next.replace("_", " ")}`);
  };

  const applyOverride = async () => {
    if (!overrideCase) return;
    const score = Math.max(0, Math.min(100, parseInt(overrideScore, 10)));
    if (isNaN(score)) {
      toast.error("Enter a number 0–100");
      return;
    }
    const level = score <= 30 ? "low" : score <= 70 ? "medium" : "high";
    const { error } = await supabase
      .from("patient_cases")
      .update({ risk_score: score, risk_level: level })
      .eq("id", overrideCase.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await appendAuditBlock({
      caseId: overrideCase.id,
      actionType: "priority_override",
      previousStatus: overrideCase.status,
      newStatus: overrideCase.status,
      riskScore: score,
      actorId: user?.id ?? null,
      actorRole: role ?? null,
      metadata: { previous_score: overrideCase.risk_score, new_level: level },
    });
    setOverrideCase(null);
    setOverrideScore("");
    toast.success("Priority overridden — recorded in audit chain");
  };

  const highRisk = useMemo(() => cases.filter((c) => c.risk_level === "high"), [cases]);
  const ambulances = useMemo(() => cases.filter((c) => c.ambulance_arrival && c.status === "waiting"), [cases]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Doctor Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Real-time prioritized queue · {cases.length} active cases
            </p>
          </div>
        </div>

        {ambulances.length > 0 && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-risk-high/40 bg-risk-high-bg px-4 py-3 text-risk-high animate-pulse">
            <Ambulance className="h-5 w-5" />
            <p className="text-sm font-bold">
              🚑 {ambulances.length} incoming ambulance{ambulances.length > 1 ? "s" : ""} — top priority
            </p>
          </div>
        )}
        {highRisk.length > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-risk-high/30 bg-risk-high-bg px-4 py-3 text-risk-high">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-semibold">
              {highRisk.length} high-risk patient{highRisk.length > 1 ? "s" : ""} awaiting review
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Symptoms</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No active cases</td></tr>
              )}
              {cases.map((c) => (
                <tr key={c.id} className={`border-b border-border last:border-b-0 hover:bg-muted/30 ${c.ambulance_arrival ? "bg-risk-high-bg/30" : ""}`}>
                  <td className="px-4 py-4"><RiskBadge level={c.risk_level} score={c.risk_score} /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      {c.ambulance_arrival && <Ambulance className="h-4 w-4 text-risk-high" />}
                      {c.full_name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono font-bold text-primary">{c.patient_code}</span>
                      <span>· Age {c.age}{c.chronic_condition ? " · chronic" : ""}</span>
                      {c.ambulance_plate && (
                        <span className="rounded border border-foreground bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-bold text-background">
                          {c.ambulance_plate}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground">
                    <div className="max-w-xs truncate">{symptomLabels(c.symptoms)}</div>
                    {c.description && <div className="max-w-xs truncate text-xs text-muted-foreground">{c.description}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium capitalize">
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      {c.status === "waiting" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(c, "in_progress")}>
                          <Play className="mr-1 h-3 w-3" /> Start
                        </Button>
                      )}
                      {c.status !== "treated" && (
                        <Button size="sm" onClick={() => updateStatus(c, "treated")}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Treated
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setOverrideCase(c);
                          setOverrideScore(String(c.risk_score));
                        }}
                      >
                        <SlidersHorizontal className="mr-1 h-3 w-3" /> Override
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Risk scoring supports your decision — final priority is always at your
          discretion. All overrides are recorded in the audit chain.
        </p>
      </main>

      <Dialog open={!!overrideCase} onOpenChange={(open) => !open && setOverrideCase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override priority — {overrideCase?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Current AI suggestion: <strong>{overrideCase?.risk_score}</strong> ({overrideCase?.risk_level})
            </p>
            <div className="space-y-2">
              <Label htmlFor="score">New risk score (0–100)</Label>
              <Input
                id="score"
                type="number"
                min={0}
                max={100}
                value={overrideScore}
                onChange={(e) => setOverrideScore(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This change will be permanently recorded in the audit chain.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOverrideCase(null)}>Cancel</Button>
            <Button onClick={applyOverride}>Confirm override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}