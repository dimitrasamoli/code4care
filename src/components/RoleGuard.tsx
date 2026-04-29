import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole, dashboardPathForRole } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export function RoleGuard({
  allow,
  children,
}: {
  allow: AppRole[];
  children: ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (role && !allow.includes(role)) {
      navigate({ to: dashboardPathForRole(role) });
    }
  }, [user, role, loading, allow, navigate]);

  if (loading || !user || (role && !allow.includes(role))) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}