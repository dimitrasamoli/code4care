import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  calculateRiskScore,
  estimateWaitMinutes,
  fetchOnCallHospital,
  SYMPTOMS,
} from "@/lib/risk";
import { appendAuditBlock } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { useLang, T, type Lang } from "@/lib/i18n";

// Map a symptom id from src/lib/risk.ts to the i18n key used for its label.
const SYMPTOM_LABEL_KEY: Record<string, keyof typeof T> = {
  chest_pain: "sym_chest_pain",
  fever: "sym_fever",
  breathing: "sym_breathing",
  dizziness: "sym_dizziness",
  bleeding: "sym_bleeding",
  headache: "sym_headache",
  abdominal: "sym_abdominal",
  severe_pain: "sym_severe_pain",
  other: "sym_other",
};

const t = (k: keyof typeof T, lang: Lang) => T[k][lang];

export function IntakeForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lang] = useLang();
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [amka, setAmka] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [chronic, setChronic] = useState(false);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleSymptom = (id: string) => {
    setSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    if (trimmedName.length < 3 || !trimmedName.includes(" ")) {
      toast.error(t("errName", lang));
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      toast.error(t("errAge", lang));
      return;
    }
    if (!/^\d{11}$/.test(amka)) {
      toast.error(t("errAmka", lang));
      return;
    }
    if (symptoms.length === 0) {
      toast.error(t("errSymptoms", lang));
      return;
    }

    setBusy(true);
    const { score, level } = calculateRiskScore({
      age: ageNum,
      symptoms,
      chronicCondition: chronic,
    });

    const hospital = await fetchOnCallHospital();
    const { count } = await supabase
      .from("patient_cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "waiting");
    const wait = estimateWaitMinutes(level, count ?? 0);

    const insertPayload: Record<string, unknown> = {
      full_name: trimmedName,
      age: ageNum,
      symptoms,
      // NOTE: AMKA is prepended to the description because patient_cases has no
      // dedicated `amka` column yet. When a DB migration adds one, replace this
      // with `amka: amka` and drop the prefix.
      description: `ΑΜΚΑ: ${amka}${description.trim() ? ` — ${description.trim()}` : ""}`,
      chronic_condition: chronic,
      risk_score: score,
      risk_level: level,
      status: "waiting",
      estimated_wait_minutes: wait,
      assigned_hospital: hospital,
    };
    // Only attach patient_user_id when there is a real authenticated session,
    // otherwise the anonymous RLS policy (which requires it to be NULL) blocks the insert.
    if (user?.id) insertPayload.patient_user_id = user.id;

    const { data, error } = await supabase
      .from("patient_cases")
      // @ts-expect-error dynamic insert payload
      .insert([insertPayload])
      .select("id, patient_code")
      .single();

    if (error || !data) {
      setBusy(false);
      toast.error(error?.message ?? "Δεν ήταν δυνατή η υποβολή");
      return;
    }

    await appendAuditBlock({
      caseId: data.id,
      actionType: "case_created",
      previousStatus: null,
      newStatus: "waiting",
      riskScore: score,
      actorId: user?.id ?? null,
      actorRole: user ? "patient" : "anonymous",
      metadata: { symptoms, level, patient_code: data.patient_code, amka },
    });

    setBusy(false);
    toast.success(`${t("okSubmit", lang)} ${data.patient_code}`);
    navigate({ to: "/case/$id", params: { id: data.id } });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base">{t("fullName", lang)}</Label>
          <Input
            id="name"
            required
            placeholder={t("fullNamePh", lang)}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age" className="text-base">{t("age", lang)}</Label>
          <Input
            id="age"
            type="number"
            min={0}
            max={120}
            required
            placeholder="0–120"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="h-11 text-base"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amka" className="text-base">{t("amka", lang)}</Label>
        <Input
          id="amka"
          required
          inputMode="numeric"
          pattern="\d{11}"
          maxLength={11}
          placeholder={t("amkaPh", lang)}
          value={amka}
          onChange={(e) => setAmka(e.target.value.replace(/\D/g, "").slice(0, 11))}
          className="h-11 text-base"
          aria-invalid={amka.length > 0 && amka.length !== 11}
        />
        {amka.length > 0 && amka.length !== 11 && (
          <p className="text-xs text-destructive">{t("errAmka", lang)}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-base">{t("symptoms", lang)}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {SYMPTOMS.map((s) => {
            const checked = symptoms.includes(s.id);
            const labelKey = SYMPTOM_LABEL_KEY[s.id];
            const label = labelKey ? t(labelKey, lang) : s.label;
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-base transition-colors ${
                  checked
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleSymptom(s.id)} />
                <span className="font-medium text-foreground">{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-base">
        <Checkbox checked={chronic} onCheckedChange={(v) => setChronic(Boolean(v))} />
        <span>{t("chronic", lang)}</span>
      </label>

      <div className="space-y-2">
        <Label htmlFor="desc" className="text-base">{t("description", lang)}</Label>
        <Textarea
          id="desc"
          rows={3}
          maxLength={500}
          placeholder={t("descriptionPh", lang)}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-base"
        />
      </div>

      <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("submit", lang)}
      </Button>

      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <span>{t("disclaimer", lang)}</span>
      </div>
    </form>
  );
}