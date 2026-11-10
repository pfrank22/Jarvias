"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createApprovalRequest } from "@/server/approvals";
import { DomainError } from "@/server/errors";
import { getTenantContext } from "@/server/session";

const REQUEST_FIELDS = [
  "projectId",
  "type",
  "title",
  "description",
  "amount",
  "priority",
  "dueDate",
] as const;
type RequestField = (typeof REQUEST_FIELDS)[number];

export interface RequestState {
  message: string;
  /** Echo of what the user typed, so React's post-action form reset doesn't wipe it. */
  values: Partial<Record<RequestField, string>>;
}

const field = (fd: FormData, name: string) => {
  const v = fd.get(name);
  return typeof v === "string" && v !== "" ? v : undefined;
};

/** Public endpoint: tenant context is re-resolved and all input re-validated by the service. */
export async function createRequestAction(
  _prev: RequestState | null,
  formData: FormData,
): Promise<RequestState> {
  const ctx = await getTenantContext();
  const values: RequestState["values"] = {};
  for (const name of REQUEST_FIELDS) {
    const v = field(formData, name);
    if (v !== undefined) values[name] = v.slice(0, 2000);
  }
  try {
    await createApprovalRequest(ctx, {
      projectId: field(formData, "projectId"),
      type: field(formData, "type"),
      title: field(formData, "title") ?? "",
      description: field(formData, "description"),
      amount: field(formData, "amount"),
      priority: field(formData, "priority"),
      dueDate: field(formData, "dueDate"),
    });
  } catch (err) {
    if (err instanceof DomainError) return { message: err.message, values };
    console.error("createRequestAction failed", err);
    return { message: "Something went wrong. Please try again.", values };
  }
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  redirect("/approvals?submitted=1");
}
