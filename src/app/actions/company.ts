"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COMPANY_COOKIE, isMemberOf } from "@/server/session";

const input = z.object({ companyId: z.string().min(1).max(64) });

/** Switch the active company. Membership is verified server-side; the cookie is never trusted alone. */
export async function switchCompany(formData: FormData) {
  const parsed = input.safeParse({ companyId: formData.get("companyId") });
  if (!parsed.success || !(await isMemberOf(parsed.data.companyId))) {
    redirect("/dashboard");
  }
  (await cookies()).set(COMPANY_COOKIE, parsed.data.companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}
