import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth, dashboardPathForRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Activity, LogOut } from "lucide-react";

export function AppHeader() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Activity className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-foreground">Code4Care</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Ροή Ασθενών
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={dashboardPathForRole(role)}
                className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline"
              >
                Πίνακας
              </Link>
              <span className="hidden rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground sm:inline">
                {role ?? "user"}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Αποσύνδεση
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">Σύνδεση προσωπικού</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}