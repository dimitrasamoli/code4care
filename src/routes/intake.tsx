import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { IntakeForm } from "@/components/IntakeForm";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/intake")({
  component: IntakePage,
});

function IntakePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Patient Intake
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Συμπληρώστε τα στοιχεία σας. Η περίπτωσή σας θα ιεραρχηθεί με βάση
            την ιατρική επείγουσα ανάγκη.
          </p>
        </div>
        <IntakeForm />
      </main>
    </div>
  );
}