import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { IntakeForm } from "@/components/IntakeForm";
import { fetchOnCallHospital, getOnCallHospital } from "@/lib/risk";
import { Hospital, CalendarDays, ShieldCheck } from "lucide-react";
import { LangToggle } from "@/components/LangToggle";
import { useLang, T } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [lang] = useLang();
  const [hospital, setHospital] = useState<string>(getOnCallHospital());
  useEffect(() => {
    fetchOnCallHospital().then(setHospital).catch(() => {});
  }, []);
  const today = new Date().toLocaleDateString("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* On-call hospital banner */}
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-foreground/15">
              <Hospital className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Εφημερεύον Νοσοκομείο · Ηράκλειο Κρήτης
              </div>
              <div className="text-lg font-bold leading-tight sm:text-xl">
                {hospital}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-primary-foreground/15 px-3 py-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4" />
            <span className="capitalize">{today}</span>
          </div>
        </div>
      </section>

      {/* Intake form */}
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {T.patientForm[lang]}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {T.intakeSubtitle[lang]}
            </p>
          </div>
          <LangToggle className="mt-1" />
        </div>
        <IntakeForm />

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-primary/20 bg-accent/40 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            <strong>Code4Care υποστηρίζει — δεν αντικαθιστά — το ιατρικό προσωπικό.</strong>{" "}
            Η τελική ιατρική απόφαση παραμένει στους επαγγελματίες υγείας.
          </p>
        </div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Code4Care · Hackathon prototype — not for clinical use.
        </div>
      </footer>
    </div>
  );
}