"use server";

import { revalidatePath } from "next/cache";
import { DomainError } from "@/server/errors";
import { resolveDecision, transitionAction } from "@/server/jobs";
import { getTenantContext } from "@/server/session";

export interface FormState {
  ok: boolean;
  message: string;
}

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/jobs", "layout");
  revalidatePath("/decisions");
}

async function run(fn: () => Promise<unknown>, okMessage: string): Promise<FormState> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    console.error("job action failed", err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  refresh();
  return { ok: true, message: okMessage };
}

/** Public endpoint: tenant context and permissions are re-checked by the service. */
export async function transitionActionAction(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getTenantContext();
  return run(
    () => transitionAction(ctx, { actionId: formData.get("actionId"), to: formData.get("to") }),
    "Updated.",
  );
}

export async function resolveDecisionAction(
  _prev: FormState | null,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getTenantContext();
  const resolution = formData.get("resolution");
  return run(
    () =>
      resolveDecision(ctx, {
        decisionId: formData.get("decisionId"),
        outcome: formData.get("outcome"),
        resolution: typeof resolution === "string" && resolution !== "" ? resolution : undefined,
      }),
    "Done.",
  );
}
