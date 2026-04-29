import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, dashboardPathForRole, type AppRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, Loader2, Sparkles } from "lucide-react";
import { seedDemoAccounts } from "@/server/seed.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const DEMO = [
  { role: "Γραμματεία", email: "reception@demo.com" },
  { role: "Ιατρός", email: "doctor@demo.com" },
  { role: "Διαχειριστής", email: "admin@demo.com" },
] as const;

function LoginPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupRole, setSignupRole] = useState<AppRole>("reception");
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: dashboardPathForRole(role) });
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Καλώς ήρθατε");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role: signupRole },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ο λογαριασμός δημιουργήθηκε — μπορείτε να συνδεθείτε");
  };

  const seedAndFill = async (demoEmail: string) => {
    setSeeding(true);
    try {
      await seedDemoAccounts();
      setEmail(demoEmail);
      setPassword("demo1234");
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: "demo1234",
      });
      if (error) toast.error(error.message);
      else toast.success(`Σύνδεση ως ${demoEmail}`);
    } catch (e) {
      toast.error("Αποτυχία προετοιμασίας demo λογαριασμών");
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent via-background to-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-foreground">Code4Care</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Σύνδεση</TabsTrigger>
              <TabsTrigger value="signup">Δημιουργία λογαριασμού</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Κωδικός πρόσβασης</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Σύνδεση
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Ονοματεπώνυμο</Label>
                  <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Κωδικός πρόσβασης</Label>
                  <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Ρόλος</Label>
                  <Select value={signupRole} onValueChange={(v) => setSignupRole(v as AppRole)}>
                    <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reception">Γραμματεία</SelectItem>
                      <SelectItem value="doctor">Ιατρός / Ιατρικό προσωπικό</SelectItem>
                      <SelectItem value="admin">Διαχειριστής</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Δημιουργία λογαριασμού
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-card/60 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Γρήγορη demo σύνδεση
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Κάντε κλικ σε έναν ρόλο για άμεση σύνδεση με προετοιμασμένο
            λογαριασμό (κωδικός: <code className="rounded bg-muted px-1">demo1234</code>).
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO.map((d) => (
              <Button
                key={d.email}
                variant="outline"
                size="sm"
                disabled={seeding}
                onClick={() => seedAndFill(d.email)}
              >
                {seeding ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                {d.role}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}