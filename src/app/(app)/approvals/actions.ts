"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { decideApproval } from "@/server/approvals";
import { DomainError } from "@/server/errors";
import { getTenantContext } from "@/server/session";

export interface DecisionState {
  ok: boolean;
  message: string;
}

/**
 * Server actions are public HTTP endpoints: re-resolve the tenant context and
 * validate input on every call. Never trust ids coming from the form alone.
 */
export async function decideAction(
  _prev: DecisionState | null,
  formData: FormData,
): Promise<DecisionState> {
  const ctx = await getTenantContext();
  let status: "APPROVED" | "REJECTED";
  try {
    ({ status } = await decideApproval(ctx, {
      approvalId: formData.get("approvalId"),
      decision: formData.get("decision"),
      note: formData.get("note") ?? undefined,
    }));
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    console.error("decideAction failed", err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  // The decided card leaves the Pending list, so confirm via a banner on reload.
  // redirect() throws, so it must stay outside the try/catch above.
  redirect(`/approvals?decided=${status === "APPROVED" ? "approved" : "rejected"}`);
}
