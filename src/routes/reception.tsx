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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { calculateRiskScore, estimateWaitMinutes, generateGreekPlate, getOnCallHospital, SYMPTOMS } from "@/lib/risk";
import { appendAuditBlock } from "@/lib/audit";
import { toast } from "sonner";
import { Plus, Search, Users, Ambulance } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Case = Database["public"]["Tables"]["patient_cases"]["Row"];

export const Route = createFileRoute("/reception")({
  component: () => (
    <RoleGuard allow={["reception", "admin"]}>
      <ReceptionDash />
    </RoleGuard>
  ),
});

function ReceptionDash() {
  const { user, role } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  // new patient form
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [chronic, setChronic] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("patient_cases")
      .select("*")
      // Treated cases go to the bottom; active (waiting/in_progress) on top.
      .order("status", { ascending: true })
      .order("ambulance_arrival", { ascending: false })
      .order("risk_score", { ascending: false })
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    rows.sort((a, b) => {
      const at = a.status === "treated" ? 1 : 0;
      const bt = b.status === "treated" ? 1 : 0;
      return at - bt;
    });
    setCases(rows);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("reception-cases")
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_cases" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [cases, search]);


  const submitNew = async () => {
    const ageNum = parseInt(age, 10);
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 3) {
      toast.error("Συμπληρώστε πλήρες ονοματεπώνυμο");
      return;
    }
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      toast.error("Η ηλικία πρέπει να είναι μεταξύ 0 και 120");
      return;
    }
    if (symptoms.length === 0) {
      toast.error("Επιλέξτε τουλάχιστον ένα σύμπτωμα");
      return;
    }
    const { score, level } = calculateRiskScore({ age: ageNum, symptoms, chronicCondition: chronic });
    const { count } = await supabase.from("patient_cases").select("id", { count: "exact", head: true }).eq("status", "waiting");
    const wait = estimateWaitMinutes(level, count ?? 0);

    const { data, error } = await supabase
      .from("patient_cases")
      .insert([{
        full_name: trimmed,
        age: ageNum,
        symptoms,
        chronic_condition: chronic,
        risk_score: score,
        risk_level: level,
        status: "waiting",
        estimated_wait_minutes: wait,
        assigned_hospital: getOnCallHospital(),
      }])
      .select("id, patient_code")
      .single();

    if (error || !data) {
      toast.error(error?.message ?? "Failed");
      return;
    }
    await appendAuditBlock({
      caseId: data.id,
      actionType: "case_created",
      previousStatus: null,
      newStatus: "waiting",
      riskScore: score,
      actorId: user?.id ?? null,
      actorRole: role ?? null,
      metadata: { via: "reception", patient_code: data.patient_code },
    });

    setShowNew(false);
    setName(""); setAge(""); setSymptoms([]); setChronic(false);
    toast.success(`Καταχωρήθηκε — Patient ID: ${data.patient_code}`);
  };

  const ambulanceArrival = async () => {
    const plate = generateGreekPlate();
    const { data, error } = await supabase
      .from("patient_cases")
      .insert([{
        full_name: `🚑 Διακομιδή ${plate}`,
        age: 0,
        symptoms: ["unconscious"],
        description: `Διακομιδή με ασθενοφόρο πινακίδας ${plate} — στοιχεία ασθενούς εκκρεμούν. Προ-σήμανση κορυφαίας προτεραιότητας.`,
        chronic_condition: false,
        risk_score: 100,
        risk_level: "high",
        status: "waiting",
        estimated_wait_minutes: 0,
        ambulance_arrival: true,
        ambulance_plate: plate,
        assigned_hospital: getOnCallHospital(),
      }])
      .select("id, patient_code")
      .single();

    if (error || !data) {
      toast.error(error?.message ?? "Failed to register ambulance");
      return;
    }
    await appendAuditBlock({
      caseId: data.id,
      actionType: "ambulance_arrival",
      previousStatus: null,
      newStatus: "waiting",
      riskScore: 100,
      actorId: user?.id ?? null,
      actorRole: role ?? null,
      metadata: { source: "ambulance", auto_priority: true, plate, patient_code: data.patient_code },
    });
    toast.success(`🚑 Ασθενοφόρο ${plate} καταχωρήθηκε — κορυφή ουράς`);
  };

  const updateStatus = async (c: Case, next: Case["status"]) => {
    const { error } = await supabase.from("patient_cases").update({ status: next }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    await appendAuditBlock({
      caseId: c.id,
      actionType: "status_change",
      previousStatus: c.status,
      newStatus: next,
      riskScore: c.risk_score,
      actorId: user?.id ?? null,
      actorRole: role ?? null,
    });
  };

  const toggleSymptom = (id: string) => {
    setSymptoms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Reception</h1>
              <p className="text-sm text-muted-foreground">{cases.length} total cases today</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={ambulanceArrival}
              className="font-semibold"
            >
              <Ambulance className="mr-2 h-4 w-4" /> Ambulance arrival
            </Button>
            <Button onClick={() => setShowNew(true)}>
              <Plus className="mr-2 h-4 w-4" /> Register patient
            </Button>
          </div>
        </div>

        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or case ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No matches</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className={`border-b border-border last:border-b-0 ${c.ambulance_arrival ? "bg-risk-high-bg/40" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{c.patient_code}</td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {c.ambulance_arrival && <Ambulance className="h-4 w-4 text-risk-high" />}
                      <div>
                        <div>{c.full_name}</div>
                        {c.ambulance_plate && (
                          <span className="mt-1 inline-block rounded border border-foreground bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-bold text-background">
                            {c.ambulance_plate}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{c.age}</td>
                  <td className="px-4 py-3"><RiskBadge level={c.risk_level} score={c.risk_score} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-sm capitalize">{c.status.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {c.status !== "waiting" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(c, "waiting")}>Waiting</Button>
                      )}
                      {c.status !== "in_progress" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(c, "in_progress")}>In progress</Button>
                      )}
                      {c.status !== "treated" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(c, "treated")}>Treated</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* New patient dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register new patient</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rn">Name</Label>
                <Input id="rn" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ra">Age</Label>
                <Input id="ra" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Symptoms</Label>
              <div className="grid grid-cols-2 gap-2">
                {SYMPTOMS.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <Checkbox checked={symptoms.includes(s.id)} onCheckedChange={() => toggleSymptom(s.id)} />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={chronic} onCheckedChange={(v) => setChronic(Boolean(v))} />
              <span>Has chronic condition</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={submitNew}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
