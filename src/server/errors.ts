/** Domain errors. UI maps these to user-safe messages; never leak internals. */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INVALID" | "UNAUTHENTICATED",
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const notFound = (what = "Resource") => new DomainError(`${what} not found`, "NOT_FOUND");
export const forbidden = (why = "You do not have permission to do that") =>
  new DomainError(why, "FORBIDDEN");
export const conflict = (why: string) => new DomainError(why, "CONFLICT");
export const invalid = (why: string) => new DomainError(why, "INVALID");
export const unauthenticated = () => new DomainError("Not signed in", "UNAUTHENTICATED");
