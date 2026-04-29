import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEMO_USERS = [
  { email: "patient@demo.com", full_name: "Demo Patient", role: "patient" as const },
  { email: "reception@demo.com", full_name: "Demo Reception", role: "reception" as const },
  { email: "doctor@demo.com", full_name: "Dr. Demo", role: "doctor" as const },
  { email: "admin@demo.com", full_name: "Demo Admin", role: "admin" as const },
];

const DEMO_PASSWORD = "demo1234";

export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(
  async () => {
    const created: string[] = [];
    const skipped: string[] = [];

    for (const u of DEMO_USERS) {
      // Check if user already exists
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("email", u.email)
        .maybeSingle();

      if (existing) {
        skipped.push(u.email);
        // Ensure correct role assigned
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: existing.id, role: u.role }, { onConflict: "user_id,role" });
        continue;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, role: u.role },
      });

      if (error) {
        console.error("createUser error", u.email, error.message);
        continue;
      }
      if (data.user) {
        created.push(u.email);
        // Trigger should set role, but ensure it
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.user.id, role: u.role }, { onConflict: "user_id,role" });
      }
    }

    // Seed a few sample patient cases if none exist
    const { count } = await supabaseAdmin
      .from("patient_cases")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) === 0) {
      await supabaseAdmin.from("patient_cases").insert([
        {
          full_name: "Maria Rossi",
          age: 72,
          symptoms: ["chest_pain", "breathing"],
          description: "Sudden chest pain after walking up stairs",
          chronic_condition: true,
          risk_score: 95,
          risk_level: "high",
          status: "waiting",
          estimated_wait_minutes: 5,
        },
        {
          full_name: "James Carter",
          age: 34,
          symptoms: ["fever", "headache"],
          description: "High fever for 2 days",
          chronic_condition: false,
          risk_score: 35,
          risk_level: "medium",
          status: "waiting",
          estimated_wait_minutes: 25,
        },
        {
          full_name: "Sofia Bianchi",
          age: 28,
          symptoms: ["abdominal"],
          description: "Mild abdominal discomfort",
          chronic_condition: false,
          risk_score: 15,
          risk_level: "low",
          status: "waiting",
          estimated_wait_minutes: 50,
        },
        {
          full_name: "Liam O'Connor",
          age: 56,
          symptoms: ["dizziness", "headache"],
          description: "Recurring dizziness",
          chronic_condition: true,
          risk_score: 40,
          risk_level: "medium",
          status: "in_progress",
          estimated_wait_minutes: 0,
        },
      ]);
    }

    return { created, skipped, ok: true };
  },
);