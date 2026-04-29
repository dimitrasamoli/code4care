import { supabase } from "@/integrations/supabase/client";
import { buildBlockHash } from "./hash";

export async function appendAuditBlock(opts: {
  caseId: string;
  actionType: string;
  previousStatus: string | null;
  newStatus: string | null;
  riskScore: number | null;
  actorId?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown>;
}) {
  // Get the most recent hash in the entire chain (chain head)
  const { data: last } = await supabase
    .from("audit_chain")
    .select("current_hash")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousHash = last?.current_hash ?? null;
  const timestamp = new Date().toISOString();

  const currentHash = await buildBlockHash({
    caseId: opts.caseId,
    actionType: opts.actionType,
    previousStatus: opts.previousStatus,
    newStatus: opts.newStatus,
    riskScore: opts.riskScore,
    timestamp,
    previousHash,
  });

  const { error } = await supabase.from("audit_chain").insert([{
    case_id: opts.caseId,
    action_type: opts.actionType,
    previous_status: opts.previousStatus,
    new_status: opts.newStatus,
    risk_score: opts.riskScore,
    actor_id: opts.actorId ?? null,
    actor_role: opts.actorRole ?? null,
    metadata: (opts.metadata ?? {}) as never,
    previous_hash: previousHash,
    current_hash: currentHash,
  }]);
  if (error) console.error("audit insert failed", error);
  return currentHash;
}